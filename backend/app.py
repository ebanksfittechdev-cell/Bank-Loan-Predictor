from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS
from flask_login import LoginManager
from flask_migrate import Migrate
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import os



load_dotenv()

from config import Config
from extensions import db
from models import Bank
from routes.dashboard import dashboard_bp
from routes.onboarding import onboarding_bp
from routes.applicant import applicant_bp

login_manager = LoginManager()
migrate = Migrate()
# app.py — instantiate alongside your other extensions
limiter = Limiter(
    key_func=get_remote_address,   # limits are tracked per IP address
    default_limits=[],             # no global default — only limit what you decorate below
)

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    migrate.init_app(app, db)
    limiter.init_app(app)
    login_manager.init_app(app)

    CORS(
        app,
        supports_credentials=True,
        origins=[app.config["FRONTEND_ORIGIN"]],
    )

    app.register_blueprint(onboarding_bp, url_prefix="/api/auth")
    app.register_blueprint(dashboard_bp, url_prefix="/api/banker")
    app.register_blueprint(applicant_bp, url_prefix="/api/apply")

    return app


@login_manager.user_loader
def load_user(bank_id):
    return Bank.query.get(int(bank_id))


@login_manager.unauthorized_handler
def unauthorized():
    # This is a JSON API, not a server-rendered app — return 401 instead
    # of Flask-Login's default redirect-to-login-page behavior.
    return jsonify({"error": "Authentication required."}), 401


app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    is_production = os.environ.get("FLASK_ENV") == "production"
    app.run(host="0.0.0.0", port=port, debug=not is_production)