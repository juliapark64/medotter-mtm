import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useRpm } from '../context/RpmContext'
import RpmBanner from './RpmBanner'

export default function RpmQueue() {
  const {
    allAlerts,
    acknowledgeAlert,
    unacknowledgeAlert,
    thresholds,
    setThresholds
  } = useRpm()

  const [filter, setFilter] = useState('All') // 'All', 'Urgent', 'Unacknowledged', 'Acknowledged'
  const [editingThresholds, setEditingThresholds] = useState(false)
  const [tempThresholds, setTempThresholds] = useState(thresholds)
  const [pharmacistName, setPharmacistName] = useState('Dr. Alexandra Rivera, PharmD')

  // Counts
  const counts = {
    all: allAlerts.length,
    urgent: allAlerts.filter(a => a.severity === 'urgent').length,
    unacknowledged: allAlerts.filter(a => !a.acknowledged).length,
    acknowledged: allAlerts.filter(a => a.acknowledged).length,
    aboveGoal: allAlerts.filter(a => a.type === 'above-goal').length,
    missingData: allAlerts.filter(a => a.type === 'missing-data').length
  }

  // Filtered list
  const filteredAlerts = allAlerts.filter(a => {
    if (filter === 'Urgent') return a.severity === 'urgent'
    if (filter === 'Unacknowledged') return !a.acknowledged
    if (filter === 'Acknowledged') return a.acknowledged
    return true
  })

  const handleSaveThresholds = (e) => {
    e.preventDefault()
    setThresholds(tempThresholds)
    setEditingThresholds(false)
  }

  return (
    <div className="space-y-6">
      {/* Required Screen Banner (Requirement 11) */}
      <RpmBanner showThresholdNote={true} />

      {/* Header + Thresholds banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2.5">
            <span>RPM Clinical Surveillance Queue</span>
            {counts.unacknowledged > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-600 text-white animate-pulse">
                {counts.unacknowledged} Actionable
              </span>
            )}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time physiologic telemetry flags, prioritized by clinical urgency.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setTempThresholds(thresholds)
              setEditingThresholds(!editingThresholds)
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:border-brand-300 hover:text-brand-700 shadow-sm transition"
          >
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
            </svg>
            <span>{editingThresholds ? 'Hide Threshold Settings' : 'Configure Thresholds'}</span>
          </button>
        </div>
      </div>

      {/* Configurable Thresholds Drawer / Panel (Requirement 6) */}
      {editingThresholds && (
        <form onSubmit={handleSaveThresholds} className="card bg-slate-900 text-white border-slate-800 animate-in fade-in space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-sm text-white">Configurable Telemetry Thresholds</h3>
              <p className="text-xs text-amber-400 font-medium">
                Demonstration thresholds; follow your organization's protocol.
              </p>
            </div>
            <span className="text-[11px] text-slate-400">Stored locally in demonstration state</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Urgent High Systolic (≥)</label>
              <input
                type="number"
                value={tempThresholds.urgentHighSystolic}
                onChange={e => setTempThresholds({ ...tempThresholds, urgentHighSystolic: Number(e.target.value) })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-bold"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">mmHg (default 180)</span>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Urgent High Diastolic (≥)</label>
              <input
                type="number"
                value={tempThresholds.urgentHighDiastolic}
                onChange={e => setTempThresholds({ ...tempThresholds, urgentHighDiastolic: Number(e.target.value) })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-bold"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">mmHg (default 120)</span>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Urgent Low Systolic (&lt;)</label>
              <input
                type="number"
                value={tempThresholds.urgentLowSystolic}
                onChange={e => setTempThresholds({ ...tempThresholds, urgentLowSystolic: Number(e.target.value) })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-bold"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">mmHg (default 90)</span>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Missing Data Days (≥)</label>
              <input
                type="number"
                value={tempThresholds.missingDataDays}
                onChange={e => setTempThresholds({ ...tempThresholds, missingDataDays: Number(e.target.value) })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-bold"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">days (default 3)</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setEditingThresholds(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-sm"
            >
              Apply Thresholds
            </button>
          </div>
        </form>
      )}

      {/* Threshold indicator pill */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900">
        <div className="flex items-center gap-2 font-medium">
          <svg className="w-4 h-4 text-amber-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          <span className="font-bold">Active Threshold Rules:</span>
          <span>Urgent High (≥{thresholds.urgentHighSystolic}/≥{thresholds.urgentHighDiastolic})</span>
          <span>·</span>
          <span>Urgent Low (&lt;{thresholds.urgentLowSystolic})</span>
          <span>·</span>
          <span>Above Goal (7-day avg &gt; target)</span>
          <span>·</span>
          <span>Missing Data (≥{thresholds.missingDataDays} days)</span>
        </div>
        <span className="font-semibold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded text-[11px]">
          Demonstration thresholds; follow your organization's protocol.
        </span>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Alerts', value: counts.all, color: 'text-slate-800', bg: 'bg-white border-slate-200' },
          { label: 'Urgent Critical', value: counts.urgent, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' },
          { label: '7-Day Above Goal', value: counts.aboveGoal, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
          { label: 'Missing Transmissions', value: counts.missingData, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 text-center shadow-sm ${s.bg}`}>
            <div className={`text-2xl font-extrabold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-500 mt-0.5 font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex gap-2 flex-wrap">
          {[
            { id: 'All', label: `All Alerts (${counts.all})` },
            { id: 'Urgent', label: `Urgent First (${counts.urgent})` },
            { id: 'Unacknowledged', label: `Unacknowledged (${counts.unacknowledged})` },
            { id: 'Acknowledged', label: `Acknowledged (${counts.acknowledged})` },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filter === f.id
                  ? 'bg-brand-700 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-brand-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Current Reviewer Identifier */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Reviewing Pharmacist:</span>
          <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
            {pharmacistName}
          </span>
        </div>
      </div>

      {/* Alerts List (Requirement 7: sorted urgent first) */}
      <div className="space-y-3.5">
        {filteredAlerts.length === 0 && (
          <div className="card text-center py-12 text-slate-400">
            <svg className="w-12 h-12 text-slate-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-semibold text-slate-600">No alerts match the selected filter.</p>
            <p className="text-xs text-slate-400 mt-1">All RPM cohort readings are currently within designated bounds.</p>
          </div>
        )}

        {filteredAlerts.map(alert => {
          const isUrgent = alert.severity === 'urgent'

          return (
            <div
              key={alert.id}
              className={`rounded-2xl border transition shadow-sm overflow-hidden ${
                alert.acknowledged
                  ? 'border-slate-200 bg-slate-50/70 opacity-90'
                  : isUrgent
                  ? 'border-rose-300 bg-rose-50/50 hover:border-rose-400'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="p-5">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* Left: Patient & Alert Details */}
                  <div className="flex items-start gap-3.5">
                    {/* Severity Icon Indicator */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                      isUrgent
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                        : alert.type === 'above-goal'
                        ? 'bg-amber-500 text-white'
                        : 'bg-orange-500 text-white'
                    }`}>
                      {isUrgent ? (
                        <svg className="w-5 h-5 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                        </svg>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/integration-demo/dashboard/patient/${alert.patientId}?tab=rpm`}
                          className="font-extrabold text-slate-800 text-base hover:text-brand-600 transition underline-offset-2 hover:underline"
                        >
                          {alert.patientName}
                        </Link>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs text-slate-500">Age {alert.patientAge}</span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs font-mono text-slate-500">MRN: {alert.patientMrn}</span>

                        {/* Badges */}
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold tracking-wide uppercase ${alert.badgeColor}`}>
                          {alert.badge}
                        </span>

                        {alert.acknowledged && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            ✓ Acknowledged
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {alert.reading}
                        </span>
                        <span className="text-slate-400">|</span>
                        <span className="text-slate-500 font-medium">{new Date(alert.timestamp).toLocaleDateString()} at {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <p className={`text-xs leading-relaxed max-w-2xl ${isUrgent ? 'text-rose-950 font-medium' : 'text-slate-600'}`}>
                        {alert.description}
                      </p>

                      <div className="pt-1 flex items-center gap-2 text-[11px] text-slate-400">
                        <span className="font-semibold text-slate-500">Threshold Rule:</span>
                        <span>{alert.thresholdLabel}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions & Acknowledgment Details (Requirement 7) */}
                  <div className="flex flex-col sm:items-end justify-between gap-3 shrink-0 self-stretch sm:self-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/integration-demo/dashboard/patient/${alert.patientId}?tab=rpm`}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
                      >
                        Review RPM →
                      </Link>

                      {/* Acknowledge Button */}
                      {!alert.acknowledged ? (
                        <button
                          onClick={() => acknowledgeAlert(alert.id, pharmacistName)}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm transition flex items-center gap-1.5 ${
                            isUrgent ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20' : 'bg-brand-600 hover:bg-brand-700 shadow-brand-600/20'
                          }`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          <span>Acknowledge</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => unacknowledgeAlert(alert.id)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-700 border border-slate-200 hover:bg-slate-100 transition"
                          title="Undo Acknowledgment"
                        >
                          Undo
                        </button>
                      )}
                    </div>

                    {/* Acknowledgment metadata (Requirement 7: records who acknowledged it and when) */}
                    {alert.acknowledged && (
                      <div className="text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 text-right">
                        <div className="font-semibold">✓ Acknowledged by: {alert.acknowledgedBy}</div>
                        <div className="text-emerald-700 text-[10px]">{alert.acknowledgedAt}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
