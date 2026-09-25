import { useEffect, useState } from 'react'
import Navbar from './Navbar.jsx'
import './Audit_Log.css'

const AUDIT_ENDPOINT = `${import.meta.env.VITE_API_URL}/api/banker/audit`

function formatTimestamp(isoString) {
  return new Date(isoString).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function AuditLog() {
  const [logs, setLogs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let cancelled = false

    fetch(AUDIT_ENDPOINT, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('Could not load the audit log.')
        return res.json()
      })
      .then((data) => {
        if (!cancelled) setLogs(data)
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

  return (
    <div className="dashboard-layout">
      <Navbar />

      <main className="dashboard-content">
        <h1 className="dashboard-title">Audit log</h1>
        <p className="dashboard-subtitle">
          Every submission and decision, most recent first.
        </p>

        {isLoading && <p>Loading…</p>}
        {loadError && <p className="dashboard-error">{loadError}</p>}

        {!isLoading && !loadError && (
          <table className="audit-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Applicant</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{formatTimestamp(log.timestamp)}</td>
                  <td>{log.applicantName || `Application #${log.applicationId}`}</td>
                  <td>{log.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </div>
  )
}

export default AuditLog