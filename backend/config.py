import os


def _normalize_db_url(url):
    # Some hosts (Heroku-style, some Postgres add-ons) hand out
    # "postgres://" — SQLAlchemy 1.4+ wants "postgresql://".
    if url and url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql://", 1)
    return url


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-change-me")

    SQLALCHEMY_DATABASE_URI = _normalize_db_url(
        os.environ.get("DATABASE_URL", "postgresql://localhost/loan_predictor")
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Frontend origin allowed to call this API with credentials.
    FRONTEND_ORIGIN = os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173")

    # Session cookie config for separate-origin (cross-site) auth.
    # SameSite=None + Secure is required for the cookie to be sent
    # cross-origin at all — Secure means this only works over HTTPS,
    # so it's off by default locally unless FLASK_ENV=production.
    SESSION_COOKIE_HTTPONLY = True
    # SameSite=None requires Secure, which requires HTTPS — fine in
    # production (real cross-site domains), but locally over HTTP that
    # combination gets the cookie silently rejected by the browser
    # entirely. localhost:5173 and localhost:5000 are different origins
    # but the same *site* (site = scheme + registrable domain, port
    # doesn't count), so SameSite=Lax still works fine between them —
    # use that locally instead.
    _is_production = os.environ.get("FLASK_ENV") == "production"
    SESSION_COOKIE_SAMESITE = "None" if _is_production else "Lax"
    SESSION_COOKIE_SECURE = _is_production