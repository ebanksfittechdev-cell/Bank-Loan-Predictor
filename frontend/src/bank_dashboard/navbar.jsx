import { NavLink, useNavigate } from 'react-router-dom'
import './Navbar.css'

const LOGOUT_ENDPOINT = `${import.meta.env.VITE_API_URL}/api/auth/logout`

// Note: only /banker/dashboard is wired up to a real page so far.
// /banker/audit, /banker/analytics, and /banker/settings will render
// blank until those pages exist.
const NAV_ITEMS = [
  { to: '/banker/dashboard', label: 'Loan submissions' },
  { to: '/banker/audit', label: 'Audit' },
  { to: '/banker/analytics', label: 'Analytics' },
  { to: '/banker/settings', label: 'Settings' },
]

function Navbar() {
  const navigate = useNavigate()

  const handleSignOut = async () => {
    try {
      await fetch(LOGOUT_ENDPOINT, {
        method: 'POST',
        credentials: 'include',
      })
    } catch (err) {
      // Even if the request fails (network issue, etc.), still send
      // them back to login below — there's nothing useful for them to
      // do sitting on an authenticated page they can't act on.
      console.error('Sign-out request failed:', err)
    } finally {
      navigate('/')
    }
  }

  return (
    <nav className="navbar">
      <div className="navbar-brand">Ledgerline</div>

      <ul className="navbar-links">
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                'navbar-link' + (isActive ? ' active' : '')
              }
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>

      <button type="button" className="navbar-signout" onClick={handleSignOut}>
        Sign out
      </button>
    </nav>
  )
}

export default Navbar