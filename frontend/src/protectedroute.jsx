import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'

const ME_ENDPOINT = `${import.meta.env.VITE_API_URL}/api/auth/me`

// Wrap any routes that require a logged-in bank with this. It asks the
// backend "is there a valid session right now" via /api/auth/me before
// rendering anything — so a logged-out visitor typing /banker/dashboard
// directly into the URL bar gets bounced to login instead of seeing the
// page shell at all.
//
// This is a UX guard, not the real security boundary — the actual
// protection is still @login_required on the Flask routes themselves.
// This just stops an unauthenticated visitor from seeing the page
// render (and immediately 401) in the first place.
function ProtectedRoute() {
  const [authStatus, setAuthStatus] = useState('checking')

  useEffect(() => {
    let cancelled = false

    fetch(ME_ENDPOINT, { credentials: 'include' })
      .then((res) => {
        if (!cancelled) setAuthStatus(res.ok ? 'authenticated' : 'unauthenticated')
      })
      .catch(() => {
        if (!cancelled) setAuthStatus('unauthenticated')
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (authStatus === 'checking') {
    return <p>Loading…</p>
  }

  if (authStatus === 'unauthenticated') {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

export default ProtectedRoute