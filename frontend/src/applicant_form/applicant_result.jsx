import { Link, useLocation, useParams } from 'react-router-dom'
import './applicant_form.css'

function riskLabel(score) {
  // riskScore is the model's probability of DEFAULT, not approval —
  // a high score is bad news for the applicant, not good news.
  if (score >= 0.66) return 'High'
  if (score >= 0.33) return 'Moderate'
  return 'Low'
}

function ApplicantResult() {
  const { bankSlug } = useParams()
  const location = useLocation()
  const result = location.state

  // This page only has data if it was reached via the redirect from
  // ApplicantForm's successful submit — result comes from navigate()'s
  // state, not a URL param or a fetch. Refreshing this page, or sharing
  // its link, loses that data entirely. Fine for now; making this
  // durable/shareable later would mean fetching by application id
  // instead, which needs its own backend route.
  if (!result) {
    return (
      <div className="applicant-page">
        <div className="applicant-card result-card">
          <h1 className="applicant-title">No submission found</h1>
          <p className="applicant-subtitle">
            We couldn't find a result to show here. If you just submitted an
            application, try going back and submitting again.
          </p>
          <Link to={`/apply/${bankSlug}`}>Back to the application</Link>
        </div>
      </div>
    )
  }

  const label = riskLabel(result.riskScore)

  return (
    <div className="applicant-page">
      <div className="applicant-card result-card">
        <span className={`risk-badge risk-${label.toLowerCase()}`}>
          {label} risk of default
        </span>

        <h1 className="applicant-title">Thanks, {result.applicantName}.</h1>
        <p className="result-id">Confirmation ID: {result.id}</p>
        <p className="applicant-subtitle">
          Your application has been routed to {result.bankName} for final
          review. They'll follow up with you directly by email.
        </p>
      </div>
    </div>
  )
}

export default ApplicantResult