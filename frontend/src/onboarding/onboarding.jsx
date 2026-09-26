import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './auth.css'

const REGISTER_ENDPOINT = `${import.meta.env.VITE_API_URL}/api/auth/register`

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SPECIAL_CHAR_PATTERN = /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/;'`~]/g

function getPasswordError(password) {
  if (password.length < 8) {
    return 'Password must be at least 8 characters.'
  }
  const specialCharCount = (password.match(SPECIAL_CHAR_PATTERN) || []).length
  if (specialCharCount < 2) {
    return 'Password must include at least 2 special characters.'
  }
  return ''
}

function Onboarding() {
  const [bankName, setBankName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  const validate = () => {
    const errors = {}

    if (!bankName.trim()) {
      errors.bankName = 'Bank name is required.'
    }

    if (!EMAIL_PATTERN.test(email)) {
      errors.email = 'Enter a valid email address.'
    }

    const passwordError = getPasswordError(password)
    if (passwordError) {
      errors.password = passwordError
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError('')

    if (!validate()) {
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(REGISTER_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ bankName, email, password }),
      })

      if (!response.ok) {
        throw new Error('Could not create your account. Please try again.')
      }

      navigate('/')
    } catch (err) {
      setFormError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Set up your institution</h1>
        <p className="auth-subtitle">
          Create an account to start reviewing loan applications on Ledgerline.
        </p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label className="auth-label" htmlFor="bankName">
            Bank name
            <input
              id="bankName"
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              autoComplete="organization"
            />
            {fieldErrors.bankName && (
              <span className="auth-error">{fieldErrors.bankName}</span>
            )}
          </label>

          <label className="auth-label" htmlFor="email">
            Work email
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            {fieldErrors.email && (
              <span className="auth-error">{fieldErrors.email}</span>
            )}
          </label>

          <label className="auth-label" htmlFor="password">
            Password
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            {fieldErrors.password ? (
              <span className="auth-error">{fieldErrors.password}</span>
            ) : (
              <span className="auth-hint">
                At least 8 characters, including 2 special characters.
              </span>
            )}
          </label>

          {formError && <p className="auth-error">{formError}</p>}

          <button type="submit" className="auth-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-footer">
          Already registered? <Link to="/">Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}

export default Onboarding