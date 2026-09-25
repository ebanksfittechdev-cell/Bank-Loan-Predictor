from datetime import datetime

from flask_login import UserMixin

from extensions import db


class Bank(UserMixin, db.Model):
    __tablename__ = "banks"
 
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    slug = db.Column(db.String(100), unique=True, nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
 
    
    is_active = db.Column(db.Boolean, nullable=False, default=True, server_default="true")
 
    applications = db.relationship("Application", backref="bank", lazy=True)
    audit_logs = db.relationship("AuditLog", backref="bank", lazy=True)


class Application(db.Model):
    __tablename__ = "applications"

    id = db.Column(db.Integer, primary_key=True)
    bank_id = db.Column(db.Integer, db.ForeignKey("banks.id"), nullable=False)

    applicant_name = db.Column(db.String(255), nullable=False)
    applicant_email = db.Column(db.String(255), nullable=False)

    # --- Model input features (24) ---
    # Column order here doesn't matter for SQLAlchemy, but whatever code
    # builds the feature vector for predict_proba() MUST assemble it in
    # the exact order the model was trained on — get that order from
    # however random_forest_model.pkl's training script defined X.
    age = db.Column(db.Integer, nullable=False)
    income = db.Column(db.Float, nullable=False)
    loan_amount = db.Column(db.Float, nullable=False)
    credit_score = db.Column(db.Integer, nullable=False)
    months_employed = db.Column(db.Integer, nullable=False)
    num_credit_lines = db.Column(db.Integer, nullable=False)
    interest_rate = db.Column(db.Float, nullable=False)
    loan_term = db.Column(db.Integer, nullable=False)
    dti_ratio = db.Column(db.Float, nullable=False)
    has_mortgage = db.Column(db.Boolean, nullable=False, default=False)
    has_dependents = db.Column(db.Boolean, nullable=False, default=False)
    has_co_signer = db.Column(db.Boolean, nullable=False, default=False)

    # One-hot groups — each group has one category dropped as the
    # implicit baseline (all-False in the group means "the dropped one").
    # Education: baseline is Bachelor's
    education_high_school = db.Column(db.Boolean, nullable=False, default=False)
    education_masters = db.Column(db.Boolean, nullable=False, default=False)
    education_phd = db.Column(db.Boolean, nullable=False, default=False)

    # EmploymentType: baseline is Full-time
    employment_type_part_time = db.Column(db.Boolean, nullable=False, default=False)
    employment_type_self_employed = db.Column(db.Boolean, nullable=False, default=False)
    employment_type_unemployed = db.Column(db.Boolean, nullable=False, default=False)

    # MaritalStatus: baseline is Divorced
    marital_status_married = db.Column(db.Boolean, nullable=False, default=False)
    marital_status_single = db.Column(db.Boolean, nullable=False, default=False)

    # LoanPurpose: baseline is Auto
    loan_purpose_business = db.Column(db.Boolean, nullable=False, default=False)
    loan_purpose_education = db.Column(db.Boolean, nullable=False, default=False)
    loan_purpose_home = db.Column(db.Boolean, nullable=False, default=False)
    loan_purpose_other = db.Column(db.Boolean, nullable=False, default=False)

    default_risk_score = db.Column(db.Float, nullable=True)
    status = db.Column(
        db.Enum("PENDING", "APPROVED", "DENIED", name="application_status"),
        default="PENDING",
        nullable=False,
    )
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    shap_values = db.Column(db.JSON, nullable=False)

    audit_logs = db.relationship("AuditLog", backref="application", lazy=True)


class AuditLog(db.Model):
    __tablename__ = "audit_logs"

    id = db.Column(db.Integer, primary_key=True)
    application_id = db.Column(db.Integer, db.ForeignKey("applications.id"), nullable=False)
    bank_id = db.Column(db.Integer, db.ForeignKey("banks.id"), nullable=False)
    action = db.Column(db.String(100), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)