import { useEffect, useState } from 'react'
import Navbar from './navbar.jsx'
import './pending_loans.css'

const APPLICATIONS_ENDPOINT = `${import.meta.env.VITE_API_URL}/api/banker/applications`
const ME_ENDPOINT = `${import.meta.env.VITE_API_URL}/api/auth/me`

const STATUS_LABEL = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  DENIED: 'Rejected',
}

function formatCurrency(amount) {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })
}

function formatRiskScore(score) {
  return `${Math.round(score * 100)}%`
}

function PendingLoans() {
  const [applications, setApplications] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [selectedApplication, setSelectedApplication] = useState(null)

  const [bank, setBank] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false

    fetch(APPLICATIONS_ENDPOINT, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('Could not load applications.')
        return res.json()
      })
      .then((data) => {
        if (!cancelled) setApplications(data)
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    // Separate from the applications fetch above — this just needs the
    // logged-in bank's own slug to build the shareable apply link.
    let cancelled = false

    fetch(ME_ENDPOINT, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setBank(data)
      })
      .catch(() => {
        if (!cancelled) setBank(null)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const updateStatus = async (id, status) => {
    try {
      const res = await fetch(`${APPLICATIONS_ENDPOINT}/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      })

      if (!res.ok) throw new Error('Could not update status.')

      const updatedApplication = await res.json()

      setApplications((previous) =>
        previous.map((application) =>
          application.id === updatedApplication.id ? updatedApplication : application
        )
      )

      setSelectedApplication((previous) =>
        previous && previous.id === updatedApplication.id ? updatedApplication : previous
      )
    } catch (err) {
      // TODO: surface this to the user properly (toast/inline banner)
      // rather than just logging it.
      console.error(err)
    }
  }

  const applyLink = bank ? `${window.location.origin}/apply/${bank.slug}` : ''

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(applyLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Could not copy link:', err)
    }
  }

  return (
    <div className="dashboard-layout">
      <Navbar />

      <main className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Loan submissions</h1>
            <p className="dashboard-subtitle">
              Review pending applications and their model-generated risk scores.
            </p>
          </div>

          {bank && (
            <div className="apply-link">
              <span className="apply-link-label">Your application link</span>
              <div className="apply-link-row">
                <code className="apply-link-url">{applyLink}</code>
                <button type="button" className="copy-button" onClick={handleCopyLink}>
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          )}
        </div>

        {isLoading && <p>Loading applications…</p>}
        {loadError && <p className="dashboard-error">{loadError}</p>}

        {!isLoading && !loadError && (
          <table className="loans-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Email</th>
                <th>Loan amount</th>
                <th>Risk score</th>
                <th>Status</th>
                <th aria-hidden="true"></th>
              </tr>
            </thead>
            <tbody>
              {applications.map((application) => (
                <tr key={application.id}>
                  <td>{application.applicantName}</td>
                  <td>{application.applicantEmail}</td>
                  <td>{formatCurrency(application.loanAmount)}</td>
                  <td>{formatRiskScore(application.riskScore)}</td>
                  <td>
                    <span
                      className={`status-badge status-${application.status.toLowerCase()}`}
                    >
                      {STATUS_LABEL[application.status]}
                    </span>

                    {application.status === 'PENDING' && (
                      <span className="status-actions">
                        <button
                          type="button"
                          className="status-action approve"
                          onClick={() => updateStatus(application.id, 'APPROVED')}
                          aria-label={`Approve ${application.applicantName}`}
                        >
                          ✓
                        </button>
                        <button
                          type="button"
                          className="status-action deny"
                          onClick={() => updateStatus(application.id, 'DENIED')}
                          aria-label={`Deny ${application.applicantName}`}
                        >
                          ✕
                        </button>
                      </span>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="more-info-button"
                      onClick={() => setSelectedApplication(application)}
                    >
                      More info
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>

      {selectedApplication && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedApplication(null)}
        >
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedApplication.applicantName}</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setSelectedApplication(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <section className="modal-section">
              <h3>Applicant features</h3>
              <p className="modal-hint">All 24 values submitted by the applicant.</p>
              <dl className="feature-list">
                {Object.entries(selectedApplication.features).map(
                  ([key, value]) => (
                    <div className="feature-row" key={key}>
                      <dt>{key}</dt>
                      <dd>{String(value)}</dd>
                    </div>
                  )
                )}
              </dl>
            </section>

            <section className="modal-section">
              <h3>Why the model scored this application</h3>
              <p className="modal-hint">
                Feature contributions to the risk score, via SHAP.
              </p>
              <ul className="shap-list">
                {selectedApplication.shapValues.map((item) => (
                  <li className="shap-row" key={item.feature}>
                    <span className="shap-feature">{item.feature}</span>
                    <span className={`shap-impact shap-${item.direction}`}>
                      {item.direction === 'increases' ? '+' : '−'}
                      {Math.abs(item.impact).toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      )}
    </div>
  )
}

export default PendingLoans