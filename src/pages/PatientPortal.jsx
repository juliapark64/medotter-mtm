import { useState, useRef } from 'react'
import medData from '../data/medications.json'
import PatientPortalRpm from '../components/PatientPortalRpm'

// Mock patient: Margaret Holloway (p001)
const PATIENT = {
  id: 'p001',
  name: 'Margaret Holloway',
  dob: '1952-03-14',
  mrn: 'STP-10041',
  insurer: 'River Health Plan',
  nextReview: '2026-10-02',
  pharmacist: 'Dr. Alexandra Rivera, PharmD',
}

// Generate 12 weeks of mock adherence data per medication
function generateAdherenceCalendar(meds) {
  const weeks = []
  const today = new Date('2026-09-10')
  for (let w = 11; w >= 0; w--) {
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - w * 7)
    const label = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const isPast = w > 0
    weeks.push({
      label,
      isPast,
      meds: meds.map(med => {
        if (!isPast && w === 0) return 'current'
        const r = Math.random()
        if (med.adherence >= 85) return r < 0.85 ? 'taken' : r < 0.95 ? 'partial' : 'missed'
        if (med.adherence >= 65) return r < 0.65 ? 'taken' : r < 0.85 ? 'partial' : 'missed'
        return r < 0.50 ? 'taken' : r < 0.75 ? 'partial' : 'missed'
      })
    })
  }
  return weeks
}

const ADHERENCE_COLORS = {
  taken:   { bg: 'bg-emerald-400', title: 'Taken' },
  partial: { bg: 'bg-amber-400',   title: 'Partial' },
  missed:  { bg: 'bg-red-400',     title: 'Missed' },
  current: { bg: 'bg-slate-200',   title: 'Not yet due' },
}

// Compute refill due date (mock: 30 days from today minus remainder)
function refillDate(idx) {
  const d = new Date('2026-09-10')
  d.setDate(d.getDate() + 7 + idx * 3)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function PatientPortal() {
  const [tab, setTab] = useState('medications')
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [uploadNote, setUploadNote] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const fileInputRef = useRef(null)

  const meds = medData['p001'].medications.filter(m => m.adherence > 0)
  const calendarWeeks = generateAdherenceCalendar(meds)

  function handleFiles(e) {
    const files = Array.from(e.target.files).slice(0, 3)
    const previews = files.map(f => ({
      name: f.name,
      url: URL.createObjectURL(f),
      size: (f.size / 1024).toFixed(1) + ' KB',
    }))
    setUploadedFiles(prev => [...prev, ...previews].slice(0, 3))
  }

  function removeFile(idx) {
    setUploadedFiles(prev => prev.filter((_, i) => i !== idx))
  }

  function handleSubmit(e) {
    e.preventDefault()
    setSubmitted(true)
  }

  const tabs = [
    { key: 'medications', label: 'My Medications' },
    { key: 'rpm',         label: 'Blood Pressure (RPM)' },
    { key: 'calendar',    label: 'Refill Calendar' },
    { key: 'upload',      label: 'Photo Preview Demo' },
  ]

  // Adherence summary for calendar legend
  const allCells = calendarWeeks.flatMap(w => w.meds).filter(c => c !== 'current')
  const takenPct = Math.round((allCells.filter(c => c === 'taken').length / allCells.length) * 100)
  const partialPct = Math.round((allCells.filter(c => c === 'partial').length / allCells.length) * 100)
  const missedPct = 100 - takenPct - partialPct

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Portal header */}
      <div className="bg-gradient-to-r from-teal-700 to-brand-700 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="inline-block bg-white/15 text-white text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4">
                Patient Portal · River Health Plan MTM
              </span>
              <h1 className="text-3xl font-extrabold mb-1">Welcome, {PATIENT.name.split(' ')[0]} 👋</h1>
              <p className="text-teal-100 text-sm">Your medication health hub, powered by Stone Pharmacy.</p>
            </div>
            <div className="text-right text-xs text-white/70 hidden md:block">
              <div className="font-semibold text-white">MRN: {PATIENT.mrn}</div>
              <div>{PATIENT.insurer}</div>
              <div className="mt-2 bg-white/10 rounded-lg px-3 py-2">
                <div className="text-white/80">Next MTM Review</div>
                <div className="text-white font-bold">{PATIENT.nextReview}</div>
                <div className="text-white/70">{PATIENT.pharmacist}</div>
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
            {[
              { value: meds.length, label: 'Active Medications' },
              { value: '62%', label: 'Overall Adherence' },
              { value: PATIENT.nextReview, label: 'Next Review' },
              { value: '3', label: 'Items Need Attention' },
            ].map(s => (
              <div key={s.label} className="bg-white/10 rounded-xl px-4 py-3 text-center">
                <div className="text-xl font-extrabold text-white">{s.value}</div>
                <div className="text-xs text-teal-200 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-10 no-print">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-0">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-5 py-4 text-sm font-medium border-b-2 transition ${
                  tab === t.key
                    ? 'border-teal-600 text-teal-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Tab 1: My Medications ── */}
        {tab === 'medications' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800">My Current Medications</h2>
                <p className="text-slate-500 text-sm mt-1">Keep this list handy for all doctor visits and emergencies.</p>
              </div>
              <button
                onClick={() => window.print()}
                className="btn-secondary text-xs px-4 py-2 no-print"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.056 48.056 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" /></svg>
                Print List
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 flex items-center gap-2 text-sm text-amber-800">
              <svg className="w-4 h-4 text-amber-500 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
              <strong>Allergies: Penicillin, Sulfa drugs</strong> — always inform new providers.
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-teal-700 text-white">
                      <th className="text-left px-4 py-3 text-xs font-semibold">#</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold">Medication</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold">Dose</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold">How Often</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold">What It Treats</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold">Refill Due</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold">My Adherence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meds.map((med, i) => (
                      <tr key={i} className={`border-t border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                        <td className="px-4 py-3 text-slate-400 text-xs">{i + 1}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{med.name}</td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{med.dose}</td>
                        <td className="px-4 py-3 text-slate-600">{med.frequency}</td>
                        <td className="px-4 py-3 text-slate-600">{med.indication}</td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap font-medium text-teal-700">{refillDate(i)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-slate-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${med.adherence >= 80 ? 'bg-emerald-500' : med.adherence >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${med.adherence}%` }}
                              />
                            </div>
                            <span className={`text-xs font-bold ${med.adherence >= 80 ? 'text-emerald-600' : med.adherence >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                              {med.adherence}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-xs text-slate-400 text-center mt-4">
              Medication information provided by Stone Pharmacy as of Sept 2026. Contact your pharmacist with any questions.
            </p>
          </div>
        )}

        {/* ── Tab 2: Refill Calendar ── */}
        {tab === 'calendar' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800">12-Week Adherence Calendar</h2>
                <p className="text-slate-500 text-sm mt-1">Each cell shows whether you took that medication during that week.</p>
              </div>
              {/* Legend */}
              <div className="flex gap-3 flex-wrap text-xs">
                {Object.entries(ADHERENCE_COLORS).map(([key, val]) => (
                  <span key={key} className="flex items-center gap-1.5">
                    <span className={`w-3 h-3 rounded-sm ${val.bg}`} />
                    {val.title}
                  </span>
                ))}
              </div>
            </div>

            {/* Summary bar */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Taken on Time', pct: takenPct, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
                { label: 'Partial / Late', pct: partialPct, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
                { label: 'Missed', pct: missedPct, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
              ].map(s => (
                <div key={s.label} className={`card py-3 border ${s.bg} text-center`}>
                  <div className={`text-2xl font-extrabold ${s.color}`}>{s.pct}%</div>
                  <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-3 font-semibold text-slate-500 min-w-[180px]">Medication</th>
                      {calendarWeeks.map(w => (
                        <th key={w.label} className="px-2 py-3 font-medium text-slate-400 text-center whitespace-nowrap min-w-[56px]">
                          {w.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {meds.map((med, mi) => (
                      <tr key={mi} className="border-t border-slate-100">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-700">{med.name}</div>
                          <div className="text-slate-400">{med.dose}</div>
                        </td>
                        {calendarWeeks.map((week, wi) => {
                          const status = week.meds[mi]
                          const { bg, title } = ADHERENCE_COLORS[status]
                          return (
                            <td key={wi} className="px-2 py-3 text-center">
                              <span
                                title={`${week.label}: ${title}`}
                                className={`inline-block w-6 h-6 rounded ${bg} cursor-default`}
                              />
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-xs text-slate-400 text-center mt-4">
              Adherence data is collected from your pharmacy refill records. Contact Stone Pharmacy to update missing records.
            </p>
          </div>
        )}

        {/* ── Tab 3: Pre-Review Upload ── */}
        {tab === 'upload' && (
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-800">Preview Sample Pill Bottle Photos</h2>
              <p className="text-slate-500 text-sm mt-1">
                Try the pre-review workflow with sample or fictional photos only. Photos and notes remain in this page while it is open; they are not uploaded or sent to a pharmacist.
              </p>
            </div>

            {submitted ? (
              <div className="card text-center py-12">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Demo Preview Complete</h3>
                <p className="text-slate-500 text-sm mb-6">
                  {uploadedFiles.length > 0 ? `${uploadedFiles.length} sample photo${uploadedFiles.length > 1 ? 's were' : ' was'} previewed locally. ` : ''}No files or notes were sent. No pharmacist was notified, and no confirmation email will be sent.
                </p>
                <p className="text-xs text-slate-400 italic">This is a demonstration of the review workflow, not a clinical submission.</p>
                <button onClick={() => { setSubmitted(false); setUploadedFiles([]); setUploadNote('') }} className="btn-secondary mt-6">
                  Try Another Preview
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="card space-y-6">
                {/* Review info */}
                <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                    <span className="font-semibold text-teal-800">Fictional Review Details</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-teal-700">
                    <div><span className="text-teal-500">Date:</span> {PATIENT.nextReview}</div>
                    <div><span className="text-teal-500">Pharmacist:</span> {PATIENT.pharmacist}</div>
                    <div><span className="text-teal-500">Patient:</span> {PATIENT.name}</div>
                    <div><span className="text-teal-500">MRN:</span> {PATIENT.mrn}</div>
                  </div>
                </div>

                {/* Upload zone */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Sample Pill Bottle Photos <span className="text-slate-400 font-normal">(up to 3)</span>
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 rounded-xl px-6 py-10 text-center cursor-pointer hover:border-teal-400 hover:bg-teal-50 transition"
                  >
                    <svg className="w-10 h-10 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                    <p className="text-sm text-slate-500 mb-1">Click to select sample photos for a local preview</p>
                    <p className="text-xs text-slate-400">Use fictional images that your browser can display, such as JPG or PNG</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleFiles}
                    />
                  </div>
                </div>

                {/* Previews */}
                {uploadedFiles.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-3">Selected Photos ({uploadedFiles.length}/3)</p>
                    <div className="grid grid-cols-3 gap-3">
                      {uploadedFiles.map((f, i) => (
                        <div key={i} className="relative group">
                          <img
                            src={f.url}
                            alt={f.name}
                            className="w-full h-28 object-cover rounded-xl border border-slate-200"
                          />
                          <button
                            type="button"
                            onClick={() => removeFile(i)}
                            className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition hover:bg-red-600"
                          >
                            ×
                          </button>
                          <p className="text-xs text-slate-400 mt-1 truncate">{f.name}</p>
                          <p className="text-xs text-slate-300">{f.size}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Sample Review Notes <span className="text-slate-400 font-normal">(optional; fictional information only)</span>
                  </label>
                  <textarea
                    rows={4}
                    value={uploadNote}
                    onChange={e => setUploadNote(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
                    placeholder="E.g. I started a new medication last week that isn't in your records yet. I also have questions about my Warfarin dose..."
                  />
                </div>

                {/* Checklist */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm">
                  <p className="font-semibold text-slate-700 mb-3">Tips for good pill bottle photos:</p>
                  <ul className="space-y-2 text-slate-600">
                    {[
                      'Make sure the label is clearly visible and in focus',
                      'Include the pharmacy name, drug name, dose, and prescriber',
                      'Photograph all bottles including vitamins and OTC supplements',
                      'Good lighting helps — natural light works best',
                    ].map((tip, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>

                <button type="submit" className="btn-teal w-full justify-center text-base">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  Complete Demo Preview
                </button>

                <p className="text-center text-xs text-slate-400">
                  Local preview only. Photos and notes are not uploaded or saved after this page is reloaded.
                </p>
              </form>
            )}
          </div>
        )}

        {/* ── Tab 4: Blood Pressure (RPM) ── */}
        {tab === 'rpm' && (
          <PatientPortalRpm patientId={PATIENT.id} />
        )}
      </div>
    </div>
  )
}
