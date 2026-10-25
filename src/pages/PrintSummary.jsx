import { useParams, Link } from 'react-router-dom'
import patients from '../data/patients.json'
import medData from '../data/medications.json'

export default function PrintSummary() {
  const { id } = useParams()
  const patient = patients.find(p => p.id === id)
  const data = medData[id]
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  if (!patient || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        <p>Patient not found. <Link to="/dashboard" className="text-brand-600 hover:underline">Back to Dashboard</Link></p>
      </div>
    )
  }

  // Filter out allergy sentinel rows
  const realMeds = data.medications.filter(m => m.adherence > 0)

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Toolbar — hidden on print */}
      <div className="no-print bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <Link to={`/dashboard/patient/${id}`} className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-brand-700 transition">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to Patient
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">Review Summary – {patient.name}</span>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-700 text-white text-sm font-semibold hover:bg-brand-800 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.056 48.056 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
            </svg>
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* Print document */}
      <div className="max-w-4xl mx-auto my-8 print-page" id="print-document">
        <div className="bg-white shadow-lg rounded-2xl overflow-hidden print:shadow-none print:rounded-none">

          {/* ── Page 1: Cover Letter ── */}
          <div className="p-10 border-b-4 border-brand-700">
            {/* Letterhead */}
            <div className="flex items-start justify-between mb-10">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-10 h-10 rounded-xl bg-brand-700 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-extrabold text-xl text-slate-800">Stone Pharmacy</div>
                    <div className="text-xs text-slate-400">Medication Therapy Management Program</div>
                  </div>
                </div>
                <div className="text-xs text-slate-500 mt-3 space-y-0.5">
                  <div>1247 River Oak Blvd, Suite 3 · Maplewood, OR 97401</div>
                  <div>(541) 555-0192 · mtm@stonepharmacy.demo</div>
                  <div>In partnership with <strong>River Health Plan</strong></div>
                </div>
              </div>
              <div className="text-right text-sm text-slate-500">
                <div className="font-semibold text-slate-700">{today}</div>
                <div className="mt-1">MRN: {patient.mrn}</div>
                <div>Plan: {patient.insurer}</div>
              </div>
            </div>

            {/* Recipient */}
            <div className="mb-8">
              <p className="font-semibold text-slate-800">Dear {patient.name},</p>
            </div>

            {/* Letter body */}
            <div className="prose prose-slate max-w-none text-sm leading-relaxed space-y-4 text-slate-700">
              <p>
                Thank you for participating in the <strong>Medication Therapy Management (MTM)</strong> program offered through <strong>River Health Plan</strong> and provided by Stone Pharmacy. MTM is a free, personalized service designed to help you get the most benefit from your medications while reducing risks and costs.
              </p>
              <p>
                During your most recent consultation, your Stone Pharmacy pharmacist conducted a comprehensive review of all the medications you currently take — including prescriptions, over-the-counter drugs, vitamins, and supplements. This review is an important step in ensuring your medications are working together safely and effectively.
              </p>
              <p>
                Based on your medication review, we have identified <strong>{data.interactions.length} drug interaction{data.interactions.length !== 1 ? 's' : ''}</strong> for your care team's attention, along with a personalized list of recommended action items. Please review these recommendations with your doctor and pharmacist at your earliest convenience.
              </p>
              <p>
                This document includes:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>A personalized <strong>Medication Action Plan</strong> with recommended steps</li>
                <li>Your complete <strong>Personal Medication List</strong></li>
              </ul>
              <p>
                If you have any questions about this summary or your medications, please do not hesitate to contact us at <strong>(541) 555-0192</strong> or visit us at Stone Pharmacy during business hours.
              </p>
              <p>
                Thank you for your trust in Stone Pharmacy. We are committed to supporting your health every step of the way.
              </p>
              <div className="mt-8">
                <p>Sincerely,</p>
                <p className="font-semibold text-slate-800 mt-4">Dr. Alexandra M. Rivera, PharmD</p>
                <p className="text-slate-500 text-xs">Clinical Pharmacist · Stone Pharmacy MTM Program</p>
                <p className="text-slate-400 text-xs italic mt-4">
                  ⚠ This is a demo document. All patient information is fictional and for educational purposes only.
                </p>
              </div>
            </div>
          </div>

          {/* ── Page 2: Action Plan ── */}
          <div className="p-10 border-b border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-extrabold text-slate-800">Medication Action Plan</h2>
            </div>
            <p className="text-sm text-slate-500 mb-6">
              The following action items were identified during your medication review on {today}. Please bring this list to your next doctor's appointment.
            </p>

            <div className="space-y-3">
              {data.todos.map((todo, i) => {
                const isUrgent = todo.includes('URGENT') || todo.includes('REVIEW')
                return (
                  <div
                    key={i}
                    className={`flex items-start gap-4 p-4 rounded-xl border ${isUrgent ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}
                  >
                    <div className="flex items-center gap-3 shrink-0">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${isUrgent ? 'bg-red-500' : 'bg-brand-600'}`}>
                        {i + 1}
                      </div>
                      {/* Checkbox for print */}
                      <div className="w-4 h-4 border-2 border-slate-400 rounded print:block hidden" />
                    </div>
                    <p className={`text-sm leading-relaxed ${isUrgent ? 'text-red-800 font-medium' : 'text-slate-700'}`}>{todo}</p>
                  </div>
                )
              })}
            </div>

            {/* Drug interactions summary */}
            {data.interactions.length > 0 && (
              <div className="mt-8">
                <h3 className="font-bold text-slate-700 mb-4 text-base">Drug Interaction Summary</h3>
                <div className="space-y-3">
                  {data.interactions.map((ix, i) => {
                    const colors = { major: 'bg-red-50 border-red-200 text-red-800', moderate: 'bg-amber-50 border-amber-200 text-amber-800', minor: 'bg-blue-50 border-blue-200 text-blue-800' }
                    const badges = { major: 'bg-red-100 text-red-700', moderate: 'bg-amber-100 text-amber-700', minor: 'bg-blue-100 text-blue-700' }
                    return (
                      <div key={i} className={`p-4 rounded-xl border text-sm ${colors[ix.severity]}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${badges[ix.severity]}`}>{ix.severity}</span>
                          <strong>{ix.drugs.join(' + ')}</strong>
                        </div>
                        <p className="text-xs leading-relaxed opacity-90">{ix.description}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Page 3: Personal Medication List ── */}
          <div className="p-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-700 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-extrabold text-slate-800">Personal Medication List</h2>
              </div>
              <div className="text-right text-xs text-slate-400">
                <div>Patient: <strong className="text-slate-600">{patient.name}</strong></div>
                <div>As of: {today}</div>
              </div>
            </div>

            <p className="text-xs text-slate-500 mb-5">
              Carry this list with you to all medical appointments, emergency room visits, and when picking up prescriptions. Keep it up to date.
            </p>

            {/* Patient allergy bar */}
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 flex items-center gap-2 text-sm">
              <span className="font-bold text-red-700">⚠ Allergies:</span>
              <span className="text-red-700">{patient.allergies.join(', ')}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-brand-700 text-white">
                    <th className="text-left px-3 py-2.5 text-xs font-semibold">#</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold">Medication Name</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold">Dose</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold">How Often</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold">What It's For</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold">Prescriber</th>
                  </tr>
                </thead>
                <tbody>
                  {realMeds.map((med, i) => (
                    <tr key={i} className={`border-t border-slate-200 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                      <td className="px-3 py-2.5 text-slate-400 text-xs">{i + 1}</td>
                      <td className="px-3 py-2.5 font-semibold text-slate-800">{med.name}</td>
                      <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{med.dose}</td>
                      <td className="px-3 py-2.5 text-slate-600">{med.frequency}</td>
                      <td className="px-3 py-2.5 text-slate-600">{med.indication}</td>
                      <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{med.prescriber}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer note */}
            <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs text-slate-400">
              <div>
                <p>This medication list was prepared by Stone Pharmacy as part of the River Health Plan MTM Program.</p>
                <p className="italic mt-1">For demo purposes only — all information is fictional.</p>
              </div>
              <div className="text-right">
                <p>Stone Pharmacy · (541) 555-0192</p>
                <p>1247 River Oak Blvd, Maplewood, OR 97401</p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom print button */}
      <div className="no-print text-center pb-10">
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-brand-700 text-white font-bold text-base hover:bg-brand-800 transition shadow-lg"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.056 48.056 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
          </svg>
          Print / Save as PDF
        </button>
      </div>
    </div>
  )
}
