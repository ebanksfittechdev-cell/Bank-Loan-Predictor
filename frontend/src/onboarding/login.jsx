import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './auth.css'


const LOGIN_ENDPOINT = `${import.meta.env.VITE_API_URL}/api/auth/login`

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const response = await fetch(LOGIN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Session-based auth: the backend sets an httpOnly session cookie
        // on success. `include` makes sure that cookie is sent/received
        // even if frontend and backend end up on different ports/origins
        // during dev.
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        throw new Error('Invalid email or password.')
      }

      // No token to store — the session cookie is already set by the
      // browser. Just move on to the authenticated app.
      navigate('/banker/dashboard')
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Sign in to Ledgerline</h1>
        <p className="auth-subtitle">
          Review applications and manage your lending portfolio.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-label" htmlFor="email">
            Work email
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>

          <label className="auth-label" htmlFor="password">
            Password
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="auth-footer">
          New bank? <Link to="/onboarding">Set up your institution</Link>
        </p>
      </div>
    </div>
  )
}

export default Login