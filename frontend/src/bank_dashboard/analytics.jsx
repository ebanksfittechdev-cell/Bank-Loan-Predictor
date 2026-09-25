import { useEffect, useRef, useState } from 'react'
import Navbar from './Navbar.jsx'
import './Analytics.css'

const API_URL = import.meta.env.VITE_API_URL
const APPLICATIONS_ENDPOINT = `${API_URL}/api/banker/applications`
const ANALYTICS_ENDPOINT = `${API_URL}/api/banker/analytics`

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

const SORT_OPTIONS = [
  { key: 'name', label: 'Name', ascLabel: 'Name: A → Z', descLabel: 'Name: Z → A' },
  {
    key: 'loanAmount',
    label: 'Loan amount',
    ascLabel: 'Loan amount: Low → High',
    descLabel: 'Loan amount: High → Low',
  },
  {
    key: 'riskScore',
    label: 'Risk score',
    ascLabel: 'Risk score: Low → High',
    descLabel: 'Risk score: High → Low',
  },
]

function Analytics() {
  const [applications, setApplications] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('none')
  const [sortDirection, setSortDirection] = useState('asc')

  // Click a toggle: off -> ascending -> descending -> off again.
  // Clicking a different field's toggle switches to that field — only
  // one sort can be active at a time, matching what the backend accepts.
  const handleSortToggle = (key) => {
    if (sortBy !== key) {
      setSortBy(key)
      setSortDirection('asc')
    } else if (sortDirection === 'asc') {
      setSortDirection('desc')
    } else {
      setSortBy('none')
      setSortDirection('asc')
    }
  }

  // Skips the filter effect on first render, since the mount effect
  // below already handles the initial load via a different endpoint.
  const isFirstRender = useRef(true)

  // Initial load — the existing, unfiltered applications endpoint.
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

  // Every filter/sort change after that — the analytics endpoint.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    let cancelled = false

    const params = new URLSearchParams()
    if (search.trim()) params.set('search', search.trim())
    if (sortBy !== 'none') {
      params.set('sortBy', sortBy)
      params.set('sortDirection', sortDirection)
    }

    fetch(`${ANALYTICS_ENDPOINT}?${params.toString()}`, { credentials: 'include' })
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

    return () => {
      cancelled = true
    }
  }, [search, sortBy, sortDirection])

  return (
    <div className="dashboard-layout">
      <Navbar />

      <main className="dashboard-content">
        <h1 className="dashboard-title">Analytics</h1>
        <p className="dashboard-subtitle">
          Search and sort across every application on file.
        </p>

        <div className="filter-bar">
          <input
            type="text"
            className="search-input"
            placeholder="Search by name…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <div className="sort-toggles">
            {SORT_OPTIONS.map((option) => {
              const isActive = sortBy === option.key
              const label = isActive
                ? sortDirection === 'asc'
                  ? option.ascLabel
                  : option.descLabel
                : option.label

              return (
                <button
                  key={option.key}
                  type="button"
                  className={`sort-toggle${isActive ? ' active' : ''}`}
                  onClick={() => handleSortToggle(option.key)}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {isLoading && <p>Loading…</p>}
        {loadError && <p className="dashboard-error">{loadError}</p>}

        {!isLoading && !loadError && (
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Email</th>
                <th>Loan amount</th>
                <th>Risk score</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((application) => (
                <tr key={application.id}>
                  <td>{application.applicantName}</td>
                  <td>{application.applicantEmail}</td>
                  <td>{formatCurrency(application.loanAmount)}</td>
                  <td>{formatRiskScore(application.riskScore)}</td>
                  <td>{application.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </div>
  )
}

export default Analytics