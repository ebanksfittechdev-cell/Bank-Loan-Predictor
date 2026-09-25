import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from './Navbar.jsx'
import './Settings.css'

const API_URL = import.meta.env.VITE_API_URL
const ME_ENDPOINT = `${API_URL}/api/auth/me`
const SETTINGS_ENDPOINT = `${API_URL}/api/auth/settings`
const DEACTIVATE_ENDPOINT = `${API_URL}/api/auth/deactivate`

function Settings() {
  const navigate = useNavigate()

  const [bankName, setBankName] = useState('')
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  const [isDeactivating, setIsDeactivating] = useState(false)

  useEffect(() => {
    let cancelled = false

    fetch(ME_ENDPOINT, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then((data) => {
        if (!cancelled) {
          setBankName(data.name)
          setEmail(data.email)
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const handleSave = async (event) => {
    event.preventDefault()
    setSaveError('')
    setSaveSuccess(false)
    setIsSaving(true)

    try {
      const res = await fetch(SETTINGS_ENDPOINT, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ bankName, email }),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Could not save changes.')

      setBankName(result.name)
      setEmail(result.email)
      setSaveSuccess(true)
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeactivate = async () => {
    const confirmed = window.confirm(
      'Deactivate your account? You will be signed out immediately, and your login will stop working. This cannot be undone from here.'
    )
    if (!confirmed) return

    setIsDeactivating(true)
    try {
      await fetch(DEACTIVATE_ENDPOINT, {
        method: 'POST',
        credentials: 'include',
      })
    } finally {
      // The backend already killed the session server-side regardless
      // of whether this request itself succeeds cleanly — send them to
      // login either way.
      navigate('/')
    }
  }

  return (
    <div className="dashboard-layout">
      <Navbar />

      <main className="dashboard-content settings-content">
        <h1 className="dashboard-title">Settings</h1>
        <p className="dashboard-subtitle">Manage your bank's account details.</p>

        {isLoading ? (
          <p>Loading…</p>
        ) : (
          <>
            <form className="settings-form" onSubmit={handleSave}>
              <label className="field">
                Bank name
                <input
                  type="text"
                  value={bankName}
                  onChange={(event) => setBankName(event.target.value)}
                  required
                />
              </label>

              <label className="field">
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>

              {saveError && <p className="settings-error">{saveError}</p>}
              {saveSuccess && <p className="settings-success">Saved.</p>}

              <button type="submit" className="save-button" disabled={isSaving}>
                {isSaving ? 'Saving…' : 'Save changes'}
              </button>
            </form>

            <section className="danger-zone">
              <h2>Danger zone</h2>
              <p>
                Deactivating your account signs you out immediately and blocks
                future logins. Your application history is kept, not deleted.
              </p>
              <button
                type="button"
                className="deactivate-button"
                onClick={handleDeactivate}
                disabled={isDeactivating}
              >
                {isDeactivating ? 'Deactivating…' : 'Deactivate account'}
              </button>
            </section>
          </>
        )}
      </main>
    </div>
  )
}

export default Settings