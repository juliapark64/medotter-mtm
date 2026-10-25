import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useRpm } from '../context/RpmContext'

const STATUS_STYLES = {
  Pending:  { badge: 'bg-amber-100 text-amber-700 border border-amber-200',  dot: 'bg-amber-400' },
  Accepted: { badge: 'bg-emerald-100 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-500' },
  Declined: { badge: 'bg-red-100 text-red-700 border border-red-200', dot: 'bg-red-500' },
}

const BP_KEYWORDS = [
  'lisinopril', 'amlodipine', 'carvedilol', 'hydrochlorothiazide', 'atenolol',
  'spironolactone', 'eplerenone', 'furosemide', 'metoprolol', 'losartan', 'blood pressure'
]

function isBpDeprescribeRec(text) {
  if (!text) return false
  const lower = text.toLowerCase()
  const isDeprescribing = lower.includes('deprescrib') || lower.includes('taper') || lower.includes('step-down') || lower.includes('discontinu')
  const isBp = BP_KEYWORDS.some(k => lower.includes(k)) || lower.includes('blood pressure')
  return isDeprescribing && isBp
}

function extractMedName(text) {
  const lower = text.toLowerCase()
  for (const k of BP_KEYWORDS) {
    if (k !== 'blood pressure' && lower.includes(k)) {
      return k.charAt(0).toUpperCase() + k.slice(1)
    }
  }
  return 'Blood Pressure Medication'
}

export default function PrescriberLog() {
  const { prescriberLog, setPrescriberLog, attachDeprescribingToRpm, getEnrollment } = useRpm()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('All')
  const [expanded, setExpanded] = useState(null)
  const [toastMessage, setToastMessage] = useState(null)

  function updateStatus(id, newStatus) {
    setPrescriberLog(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r))
  }

  const counts = {
    All: prescriberLog.length,
    Pending: prescriberLog.filter(r => r.status === 'Pending').length,
    Accepted: prescriberLog.filter(r => r.status === 'Accepted').length,
    Declined: prescriberLog.filter(r => r.status === 'Declined').length,
  }

  const filtered = filter === 'All' ? prescriberLog : prescriberLog.filter(r => r.status === filter)

  const handleAttachRpm = (rec) => {
    const medName = extractMedName(rec.recommendation)
    attachDeprescribingToRpm(rec.patientId, {
      recommendationText: rec.recommendation,
      medicationName: medName,
      prescriberName: rec.prescriber
    })
    setToastMessage(`Attached ${rec.patientName} (${medName}) to RPM taper monitoring.`)
    setTimeout(() => setToastMessage(null), 4000)
  }

  return (
    <div>
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header + filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Prescriber Communication Log</h2>
          <p className="text-sm text-slate-500 mt-0.5">Pharmacist recommendations sent to physicians, with response tracking.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {['All', 'Pending', 'Accepted', 'Declined'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filter === f
                  ? 'bg-brand-700 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-brand-300'
              }`}
            >
              {f} ({counts[f]})
            </button>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Pending Response', value: counts.Pending, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
          { label: 'Accepted', value: counts.Accepted, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
          { label: 'Declined', value: counts.Declined, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 text-center ${s.bg}`}>
            <div className={`text-2xl font-extrabold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Log entries */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400">No records match this filter.</div>
        )}
        {filtered.map(rec => {
          const s = STATUS_STYLES[rec.status] || STATUS_STYLES.Pending
          const isExpanded = expanded === rec.id
          const isUrgent = rec.recommendation.includes('URGENT')
          const isRpmReview = rec.recommendation.startsWith('[RPM Review]')
          const isBpDeprescribing = isBpDeprescribeRec(rec.recommendation)

          const enrollment = getEnrollment(rec.patientId)
          const isAttachedToRpm = enrollment && enrollment.attachedRecommendations && enrollment.attachedRecommendations.some(r =>
            (r.recommendationText && r.recommendationText === rec.recommendation) || r === rec.recommendation
          )

          return (
            <div
              key={rec.id}
              className={`rounded-xl border transition ${isUrgent && rec.status === 'Pending' ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'}`}
            >
              {/* Header row */}
              <button
                onClick={() => setExpanded(isExpanded ? null : rec.id)}
                className="w-full text-left px-5 py-4 flex items-start gap-4"
              >
                {/* Status dot */}
                <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${s.dot}`} />

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-800 text-sm hover:text-brand-600">
                      {rec.patientName}
                    </span>
                    <span className="text-slate-400 text-xs hidden sm:inline">→</span>
                    <span className="text-slate-600 text-xs">{rec.prescriber} <span className="text-slate-400">({rec.specialty})</span></span>
                    <span className="text-slate-400 text-xs">{rec.dateSent}</span>

                    {isRpmReview && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                        RPM Review
                      </span>
                    )}

                    {isBpDeprescribing && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                        BP Taper
                      </span>
                    )}
                  </div>
                  <p className={`text-sm leading-snug line-clamp-2 ${isUrgent && rec.status === 'Pending' ? 'text-red-800 font-medium' : 'text-slate-600'}`}>
                    {rec.recommendation}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${s.badge}`}>
                    {rec.status}
                  </span>
                  <svg
                    className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-1 border-t border-slate-100">
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Full Recommendation</p>
                    <p className={`text-sm leading-relaxed ${isUrgent ? 'text-red-800' : 'text-slate-700'}`}>{rec.recommendation}</p>
                  </div>

                  {/* Requirement 9: Monitor with RPM button on BP deprescribing recommendations */}
                  {isBpDeprescribing && (
                    <div className="mb-4 p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                          <span>📡 Remote Blood Pressure Deprescribing Surveillance</span>
                        </div>
                        <p className="text-[11px] text-indigo-700 mt-0.5">
                          Enroll the patient (if not already enrolled) and attach this taper protocol to their RPM record to observe daily readings.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isAttachedToRpm ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            ✓ Monitoring with RPM
                          </span>
                        ) : (
                          <button
                            onClick={() => handleAttachRpm(rec)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition"
                          >
                            <span>Monitor with RPM</span>
                          </button>
                        )}
                        <Link
                          to={`/dashboard/patient/${rec.patientId}?tab=rpm`}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition"
                        >
                          View RPM Tab →
                        </Link>
                      </div>
                    </div>
                  )}

                  {rec.responseNote && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Prescriber Response</p>
                      <p className="text-sm text-slate-700 italic">"{rec.responseNote}"</p>
                      <p className="text-xs text-slate-400 mt-1">— {rec.prescriber}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/dashboard/patient/${rec.patientId}`}
                        className="text-xs font-semibold text-brand-600 hover:text-brand-800"
                      >
                        Open Patient Profile →
                      </Link>
                    </div>

                    <div className="flex items-center gap-2">
                      {rec.status === 'Pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateStatus(rec.id, 'Accepted')}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition"
                          >
                            Mark Accepted
                          </button>
                          <button
                            onClick={() => updateStatus(rec.id, 'Declined')}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition"
                          >
                            Mark Declined
                          </button>
                        </div>
                      )}
                      {rec.status !== 'Pending' && (
                        <button
                          onClick={() => updateStatus(rec.id, 'Pending')}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 text-slate-600 hover:bg-slate-50 transition"
                        >
                          Reset to Pending
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
