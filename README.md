# Ledgerline

A multi-tenant bank loan approval platform. Banks onboard, get a unique public application link, and applicants submit loan requests that are scored in real time by a machine learning model. Bankers review, approve, or deny applications from a dashboard, with every decision recorded in a permanent audit log.

**Live demo:** https://bank-loan-predictor-ml.vercel.app

Demo account:
- Email: `demo_bank@demo_email.org`
- Password: `1234*)!@#$%`

---

## How it works

1. A bank signs up and receives a unique, non-guessable application link (`/apply/:bank_slug`).
2. The bank shares that link with prospective borrowers. No login required to apply.
3. An applicant fills out a single form covering 24 financial and demographic fields.
4. On submission, a trained Random Forest model computes a default-risk probability, and SHAP generates a feature-by-feature explanation of that score.
5. The applicant immediately sees their risk tier (Low / Moderate / High).
6. The bank's dashboard shows all submissions for their institution only. Bankers can drill into any application to see the raw inputs and the SHAP explanation behind the score, then approve or deny.
7. Every submission and every approve/deny decision is written to an audit log, scoped per bank.

## Architecture

**Frontend** — React + Vite, deployed on Vercel. Session-based auth via cookies (not JWT). Client-side routing with React Router; protected banker routes check auth status before rendering.

**Backend** — Flask, deployed on Railway. Flask-Login for session auth, Flask-SQLAlchemy + Flask-Migrate for the database layer, Flask-Limiter for rate limiting, Flask-CORS for the cross-origin frontend/backend split.

**Database** — Postgres (Neon).

**ML** — A pre-trained `RandomForestClassifier` (scikit-learn), loaded via `joblib`. SHAP's `TreeExplainer` computes per-feature contributions for every prediction at request time.

```
Frontend (Vercel)  ──HTTPS, credentials: include──▶  Backend (Railway)
                                                            │
                                                            ├─▶ Postgres (Neon)
                                                            └─▶ random_forest_model.pkl + SHAP
```

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React, Vite, React Router |
| Backend | Flask, Flask-Login, Flask-SQLAlchemy, Flask-Migrate, Flask-Limiter, Flask-CORS |
| Database | PostgreSQL (Neon) |
| ML | scikit-learn (Random Forest), SHAP |
| Hosting | Vercel (frontend), Railway (backend) |
| Auth | Session cookies, Werkzeug password hashing |

## Project structure

```
backend/
  app.py                  # Flask application factory
  config.py                # Env-driven config, session cookie rules
  extensions.py            # db, limiter singletons (avoids circular imports)
  models.py                # Bank, Application, AuditLog
  ml/
    inference.py            # Model loading, prediction, SHAP explanation
  routes/
    onboarding.py            # Register, login, logout, settings, deactivate
    dashboard.py              # Banker-facing: applications, audit log, analytics
    applicant.py               # Public: get bank by slug, submit application
  random_forest_model.pkl
  requirements.txt

frontend/
  src/
    onboarding/              # Login, signup
    bank_dashboard/          # Pending loans, audit log, analytics, settings, navbar
    applicant_form/          # Public application form + result page
    App.jsx
    ProtectedRoute.jsx
  vercel.json               # SPA rewrite rule for client-side routing
```

## Running locally

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

Create a `.env` file in `backend/`:
```
SECRET_KEY=any-random-string-for-local-dev
DATABASE_URL=postgresql://localhost/loan_predictor
FRONTEND_ORIGIN=http://localhost:5173
```

Run migrations, then start the server:
```bash
flask db upgrade
python app.py
```

### Frontend

```bash
cd frontend
npm install
```

Create a `.env` file in `frontend/`:
```
VITE_API_URL=http://localhost:5000
```

```bash
npm run dev
```

## Environment variables (production)

**Backend (Railway)**

| Variable | Purpose |
|---|---|
| `SECRET_KEY` | Signs session cookies. Must be a real random value — never the local dev default. |
| `DATABASE_URL` | Neon Postgres connection string (pooled). |
| `FRONTEND_ORIGIN` | Exact deployed frontend URL, for CORS. |
| `FLASK_ENV` | Set to `production`. Switches cookie `SameSite`/`Secure` settings and disables debug mode. |

**Frontend (Vercel)**

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Full backend URL, including `https://`. |

## Security notes

- **No JWTs.** Auth is session-cookie based via Flask-Login, `SameSite=None; Secure` in production, `SameSite=Lax` locally.
- **No client-trusted IDs.** Every route re-derives `bank_id` server-side — either from `current_user.id` (authenticated routes) or from a slug lookup (public routes). The client never supplies a bank ID directly.
- **Non-guessable public links.** Application slugs include a random suffix (`secrets.token_hex(3)`), not just a slugified bank name.
- **Soft delete only.** Deactivating a bank account sets `is_active = False` rather than deleting the row, since applications and audit logs reference it by foreign key.
- **Rate limited.** Login, registration, and application submission are capped per-IP via Flask-Limiter.

## Known limitations

- Backend request validation on `/register` mirrors the frontend's rules but isn't a complete standalone guarantee — direct API calls bypass client-side checks.
- `ml/inference.py`'s feature ordering is inferred from the original training data's column order and has not been verified against the actual training script.
- No pagination on application or analytics endpoints.
- Applicant result page relies on React Router navigation state; a fresh visit to a shared result link won't show data (by design — no application ID is exposed in the URL).
- Flask-Limiter uses in-memory storage; rate limits reset on deploy and don't share state across multiple worker processes.

## License

Personal / educational project.
