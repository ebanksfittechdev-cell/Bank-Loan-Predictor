import { Routes, Route } from 'react-router-dom'
import Login from './onboarding/Login.jsx'
import Onboarding from './onboarding/Onboarding.jsx'
import PendingLoans from './bank_dashboard/Pending_Loans.jsx'
import AuditLog from './bank_dashboard/Audit_Log.jsx'
import ApplicantForm from './applicant_form/Applicant_Form.jsx'
import ApplicantResult from './applicant_form/Applicant_Result.jsx'
import Settings from './bank_dashboard/Settings.jsx'
import Analytics from './bank_dashboard/Analytics.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/onboarding" element={<Onboarding />} />

      {/* Fully public — no login required. Anyone with a bank's link
          can reach these, by design. */}
      <Route path="/apply/:bankSlug" element={<ApplicantForm />} />
      <Route path="/apply/:bankSlug/result" element={<ApplicantResult />} />

      {/* Everything nested here requires a logged-in session. */}
      <Route element={<ProtectedRoute />}>
        <Route path="/banker/dashboard" element={<PendingLoans />} />
        <Route path="/banker/audit" element={<AuditLog />} />
        <Route path="/banker/analytics" element={<Analytics />} />
        <Route path="/banker/settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

export default App