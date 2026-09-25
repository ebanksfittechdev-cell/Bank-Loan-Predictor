from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from extensions import db
from models import Application, AuditLog

dashboard_bp = Blueprint("dashboard", __name__)

FEATURE_LABELS = {
    "age": "Age",
    "income": "Income",
    "loanAmount": "Loan amount",
    "creditScore": "Credit score",
    "monthsEmployed": "Months employed",
    "numCreditLines": "Number of credit lines",
    "interestRate": "Interest rate",
    "loanTerm": "Loan term",
    "dtiRatio": "DTI ratio",
    "hasMortgage": "Has mortgage",
    "hasDependents": "Has dependents",
    "hasCoSigner": "Has co-signer",
    "educationHighSchool": "Education: High school",
    "educationMasters": "Education: Master's",
    "educationPhd": "Education: PhD",
    "employmentTypePartTime": "Employment: Part-time",
    "employmentTypeSelfEmployed": "Employment: Self-employed",
    "employmentTypeUnemployed": "Employment: Unemployed",
    "maritalStatusMarried": "Marital status: Married",
    "maritalStatusSingle": "Marital status: Single",
    "loanPurposeBusiness": "Loan purpose: Business",
    "loanPurposeEducation": "Loan purpose: Education",
    "loanPurposeHome": "Loan purpose: Home",
    "loanPurposeOther": "Loan purpose: Other",
}


def build_shap_list(shap_values, limit=8):
    """
    application.shap_values is stored as {featureKey: contribution}.
    This turns it into the sorted, labeled list PendingLoans.jsx
    already knows how to render, keeping only the most impactful
    features rather than dumping all 24 SHAP bars into the modal.
    """
    if not shap_values:
        return []

    ranked = sorted(shap_values.items(), key=lambda item: abs(item[1]), reverse=True)

    return [
        {
            "feature": FEATURE_LABELS.get(key, key),
            "impact": round(value, 4),
            "direction": "increases" if value >= 0 else "decreases",
        }
        for key, value in ranked[:limit]
    ]


def serialize_application(application):
    return {
        "id": application.id,
        "applicantName": application.applicant_name,
        "applicantEmail": application.applicant_email,
        "loanAmount": application.loan_amount,
        "riskScore": application.default_risk_score,
        "status": application.status,
        "features": {
            "age": application.age,
            "income": application.income,
            "loanAmount": application.loan_amount,
            "creditScore": application.credit_score,
            "monthsEmployed": application.months_employed,
            "numCreditLines": application.num_credit_lines,
            "interestRate": application.interest_rate,
            "loanTerm": application.loan_term,
            "dtiRatio": application.dti_ratio,
            "hasMortgage": application.has_mortgage,
            "hasDependents": application.has_dependents,
            "hasCoSigner": application.has_co_signer,
            "educationHighSchool": application.education_high_school,
            "educationMasters": application.education_masters,
            "educationPhd": application.education_phd,
            "employmentTypePartTime": application.employment_type_part_time,
            "employmentTypeSelfEmployed": application.employment_type_self_employed,
            "employmentTypeUnemployed": application.employment_type_unemployed,
            "maritalStatusMarried": application.marital_status_married,
            "maritalStatusSingle": application.marital_status_single,
            "loanPurposeBusiness": application.loan_purpose_business,
            "loanPurposeEducation": application.loan_purpose_education,
            "loanPurposeHome": application.loan_purpose_home,
            "loanPurposeOther": application.loan_purpose_other,
        },
        # Real values now — sorted by impact, top 8 shown so the modal
        # isn't a wall of 24 bars.
        "shapValues": build_shap_list(application.shap_values),
    }


def serialize_audit_log(log):
    return {
        "id": log.id,
        "applicationId": log.application_id,
        # .application comes from the backref defined on Application's
        # audit_logs relationship — no extra query needed for this.
        "applicantName": log.application.applicant_name if log.application else None,
        "action": log.action,
        "timestamp": log.timestamp.isoformat(),
    }

@dashboard_bp.route("/ping", methods=["GET"])
def ping():
    return jsonify({"status": "ok"}), 200


@dashboard_bp.route("/applications", methods=["GET"])
@login_required
def list_applications():
    applications = (
        Application.query.filter_by(bank_id=current_user.id)
        .order_by(Application.submitted_at.desc())
        .all()
    )
    return jsonify([serialize_application(a) for a in applications]), 200


@dashboard_bp.route("/applications/<int:application_id>/status", methods=["PATCH"])
@login_required
def update_application_status(application_id):
    data = request.get_json(silent=True) or {}
    new_status = data.get("status")

    if new_status not in ("APPROVED", "DENIED", "PENDING"):
        return jsonify({"error": "status must be APPROVED, DENIED, or PENDING."}), 400

    # Scoped to current_user.id (the logged-in bank) so one bank can't
    # update another bank's application by guessing an id.
    application = Application.query.filter_by(
        id=application_id, bank_id=current_user.id
    ).first()
    if application is None:
        return jsonify({"error": "Application not found."}), 404

    application.status = new_status

    audit_log = AuditLog(
        application_id=application.id,
        bank_id=current_user.id,
        action=new_status,
    )
    db.session.add(audit_log)
    db.session.commit()

    return jsonify(serialize_application(application)), 200


@dashboard_bp.route("/audit", methods=["GET"])
@login_required
def list_audit_logs():
    logs = (
        AuditLog.query.filter_by(bank_id=current_user.id)
        .order_by(AuditLog.timestamp.desc())
        .all()
    )
    return jsonify([serialize_audit_log(log) for log in logs]), 200






@dashboard_bp.route("/analytics", methods=["GET"])
@login_required
def list_analytics_applications():
    query = Application.query.filter_by(bank_id=current_user.id)
 
    search = request.args.get("search", "").strip()
    if search:
        query = query.filter(Application.applicant_name.ilike(f"%{search}%"))
 
    # sortBy is optional — absent (or "none") means no sort applied here,
    # same as the plain /applications endpoint's default ordering.
    sort_columns = {
        "name": Application.applicant_name,
        "loanAmount": Application.loan_amount,
        "riskScore": Application.default_risk_score,
    }
    sort_by = request.args.get("sortBy")
    sort_column = sort_columns.get(sort_by)
 
    if sort_column is not None:
        descending = request.args.get("sortDirection") == "desc"
        query = query.order_by(sort_column.desc() if descending else sort_column.asc())
    else:
        query = query.order_by(Application.submitted_at.desc())
 
    applications = query.all()
    return jsonify([serialize_application(a) for a in applications]), 200