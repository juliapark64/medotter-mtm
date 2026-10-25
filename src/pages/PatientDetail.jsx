import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import patients from '../data/patients.json'
import medData from '../data/medications.json'
import StatusBadge from '../components/StatusBadge'
import AlertBanner from '../components/AlertBanner'
import RpmPatientTab from '../components/RpmPatientTab'
import RpmEnrollmentModal from '../components/RpmEnrollmentModal'
import { useRpm } from '../context/RpmContext'

// Known blood pressure drug terms
const BP_MED_KEYWORDS = [
  'lisinopril', 'amlodipine', 'carvedilol', 'hydrochlorothiazide', 'atenolol',
  'spironolactone', 'eplerenone', 'furosemide', 'metoprolol', 'losartan', 'valsartan'
]

function isBpDeprescribingItem(text) {
  if (!text) return false
  const lower = text.toLowerCase()
  const isDeprescribe = lower.includes('deprescrib') || lower.includes('taper') || lower.includes('step-down') || lower.includes('discontinu') || lower.includes('stop') || lower.includes('reassess') || lower.includes('review')
  const hasBpDrug = BP_MED_KEYWORDS.some(k => lower.includes(k)) || lower.includes('blood pressure') || lower.includes('hypertension')
  return isDeprescribe && hasBpDrug
}

function detectBpMedName(text) {
  if (!text) return 'Blood Pressure Medication'
  const lower = text.toLowerCase()
  for (const k of BP_MED_KEYWORDS) {
    if (lower.includes(k)) {
      return k.charAt(0).toUpperCase() + k.slice(1)
    }
  }
  return 'Blood Pressure Medication'
}

export default function PatientDetail() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const patient = patients.find(p => p.id === id)
  const data = medData[id]

  const {
    getEnrollment,
    enrollPatient,
    attachDeprescribingToRpm
  } = useRpm()

  const enrollment = getEnrollment(id)

  const [notes, setNotes] = useState('')
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'medications')
  const [isEnrollmentModalOpen, setIsEnrollmentModalOpen] = useState(false)
  const [modalPendingRec, setModalPendingRec] = useState(null)
  const [linkToast, setLinkToast] = useState(null)

  // Sync tab with query param if it changes
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam) setActiveTab(tabParam)
  }, [searchParams])

  if (!patient || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        <div className="text-center">
          <p className="text-2xl font-bold mb-2">Patient Not Found</p>
          <Link to="/integration-demo/dashboard" className="text-brand-600 hover:underline">← Back to Dashboard</Link>
        </div>
      </div>
    )
  }

  const adherenceColor = (pct) => {
    if (pct >= 80) return 'text-emerald-600'
    if (pct >= 60) return 'text-amber-600'
    return 'text-red-600'
  }

  const majorCount = data.interactions.filter(i => i.severity === 'major').length

  // Deprescribing monitor click handler (Requirement 9)
  const handleMonitorWithRpm = (itemText, medName = null) => {
    const detected = medName || detectBpMedName(itemText)
    attachDeprescribingToRpm(patient.id, {
      recommendationText: itemText,
      medicationName: detected,
      prescriberName: 'Primary Care Physician'
    })
    setLinkToast(`Attached ${detected} taper to RPM surveillance.`)
    setTimeout(() => setLinkToast(null), 4000)
    setActiveTab('rpm')
  }

  const isRecAttached = (text) => {
    if (!enrollment || !enrollment.attachedRecommendations) return false
    return enrollment.attachedRecommendations.some(r =>
      (r.recommendationText && r.recommendationText === text) || r === text
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Toast */}
      {linkToast && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>{linkToast}</span>
        </div>
      )}

      {/* Back + header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate('/integration-demo/dashboard')}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-700 transition mb-5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Dashboard
          </button>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            {/* Patient identity */}
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-brand-700 text-white font-black text-xl flex items-center justify-center shrink-0">
                {patient.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-slate-800">{patient.name}</h1>
                <div className="flex flex-wrap gap-2 mt-1 text-sm text-slate-500">
                  <span>Age {patient.age}</span>
                  <span>·</span>
                  <span>DOB: {patient.dob}</span>
                  <span>·</span>
                  <span>MRN: {patient.mrn}</span>
                  <span>·</span>
                  <span>{patient.insurer}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <StatusBadge status={patient.status} />

                  {/* RPM Enrollment Status Badge */}
                  {enrollment ? (
                    <button
                      onClick={() => setActiveTab('rpm')}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800 border border-teal-200 hover:bg-teal-200 transition"
                    >
                      <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse" />
                      RPM Active ({enrollment.targetSystolic}/{enrollment.targetDiastolic} Goal)
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                      RPM Eligible
                    </span>
                  )}

                  {majorCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                      {majorCount} Major Alert{majorCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick stats + Action Buttons (Requirement 3: Enroll in RPM button) */}
            <div className="flex flex-col gap-3 md:items-end">
              <div className="flex items-center gap-2">
                {!enrollment ? (
                  <button
                    onClick={() => {
                      setModalPendingRec(null)
                      setIsEnrollmentModalOpen(true)
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-teal-600 text-white font-semibold text-sm transition hover:bg-teal-700 shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Enroll in RPM
                  </button>
                ) : (
                  <button
                    onClick={() => setActiveTab('rpm')}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 font-semibold text-xs transition hover:bg-teal-100"
                  >
                    <svg className="w-3.5 h-3.5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                    </svg>
                    View RPM Data
                  </button>
                )}

                <Link
                  to={`/integration-demo/dashboard/patient/${id}/print`}
                  className="btn-teal"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.056 48.056 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
                  </svg>
                  Print Summary
                </Link>
              </div>

              <div className="flex gap-3 text-sm">
                <div className="text-center">
                  <div className="font-bold text-slate-800">{patient.medicationCount}</div>
                  <div className="text-xs text-slate-500">Medications</div>
                </div>
                <div className="text-center">
                  <div className={`font-bold ${adherenceColor(patient.adherence)}`}>{patient.adherence}%</div>
                  <div className="text-xs text-slate-500">Adherence</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-slate-800">{data.interactions.length}</div>
                  <div className="text-xs text-slate-500">Interactions</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Patient info cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card">
            <h2 className="font-bold text-slate-700 text-sm uppercase tracking-wider mb-3">Chronic Conditions</h2>
            <ul className="space-y-1.5">
              {patient.conditions.map(c => (
                <li key={c} className="flex items-center gap-2 text-sm text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
          <div className="card">
            <h2 className="font-bold text-slate-700 text-sm uppercase tracking-wider mb-3">Known Allergies</h2>
            <ul className="space-y-1.5">
              {patient.allergies.map(a => (
                <li key={a} className="flex items-center gap-2 text-sm">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${a === 'None known' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <span className={a === 'None known' ? 'text-emerald-700' : 'text-red-700 font-medium'}>{a}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-slate-400 mb-0.5">Last Review</div>
                <div className="font-semibold text-slate-700">{patient.lastReview}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-0.5">Next Follow-up</div>
                <div className="font-semibold text-slate-700">{patient.nextFollowup}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex border-b border-slate-200 overflow-x-auto">
            {[
              { key: 'medications', label: `Medications (${data.medications.length})` },
              { key: 'rpm', label: 'Blood Pressure (RPM)' },
              { key: 'interactions', label: `Drug Interactions (${data.interactions.length})` },
              { key: 'todos', label: `Action Items (${data.todos.length})` },
              { key: 'notes', label: 'Pharmacist Notes' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-3 text-sm font-medium transition border-b-2 whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-brand-600 text-brand-700 bg-brand-50/50 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                {tab.label}
                {tab.key === 'rpm' && enrollment && (
                  <span className="ml-1.5 w-2 h-2 rounded-full bg-teal-500 inline-block align-middle" />
                )}
                {tab.key === 'interactions' && data.interactions.some(i => i.severity === 'major') && (
                  <span className="ml-1.5 w-2 h-2 rounded-full bg-red-500 inline-block align-middle" />
                )}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* RPM Tab (Requirement 4 & 5) */}
            {activeTab === 'rpm' && (
              <RpmPatientTab
                patient={patient}
                onOpenEnrollment={() => {
                  setModalPendingRec(null)
                  setIsEnrollmentModalOpen(true)
                }}
              />
            )}

            {/* Medications tab */}
            {activeTab === 'medications' && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      {['Medication', 'Dose', 'Frequency', 'Prescriber', 'Indication', 'Adherence', 'RPM Taper Action'].map(h => (
                        <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.medications.map((med, i) => {
                      const isBpMed = BP_MED_KEYWORDS.some(k => med.name.toLowerCase().includes(k)) || med.indication.toLowerCase().includes('hypertension')
                      return (
                        <tr key={i} className={`border-b border-slate-100 ${med.adherence === 0 ? 'bg-red-50' : i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                          <td className="px-3 py-3 font-semibold text-slate-800">
                            {med.name}
                            {isBpMed && (
                              <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700 font-bold border border-blue-200">
                                BP Med
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{med.dose}</td>
                          <td className="px-3 py-3 text-slate-600">{med.frequency}</td>
                          <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{med.prescriber}</td>
                          <td className="px-3 py-3 text-slate-600">{med.indication}</td>
                          <td className="px-3 py-3">
                            {med.adherence > 0 ? (
                              <div className="flex items-center gap-2">
                                <div className="w-12 bg-slate-200 rounded-full h-1.5">
                                  <div
                                    className={`h-1.5 rounded-full ${med.adherence >= 80 ? 'bg-emerald-500' : med.adherence >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                                    style={{ width: `${med.adherence}%` }}
                                  />
                                </div>
                                <span className={`text-xs font-bold ${adherenceColor(med.adherence)}`}>{med.adherence}%</span>
                              </div>
                            ) : (
                              <span className="text-xs text-red-600 font-bold">⚠ ALLERGY</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            {isBpMed && (
                              <button
                                onClick={() => handleMonitorWithRpm(`Consider taper trial for ${med.name} ${med.dose} with daily blood pressure surveillance.`, med.name)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition whitespace-nowrap"
                              >
                                <span>📡 Monitor with RPM</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Interactions tab */}
            {activeTab === 'interactions' && (
              <div className="space-y-4">
                {data.interactions.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">No drug interactions flagged.</p>
                ) : (
                  data.interactions.map((interaction, i) => (
                    <AlertBanner key={i} interaction={interaction} />
                  ))
                )}
              </div>
            )}

            {/* Action items tab (Requirement 9: Monitor with RPM button on BP deprescribing recommendations) */}
            {activeTab === 'todos' && (
              <ul className="space-y-3">
                {data.todos.map((todo, i) => {
                  const isBpDeprescribe = isBpDeprescribingItem(todo)
                  const isAttached = isRecAttached(todo)

                  return (
                    <li key={i} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border ${todo.includes('URGENT') || todo.includes('REVIEW') ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex items-start gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${todo.includes('URGENT') || todo.includes('REVIEW') ? 'bg-red-500 text-white' : 'bg-brand-600 text-white'}`}>
                          {i + 1}
                        </span>
                        <div>
                          <p className={`text-sm leading-relaxed ${todo.includes('URGENT') || todo.includes('REVIEW') ? 'text-red-800 font-medium' : 'text-slate-700'}`}>
                            {todo}
                          </p>
                          {isBpDeprescribe && (
                            <span className="inline-block mt-1 text-[11px] font-semibold text-indigo-700">
                              💊 Blood pressure deprescribing / dose-optimization opportunity
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Requirement 9: Monitor with RPM button */}
                      {isBpDeprescribe && (
                        <div className="shrink-0 self-start sm:self-center ml-9 sm:ml-0">
                          {isAttached ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              ✓ Monitoring with RPM (Active Taper)
                            </span>
                          ) : (
                            <button
                              onClick={() => handleMonitorWithRpm(todo)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition"
                            >
                              <span>📡 Monitor with RPM</span>
                            </button>
                          )}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}

            {/* Notes tab */}
            {activeTab === 'notes' && (
              <div>
                <p className="text-xs text-slate-400 mb-3">Note: In this demo, notes are not persisted between sessions.</p>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={10}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
                  placeholder={`Pharmacist notes for ${patient.name}...\n\nDate: ${new Date().toLocaleDateString()}\nPharmacist: `}
                />
                <div className="flex justify-end mt-3">
                  <button
                    onClick={() => alert('Notes saved! (demo only — not actually persisted)')}
                    className="btn-primary"
                  >
                    Save Notes
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enrollment Modal (Requirement 3) */}
      <RpmEnrollmentModal
        isOpen={isEnrollmentModalOpen}
        onClose={() => setIsEnrollmentModalOpen(false)}
        patient={patient}
        onEnroll={enrollPatient}
        initialRecommendation={modalPendingRec}
      />
    </div>
  )
}
