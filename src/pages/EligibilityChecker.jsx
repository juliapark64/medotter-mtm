import { useState } from 'react'
import { Link } from 'react-router-dom'

const CONDITIONS = [
  'Diabetes',
  'High Blood Pressure (Hypertension)',
  'High Cholesterol',
  'Heart Failure',
  "Alzheimer's Disease",
  'End-Stage Kidney Disease',
  'Bone Disease or Arthritis',
  'Mental Health Conditions',
  'Respiratory Disease (Asthma or COPD)',
  'HIV/AIDS',
]

const MED_OPTIONS = [
  { label: 'Fewer than 4 medications', value: 0 },
  { label: '4 – 7 medications', value: 6 },
  { label: '8 – 11 medications', value: 9 },
  { label: '12 or more medications', value: 12 },
]

const COST_OPTIONS = [
  { label: 'Less than $1,000 per year', value: 500 },
  { label: '$1,000 – $1,275 per year', value: 1100 },
  { label: '$1,276 – $3,000 per year', value: 2000 },
  { label: 'More than $3,000 per year', value: 4000 },
]

function getResult(conditions, meds, cost) {
  if (conditions >= 3 && meds >= 8 && cost >= 1276) return 'likely'
  if (conditions >= 2 && meds >= 4) return 'possibly'
  return 'unlikely'
}

const STEP_TITLES = [
  'Which chronic conditions do you have?',
  'How many maintenance medications do you take?',
  'What are your estimated yearly prescription costs?',
]

export default function EligibilityChecker() {
  const [step, setStep] = useState(0) // 0,1,2,3 (3 = result)
  const [selectedConditions, setSelectedConditions] = useState([])
  const [selectedMeds, setSelectedMeds] = useState(null)
  const [selectedCost, setSelectedCost] = useState(null)

  function toggleCondition(c) {
    setSelectedConditions(prev =>
      prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
    )
  }

  function canNext() {
    if (step === 0) return selectedConditions.length > 0
    if (step === 1) return selectedMeds !== null
    if (step === 2) return selectedCost !== null
    return false
  }

  function handleNext() {
    if (step < 2) setStep(s => s + 1)
    else setStep(3)
  }

  function reset() {
    setStep(0)
    setSelectedConditions([])
    setSelectedMeds(null)
    setSelectedCost(null)
  }

  const result = step === 3 ? getResult(selectedConditions.length, selectedMeds, selectedCost) : null

  const resultConfig = {
    likely: {
      color: 'emerald',
      icon: (
        <svg className="w-14 h-14 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      headline: '🎉 Likely Eligible!',
      body: "Based on your answers, you appear to meet the key criteria for Medication Therapy Management services through River Health Plan. You're one step away from getting a free, personalized medication review.",
      cta: 'Schedule Your MTM Consultation',
    },
    possibly: {
      color: 'amber',
      icon: (
        <svg className="w-14 h-14 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      ),
      headline: 'Possibly Eligible',
      body: "You may qualify for MTM services based on some of the criteria. Additional factors — like your specific plan and condition history — will determine final eligibility. We recommend calling Stone Pharmacy to discuss.",
      cta: 'Contact Stone Pharmacy',
    },
    unlikely: {
      color: 'slate',
      icon: (
        <svg className="w-14 h-14 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
      ),
      headline: 'Not Likely Eligible Right Now',
      body: "Based on your answers, you may not currently meet the standard MTM criteria. This could change as your health needs evolve. MTM eligibility is reassessed each plan year.",
      cta: 'Learn More About MTM',
    },
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <span className="inline-block bg-brand-100 text-brand-700 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4">
            River Health Plan · MTM Eligibility
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-3">Check Your MTM Eligibility</h1>
          <p className="text-slate-500 text-base max-w-lg mx-auto">
            Answer 3 quick questions to see if you likely qualify for free Medication Therapy Management services.
          </p>
        </div>

        {/* Progress bar */}
        {step < 3 && (
          <div className="mb-8">
            <div className="flex justify-between text-xs text-slate-400 mb-2">
              <span>Step {step + 1} of 3</span>
              <span>{Math.round(((step + 1) / 3) * 100)}% complete</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-brand-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${((step + 1) / 3) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Card */}
        <div className="card">
          {/* Step 0 – Conditions */}
          {step === 0 && (
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">{STEP_TITLES[0]}</h2>
              <p className="text-slate-500 text-sm mb-6">Select all that apply.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {CONDITIONS.map(c => {
                  const checked = selectedConditions.includes(c)
                  return (
                    <button
                      key={c}
                      onClick={() => toggleCondition(c)}
                      className={`flex items-center gap-3 text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition ${
                        checked
                          ? 'border-brand-600 bg-brand-50 text-brand-800'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded flex items-center justify-center border-2 shrink-0 ${
                        checked ? 'bg-brand-600 border-brand-600' : 'border-slate-300'
                      }`}>
                        {checked && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        )}
                      </span>
                      {c}
                    </button>
                  )
                })}
              </div>
              {selectedConditions.length > 0 && (
                <p className="mt-4 text-sm text-brand-700 font-semibold">{selectedConditions.length} condition{selectedConditions.length !== 1 ? 's' : ''} selected</p>
              )}
            </div>
          )}

          {/* Step 1 – Medications */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">{STEP_TITLES[1]}</h2>
              <p className="text-slate-500 text-sm mb-6">Count regular, ongoing prescriptions — not one-time antibiotics or short-term medications.</p>
              <div className="flex flex-col gap-3">
                {MED_OPTIONS.map(opt => {
                  const selected = selectedMeds === opt.value
                  return (
                    <button
                      key={opt.label}
                      onClick={() => setSelectedMeds(opt.value)}
                      className={`flex items-center gap-4 text-left px-5 py-4 rounded-xl border-2 transition ${
                        selected
                          ? 'border-brand-600 bg-brand-50'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        selected ? 'border-brand-600' : 'border-slate-300'
                      }`}>
                        {selected && <span className="w-2.5 h-2.5 rounded-full bg-brand-600" />}
                      </span>
                      <span className={`text-sm font-medium ${selected ? 'text-brand-800' : 'text-slate-700'}`}>{opt.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 2 – Costs */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">{STEP_TITLES[2]}</h2>
              <p className="text-slate-500 text-sm mb-6">Include all prescription drug spending — including what your insurance pays and your own out-of-pocket costs.</p>
              <div className="flex flex-col gap-3">
                {COST_OPTIONS.map(opt => {
                  const selected = selectedCost === opt.value
                  return (
                    <button
                      key={opt.label}
                      onClick={() => setSelectedCost(opt.value)}
                      className={`flex items-center gap-4 text-left px-5 py-4 rounded-xl border-2 transition ${
                        selected
                          ? 'border-brand-600 bg-brand-50'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        selected ? 'border-brand-600' : 'border-slate-300'
                      }`}>
                        {selected && <span className="w-2.5 h-2.5 rounded-full bg-brand-600" />}
                      </span>
                      <span className={`text-sm font-medium ${selected ? 'text-brand-800' : 'text-slate-700'}`}>{opt.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Result */}
          {step === 3 && result && (() => {
            const cfg = resultConfig[result]
            const borderColors = { likely: 'border-emerald-200', possibly: 'border-amber-200', unlikely: 'border-slate-200' }
            const bgColors = { likely: 'bg-emerald-50', possibly: 'bg-amber-50', unlikely: 'bg-slate-50' }
            return (
              <div className="flex flex-col items-center text-center gap-5">
                {cfg.icon}
                <h2 className="text-2xl font-extrabold text-slate-800">{cfg.headline}</h2>
                <p className="text-slate-600 leading-relaxed">{cfg.body}</p>

                {/* Summary */}
                <div className={`w-full rounded-xl border p-4 text-left ${borderColors[result]} ${bgColors[result]}`}>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Your Answers</p>
                  <ul className="space-y-1.5 text-sm text-slate-700">
                    <li><span className="font-semibold">Conditions:</span> {selectedConditions.length} selected</li>
                    <li><span className="font-semibold">Medications:</span> {MED_OPTIONS.find(o => o.value === selectedMeds)?.label}</li>
                    <li><span className="font-semibold">Yearly drug costs:</span> {COST_OPTIONS.find(o => o.value === selectedCost)?.label}</li>
                  </ul>
                </div>

                <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 text-sm text-brand-800 text-left w-full">
                  <strong>⚠️ Important:</strong> Actual eligibility criteria vary by plan and plan year. This tool provides an estimate only and does not constitute a coverage determination. Contact Stone Pharmacy at <strong>(541) 555-0192</strong> or your River Health Plan member services to confirm.
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <a href="#contact" className="btn-primary flex-1 justify-center">
                    {cfg.cta}
                  </a>
                  <button onClick={reset} className="btn-secondary flex-1 justify-center">
                    Start Over
                  </button>
                </div>
              </div>
            )
          })()}

          {/* Nav buttons */}
          {step < 3 && (
            <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-100">
              <button
                onClick={() => setStep(s => Math.max(0, s - 1))}
                disabled={step === 0}
                className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Back
              </button>
              <button
                onClick={handleNext}
                disabled={!canNext()}
                className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {step === 2 ? 'See My Result' : 'Next'} →
              </button>
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <p className="text-center text-xs text-slate-400 mt-6">
          For demo purposes only · No real health data is collected or stored
        </p>
      </div>
    </div>
  )
}
