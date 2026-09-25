import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import './Applicant_Form.css'

const API_URL = import.meta.env.VITE_API_URL

// TODO endpoints — don't exist on the backend yet, but this is the
// contract we're building both sides against:
//   GET  /api/apply/<bank_slug>          -> { name, slug }
//   POST /api/apply/submit/<bank_slug>   -> { id, riskScore, applicantName, bankName }
const bankInfoEndpoint = (slug) => `${API_URL}/api/apply/${slug}`
const submitEndpoint = (slug) => `${API_URL}/api/apply/submit/${slug}`

const INITIAL_FORM_STATE = {
  applicantName: '',
  applicantEmail: '',

  age: '',
  income: '',
  loanAmount: '',
  creditScore: '',
  monthsEmployed: '',
  numCreditLines: '',
  interestRate: '',
  loanTerm: '',
  dtiRatio: '',

  hasMortgage: false,
  hasDependents: false,
  hasCoSigner: false,

  // Single-choice in the UI — exploded into the model's one-hot
  // boolean columns at submit time. Each has an implicit baseline
  // category, matching how the model was trained: Bachelor's,
  // Full-time, Divorced, and Auto respectively.
  education: "Bachelor's",
  employmentType: 'Full-time',
  maritalStatus: 'Divorced',
  loanPurpose: 'Auto',
}

// Turns the form's single-choice fields into the 24 individual model
// features. Keys here match the schema in models.py exactly (in
// camelCase) — this payload is meant to line up 1:1 with what the
// backend expects, aside from things like status that the bank
// decides later, not the applicant.
function buildSubmissionPayload(formData) {
  return {
    applicantName: formData.applicantName,
    applicantEmail: formData.applicantEmail,

    age: Number(formData.age),
    income: Number(formData.income),
    loanAmount: Number(formData.loanAmount),
    creditScore: Number(formData.creditScore),
    monthsEmployed: Number(formData.monthsEmployed),
    numCreditLines: Number(formData.numCreditLines),
    interestRate: Number(formData.interestRate),
    loanTerm: Number(formData.loanTerm),
    dtiRatio: Number(formData.dtiRatio),

    hasMortgage: formData.hasMortgage,
    hasDependents: formData.hasDependents,
    hasCoSigner: formData.hasCoSigner,

    educationHighSchool: formData.education === 'High School',
    educationMasters: formData.education === "Master's",
    educationPhd: formData.education === 'PhD',

    employmentTypePartTime: formData.employmentType === 'Part-time',
    employmentTypeSelfEmployed: formData.employmentType === 'Self-employed',
    employmentTypeUnemployed: formData.employmentType === 'Unemployed',

    maritalStatusMarried: formData.maritalStatus === 'Married',
    maritalStatusSingle: formData.maritalStatus === 'Single',

    loanPurposeBusiness: formData.loanPurpose === 'Business',
    loanPurposeEducation: formData.loanPurpose === 'Education',
    loanPurposeHome: formData.loanPurpose === 'Home',
    loanPurposeOther: formData.loanPurpose === 'Other',
  }
}

function ApplicantForm() {
  const { bankSlug } = useParams()
  const navigate = useNavigate()

  const [bank, setBank] = useState(null)
  const [bankNotFound, setBankNotFound] = useState(false)

  const [formData, setFormData] = useState(INITIAL_FORM_STATE)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    let cancelled = false

    fetch(bankInfoEndpoint(bankSlug))
      .then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then((data) => {
        if (!cancelled) setBank(data)
      })
      .catch(() => {
        if (!cancelled) setBankNotFound(true)
      })

    return () => {
      cancelled = true
    }
  }, [bankSlug])

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target
    setFormData((previous) => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitError('')
    setIsSubmitting(true)

    try {
      const res = await fetch(submitEndpoint(bankSlug), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildSubmissionPayload(formData)),
      })

      if (!res.ok) throw new Error('Could not submit your application.')

      const result = await res.json()

      // Carry the result forward via route state rather than a second
      // fetch — ApplicantResult reads this from useLocation().state.
      navigate(`/apply/${bankSlug}/result`, { state: result })
    } catch (err) {
      setSubmitError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (bankNotFound) {
    return (
      <div className="applicant-page">
        <div className="applicant-card">
          <h1 className="applicant-title">We couldn't find that application link</h1>
          <p className="applicant-subtitle">
            Double check the link your bank shared with you.
          </p>
        </div>
      </div>
    )
  }

  if (!bank) {
    return (
      <div className="applicant-page">
        <p>Loading…</p>
      </div>
    )
  }

  return (
    <div className="applicant-page">
      <div className="applicant-card">
        <h1 className="applicant-title">Apply to {bank.name}</h1>
        <p className="applicant-subtitle">
          Fill in your information below for an instant approval likelihood.
        </p>

        <form className="applicant-form" onSubmit={handleSubmit}>
          <fieldset className="form-section">
            <legend>Your information</legend>
            <div className="field-grid">
              <label className="field">
                Full name
                <input
                  type="text"
                  name="applicantName"
                  value={formData.applicantName}
                  onChange={handleChange}
                  required
                />
              </label>
              <label className="field">
                Email
                <input
                  type="email"
                  name="applicantEmail"
                  value={formData.applicantEmail}
                  onChange={handleChange}
                  required
                />
              </label>
              <label className="field">
                Age
                <input
                  type="number"
                  name="age"
                  min="18"
                  value={formData.age}
                  onChange={handleChange}
                  required
                />
              </label>
            </div>
          </fieldset>

          <fieldset className="form-section">
            <legend>Loan details</legend>
            <div className="field-grid">
              <label className="field">
                Loan amount ($)
                <input
                  type="number"
                  name="loanAmount"
                  min="0"
                  value={formData.loanAmount}
                  onChange={handleChange}
                  required
                />
              </label>
              <label className="field">
                Loan term (months)
                <input
                  type="number"
                  name="loanTerm"
                  min="1"
                  value={formData.loanTerm}
                  onChange={handleChange}
                  required
                />
              </label>
              <label className="field">
                Interest rate (%)
                <input
                  type="number"
                  step="0.01"
                  name="interestRate"
                  min="0"
                  value={formData.interestRate}
                  onChange={handleChange}
                  required
                />
              </label>
              <label className="field">
                Loan purpose
                <select name="loanPurpose" value={formData.loanPurpose} onChange={handleChange}>
                  <option>Auto</option>
                  <option>Business</option>
                  <option>Education</option>
                  <option>Home</option>
                  <option>Other</option>
                </select>
              </label>
            </div>
          </fieldset>

          <fieldset className="form-section">
            <legend>Financial profile</legend>
            <div className="field-grid">
              <label className="field">
                Annual income ($)
                <input
                  type="number"
                  name="income"
                  min="0"
                  value={formData.income}
                  onChange={handleChange}
                  required
                />
              </label>
              <label className="field">
                Credit score
                <input
                  type="number"
                  name="creditScore"
                  min="300"
                  max="850"
                  value={formData.creditScore}
                  onChange={handleChange}
                  required
                />
              </label>
              <label className="field">
                Debt-to-income ratio
                <input
                  type="number"
                  step="0.01"
                  name="dtiRatio"
                  min="0"
                  max="1"
                  value={formData.dtiRatio}
                  onChange={handleChange}
                  required
                />
              </label>
              <label className="field">
                Number of credit lines
                <input
                  type="number"
                  name="numCreditLines"
                  min="0"
                  value={formData.numCreditLines}
                  onChange={handleChange}
                  required
                />
              </label>
              <label className="field">
                Months employed
                <input
                  type="number"
                  name="monthsEmployed"
                  min="0"
                  value={formData.monthsEmployed}
                  onChange={handleChange}
                  required
                />
              </label>
              <label className="field">
                Employment type
                <select
                  name="employmentType"
                  value={formData.employmentType}
                  onChange={handleChange}
                >
                  <option>Full-time</option>
                  <option>Part-time</option>
                  <option>Self-employed</option>
                  <option>Unemployed</option>
                </select>
              </label>
            </div>
          </fieldset>

          <fieldset className="form-section">
            <legend>Background</legend>
            <div className="field-grid">
              <label className="field">
                Education
                <select name="education" value={formData.education} onChange={handleChange}>
                  <option>Bachelor's</option>
                  <option>High School</option>
                  <option>Master's</option>
                  <option>PhD</option>
                </select>
              </label>
              <label className="field">
                Marital status
                <select
                  name="maritalStatus"
                  value={formData.maritalStatus}
                  onChange={handleChange}
                >
                  <option>Divorced</option>
                  <option>Married</option>
                  <option>Single</option>
                </select>
              </label>
            </div>

            <div className="checkbox-grid">
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  name="hasMortgage"
                  checked={formData.hasMortgage}
                  onChange={handleChange}
                />
                Has a mortgage
              </label>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  name="hasDependents"
                  checked={formData.hasDependents}
                  onChange={handleChange}
                />
                Has dependents
              </label>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  name="hasCoSigner"
                  checked={formData.hasCoSigner}
                  onChange={handleChange}
                />
                Has a co-signer
              </label>
            </div>
          </fieldset>

          {submitError && <p className="applicant-error">{submitError}</p>}

          <button type="submit" className="applicant-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting…' : 'Submit application'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ApplicantForm