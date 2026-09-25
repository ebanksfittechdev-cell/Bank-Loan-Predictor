from flask import Blueprint, jsonify, request
from extensions import limiter
from extensions import db
from ml.inference import FEATURE_ORDER, predict_and_explain
from models import Application, Bank, AuditLog

applicant_bp = Blueprint("applicant", __name__)


@applicant_bp.route("/<bank_slug>", methods=["GET"])
def get_bank_by_slug(bank_slug):
    bank = Bank.query.filter_by(slug=bank_slug).first()

    if bank is None:
        return jsonify({"error": "We couldn't find that application link."}), 404

    # Deliberately minimal — this is the one fully public,
    # unauthenticated endpoint in the whole API. Never return anything
    # beyond what a stranger with just the link should be able to see.
    return jsonify({"name": bank.name, "slug": bank.slug}), 200


@applicant_bp.route("/submit/<bank_slug>", methods=["POST"])
@limiter.limit("50 per day")
def submit_application(bank_slug):
    bank = Bank.query.filter_by(slug=bank_slug).first()
    if bank is None:
        return jsonify({"error": "We couldn't find that application link."}), 404

    data = request.get_json(silent=True) or {}

    required_fields = ["applicantName", "applicantEmail"] + FEATURE_ORDER
    missing = [
        field for field in required_fields
        if field not in data or data[field] in (None, "")
    ]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    try:
        risk_score, shap_values = predict_and_explain(data)
    except (TypeError, ValueError) as err:
        return jsonify({"error": f"Invalid input: {err}"}), 400

    application = Application(
        bank_id=bank.id,
        applicant_name=data["applicantName"],
        applicant_email=data["applicantEmail"],
        age=data["age"],
        income=data["income"],
        loan_amount=data["loanAmount"],
        credit_score=data["creditScore"],
        months_employed=data["monthsEmployed"],
        num_credit_lines=data["numCreditLines"],
        interest_rate=data["interestRate"],
        loan_term=data["loanTerm"],
        dti_ratio=data["dtiRatio"],
        has_mortgage=data["hasMortgage"],
        has_dependents=data["hasDependents"],
        has_co_signer=data["hasCoSigner"],
        education_high_school=data["educationHighSchool"],
        education_masters=data["educationMasters"],
        education_phd=data["educationPhd"],
        employment_type_part_time=data["employmentTypePartTime"],
        employment_type_self_employed=data["employmentTypeSelfEmployed"],
        employment_type_unemployed=data["employmentTypeUnemployed"],
        marital_status_married=data["maritalStatusMarried"],
        marital_status_single=data["maritalStatusSingle"],
        loan_purpose_business=data["loanPurposeBusiness"],
        loan_purpose_education=data["loanPurposeEducation"],
        loan_purpose_home=data["loanPurposeHome"],
        loan_purpose_other=data["loanPurposeOther"],
        default_risk_score=risk_score,
        shap_values=shap_values,
        status="PENDING",
    )
    db.session.add(application)
    db.session.flush()  # assigns application.id without committing yet

    audit_log = AuditLog(
        application_id=application.id,
        bank_id=bank.id,
        action="SUBMITTED",
    )
    db.session.add(audit_log)
    db.session.commit()

    # riskScore is a decimal 0-1 probability of default — same
    # convention used everywhere else in this app (dashboard included).
    # The frontend, not this endpoint, decides what counts as
    # low/moderate/high.
    return jsonify(
        {
            "id": application.id,
            "riskScore": risk_score,
            "applicantName": application.applicant_name,
            "bankName": bank.name,
        }
    ), 201