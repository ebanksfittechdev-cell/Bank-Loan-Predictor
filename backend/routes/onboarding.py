import re
import secrets
from extensions import limiter
from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required, login_user, logout_user
from sqlalchemy.exc import IntegrityError
from werkzeug.security import check_password_hash, generate_password_hash

from extensions import db
from models import Bank

onboarding_bp = Blueprint("onboarding", __name__)

EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def slugify(value):
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")


def generate_slug(bank_name):
    """
    Build a slug that still reads as the bank's name (good for a
    shareable link) but isn't deterministic — two different signups
    for "Chase Bank" won't collide, and nobody can guess a bank's
    public apply link just from knowing the bank's name.
    """
    base_slug = slugify(bank_name) or "bank"
    random_suffix = secrets.token_hex(3)  # 6 hex chars, e.g. "a91f3c"
    return f"{base_slug}-{random_suffix}"


@onboarding_bp.route("/register", methods=["POST"])
@limiter.limit("30 per day")
def register():
    data = request.get_json(silent=True) or {}

    bank_name = (data.get("bankName") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not bank_name or not email or not password:
        return jsonify({"error": "bankName, email, and password are required."}), 400

    # TODO: mirror the frontend's email format + password strength
    # rules here (8+ chars, 2+ special characters).

    if Bank.query.filter_by(email=email).first() is not None:
        return jsonify({"error": "An account with this email already exists."}), 409

    # secrets.token_hex(3) gives ~16.7M possibilities per bank name, so a
    # collision is very unlikely — but "very unlikely" isn't "impossible",
    # so retry a couple of times on the rare case two signups land on the
    # exact same slug rather than trusting it can never happen.
    for _ in range(5):
        bank = Bank(
            name=bank_name,
            slug=generate_slug(bank_name),
            email=email,
            password_hash=generate_password_hash(password),
        )
        db.session.add(bank)
        try:
            db.session.commit()
            break
        except IntegrityError:
            db.session.rollback()
            if Bank.query.filter_by(email=email).first() is not None:
                return jsonify({"error": "An account with this email already exists."}), 409
            # otherwise it was a slug collision — loop and try again
    else:
        return jsonify({"error": "Could not create your account. Please try again."}), 500

    # Not logging them in here on purpose — the frontend sends them back
    # to the login page after a successful signup.
    return jsonify({"id": bank.id, "name": bank.name, "slug": bank.slug}), 201


@onboarding_bp.route("/login", methods=["POST"])
@limiter.limit("30 per day")
def login():
    data = request.get_json(silent=True) or {}

    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    bank = Bank.query.filter_by(email=email).first()
    if bank is None or not check_password_hash(bank.password_hash, password):
        return jsonify({"error": "Invalid email or password."}), 401

    # Deliberately the same generic error as wrong credentials, rather
    # than something like "this account has been deactivated" — that
    # distinction would let someone probe which emails belong to real
    # (deactivated) accounts.
    if not bank.is_active:
        return jsonify({"error": "Invalid email or password."}), 401

    # Flask-Login writes the user id into the session and manages the
    # session cookie for us — same cross-origin cookie config from
    # config.py (SameSite=None, Secure in prod) still applies.
    login_user(bank)

    return jsonify({"id": bank.id, "name": bank.name, "slug": bank.slug}), 200


@onboarding_bp.route("/logout", methods=["POST"])
@login_required
def logout():
    logout_user()
    return "", 204


@onboarding_bp.route("/me", methods=["GET"])
@login_required
def me():
    return jsonify(
        {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "slug": current_user.slug,
        }
    ), 200


@onboarding_bp.route("/settings", methods=["PATCH"])
@limiter.limit("30 per day")
@login_required
def update_settings():
    data = request.get_json(silent=True) or {}

    bank_name = (data.get("bankName") or "").strip()
    email = (data.get("email") or "").strip().lower()

    if not bank_name or not email:
        return jsonify({"error": "bankName and email are required."}), 400

    if not EMAIL_PATTERN.match(email):
        return jsonify({"error": "Enter a valid email address."}), 400

    existing = Bank.query.filter(
        Bank.email == email, Bank.id != current_user.id
    ).first()
    if existing is not None:
        return jsonify({"error": "An account with this email already exists."}), 409

    # Deliberately NOT touching slug here. The slug is the bank's public
    # apply link, already shared with applicants — regenerating it when
    # the bank renames itself would silently break every link they've
    # already handed out.
    current_user.name = bank_name
    current_user.email = email
    db.session.commit()

    return jsonify(
        {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "slug": current_user.slug,
        }
    ), 200


@onboarding_bp.route("/deactivate", methods=["POST"])
@limiter.limit("30 per day")
@login_required
def deactivate_account():
    current_user.is_active = False
    db.session.commit()

    # Kill the current session immediately too — otherwise this browser
    # could keep browsing as if still logged in until the cookie
    # naturally expires, even though future login attempts would fail.
    logout_user()

    return "", 204