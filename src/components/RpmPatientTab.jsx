import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea, ReferenceLine
} from 'recharts'
import { useRpm } from '../context/RpmContext'
import { calculateAverages, calculateGoalPercentage, calculateDaysWithReadingsThisMonth, getSimulatedToday } from '../lib/rpmAlerts'
import RpmBanner from './RpmBanner'

export default function RpmPatientTab({ patient, onOpenEnrollment }) {
  const {
    getEnrollment,
    getPatientReadings,
    logPharmacistReview,
    updateEnrollmentStatus
  } = useRpm()

  const enrollment = getEnrollment(patient.id)
  const readings = getPatientReadings(patient.id)

  const [timeRange, setTimeRange] = useState('30d') // '14d', '30d', '90d'
  const [reviewMinutes, setReviewMinutes] = useState(20)
  const [reviewNote, setReviewNote] = useState('')
  const [sendToPrescriber, setSendToPrescriber] = useState(false)
  const [prescriberName, setPrescriberName] = useState('Dr. Chen')
  const [recommendationText, setRecommendationText] = useState('')
  const [reviewSuccess, setReviewSuccess] = useState(false)

  const refDate = getSimulatedToday()

  // Computed metrics
  const avg7 = useMemo(() => calculateAverages(readings, 7, refDate), [readings])
  const avg30 = useMemo(() => calculateAverages(readings, 30, refDate), [readings])
  const targetSys = enrollment?.targetSystolic || 130
  const targetDia = enrollment?.targetDiastolic || 80
  const goalPercentage = useMemo(() => calculateGoalPercentage(readings, targetSys, targetDia), [readings, targetSys, targetDia])
  const daysThisMonth = useMemo(() => calculateDaysWithReadingsThisMonth(readings, 2026, 9), [readings])

  // Filter readings for chart based on selected time range
  const chartData = useMemo(() => {
    if (!readings || readings.length === 0) return []
    const daysLimit = timeRange === '14d' ? 14 : timeRange === '30d' ? 30 : 90
    const cutoff = new Date(refDate)
    cutoff.setDate(cutoff.getDate() - daysLimit)

    return readings
      .filter(r => new Date(r.timestamp) >= cutoff)
      .map(r => {
        const d = new Date(r.timestamp)
        return {
          ...r,
          dateStr: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          timeStr: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          rawDate: d,
          isAtGoal: r.systolic <= targetSys && r.diastolic <= targetDia
        }
      })
      .sort((a, b) => a.rawDate - b.rawDate)
  }, [readings, timeRange, targetSys, targetDia])

  // Latest reading
  const latestReading = readings && readings.length > 0 ? readings[readings.length - 1] : null

  // Handle logging review
  const handleSaveReview = (e) => {
    e.preventDefault()
    if (!enrollment) return

    logPharmacistReview(patient.id, {
      minutes: Number(reviewMinutes) || 20,
      note: reviewNote.trim() || `Monthly RPM review completed for ${patient.name}. Blood pressure evaluated.`,
      pharmacist: 'Dr. Alexandra Rivera, PharmD',
      recommendation: sendToPrescriber ? recommendationText : null,
      prescriber: prescriberName
    })

    setReviewSuccess(true)
    setReviewNote('')
    setRecommendationText('')
    setSendToPrescriber(false)
    setTimeout(() => setReviewSuccess(false), 5000)
  }

  // If not enrolled
  if (!enrollment) {
    return (
      <div className="space-y-6">
        <RpmBanner showThresholdNote={true} />

        <div className="card text-center py-14 px-6 border-dashed border-2 border-slate-300">
          <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Patient Not Enrolled in RPM</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
            {patient.name} has a diagnosis of {patient.conditions.includes('Hypertension') ? 'Hypertension' : 'cardiovascular risk'} and is eligible for Remote Physiologic Monitoring (CPT 99453 / 99454 / 99457).
          </p>
          <button
            onClick={onOpenEnrollment}
            className="btn-primary"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Enroll in RPM
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Required Banner */}
      <RpmBanner showThresholdNote={true} />

      {/* Linked Deprescribing Taper Monitor (Requirement 9) */}
      {enrollment.attachedRecommendations && enrollment.attachedRecommendations.length > 0 && (
        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50/90 via-purple-50/50 to-blue-50/80 p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-indigo-600 animate-pulse" />
              <h4 className="text-sm font-bold text-indigo-900 uppercase tracking-wide">
                Active Medication Taper Monitoring (Deprescribing Link)
              </h4>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
              Protocol Active · Close BP Surveillance
            </span>
          </div>
          <p className="text-xs text-indigo-800 leading-relaxed mb-3">
            This patient is currently undergoing a blood pressure medication deprescribing trial. Readings are being actively monitored through RPM to detect any rebound hypertension or withdrawal effects.
          </p>
          <div className="space-y-2">
            {enrollment.attachedRecommendations.map((rec, idx) => (
              <div key={idx} className="bg-white/90 rounded-xl p-3 border border-indigo-100 text-xs">
                <div className="flex items-center justify-between font-semibold text-indigo-950 mb-1">
                  <span>💊 {rec.medicationName || 'Blood Pressure Medication'} Taper Protocol</span>
                  <span className="text-indigo-500 font-normal">{rec.dateAttached || 'Active'}</span>
                </div>
                <p className="text-slate-700">{rec.recommendationText || rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enrollment Status & Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center font-bold text-sm">
            BP
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-slate-800 text-base">Remote Blood Pressure Telemetry</h3>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                enrollment.status === 'active' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-700'
              }`}>
                {enrollment.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Device: <span className="font-mono font-semibold text-slate-700">{enrollment.deviceSerial}</span> · Enrolled: {enrollment.enrolledDate}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={enrollment.status}
            onChange={e => updateEnrollmentStatus(patient.id, e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400"
          >
            <option value="active">Status: Active</option>
            <option value="paused">Status: Paused</option>
            <option value="discontinued">Status: Discontinued</option>
          </select>
          <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
            Target: &lt;{targetSys}/{targetDia} mmHg
          </span>
        </div>
      </div>

      {/* 4 Summary Stat Cards (Requirement 4) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 7-Day Average */}
        <div className="card p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <span>7-Day Average</span>
            <span className="text-[10px] text-slate-400">({avg7 ? `${avg7.count} rds` : '0 rds'})</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-slate-800">
              {avg7 ? `${avg7.systolic}/${avg7.diastolic}` : '—'}
            </span>
            <span className="text-xs text-slate-500">mmHg</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {avg7 ? (
              avg7.systolic <= targetSys && avg7.diastolic <= targetDia ? (
                <span className="text-emerald-600 font-semibold">✓ At goal (&lt;{targetSys}/{targetDia})</span>
              ) : (
                <span className="text-amber-600 font-semibold">⚠ Above goal (+{Math.max(0, avg7.systolic - targetSys)} sys)</span>
              )
            ) : 'Insufficient readings'}
          </p>
        </div>

        {/* 30-Day Average */}
        <div className="card p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <span>30-Day Average</span>
            <span className="text-[10px] text-slate-400">({avg30 ? `${avg30.count} rds` : '0 rds'})</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-slate-800">
              {avg30 ? `${avg30.systolic}/${avg30.diastolic}` : '—'}
            </span>
            <span className="text-xs text-slate-500">mmHg</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {avg30 ? `Pulse avg: ${avg30.pulse} bpm` : 'Insufficient readings'}
          </p>
        </div>

        {/* % of Readings at Goal */}
        <div className="card p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <span>Readings at Goal</span>
            <span className="text-[10px] text-emerald-600 font-bold">&lt;{targetSys}/{targetDia}</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-extrabold ${goalPercentage >= 75 ? 'text-emerald-600' : goalPercentage >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
              {goalPercentage}%
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
            <div
              className={`h-1.5 rounded-full ${goalPercentage >= 75 ? 'bg-emerald-500' : goalPercentage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${goalPercentage}%` }}
            />
          </div>
        </div>

        {/* Days with a Reading this Month (Oct 2026) */}
        <div className="card p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <span>Transmission Days</span>
            <span className="text-[10px] text-slate-400">This Month</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-brand-700">
              {daysThisMonth}
            </span>
            <span className="text-xs text-slate-500">/ 10 days</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {daysThisMonth >= 8 ? (
              <span className="text-emerald-600 font-semibold">✓ Meets CPT 99454 pace (≥16/mo)</span>
            ) : (
              <span className="text-amber-600 font-medium">{16 - daysThisMonth} more days needed</span>
            )}
          </p>
        </div>
      </div>

      {/* Line Chart (Requirement 4) */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Blood Pressure Longitudinal Trends</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Target therapeutic range (<span className="text-emerald-700 font-bold">&lt;{targetSys}/{targetDia} mmHg</span>) shaded in green zone.
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {[
              { id: '14d', label: '14 Days' },
              { id: '30d', label: '30 Days' },
              { id: '90d', label: '90 Days' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setTimeRange(tab.id)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  timeRange === tab.id
                    ? 'bg-white text-brand-700 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-5 text-xs text-slate-600 mb-4 px-2">
          <div className="flex items-center gap-2">
            <span className="w-3 h-1 bg-rose-500 rounded" />
            <span className="font-semibold text-slate-700">Systolic (mmHg)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-1 bg-sky-600 rounded" />
            <span className="font-semibold text-slate-700">Diastolic (mmHg)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3 bg-emerald-100 border border-emerald-300 rounded" />
            <span className="text-emerald-800 font-medium">Target Range (&lt;{targetSys} / &lt;{targetDia})</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <span>● Device Reading</span>
            <span>○ Manual Entry</span>
          </div>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              
              {/* Shaded Target Range (Requirement 4) */}
              <ReferenceArea
                y1={0}
                y2={targetDia}
                fill="#10b981"
                fillOpacity={0.08}
              />
              <ReferenceArea
                y1={targetDia}
                y2={targetSys}
                fill="#10b981"
                fillOpacity={0.05}
              />

              {/* Target lines */}
              <ReferenceLine
                y={targetSys}
                stroke="#059669"
                strokeDasharray="4 4"
                label={{ value: `Goal Sys (${targetSys})`, fill: '#059669', fontSize: 10, position: 'right' }}
              />
              <ReferenceLine
                y={targetDia}
                stroke="#0284c7"
                strokeDasharray="4 4"
                label={{ value: `Goal Dia (${targetDia})`, fill: '#0284c7', fontSize: 10, position: 'right' }}
              />

              <XAxis
                dataKey="dateStr"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#64748b' }}
                dy={8}
              />
              <YAxis
                domain={[50, 200]}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#64748b' }}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <div className="bg-slate-900 text-white rounded-xl p-3 shadow-xl text-xs space-y-1.5 border border-slate-700">
                        <div className="flex items-center justify-between gap-3 text-slate-400 border-b border-slate-700/80 pb-1">
                          <span>{data.dateStr} · {data.timeStr}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                            data.source === 'manual' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          }`}>
                            {data.source}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-slate-300">Blood Pressure:</span>
                          <span className="font-extrabold text-white text-sm">
                            {data.systolic}/{data.diastolic} <span className="text-[10px] text-slate-400 font-normal">mmHg</span>
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-slate-300">Pulse:</span>
                          <span className="font-semibold text-slate-200">{data.pulse} bpm</span>
                        </div>
                        <div className="pt-1 text-[11px]">
                          {data.isAtGoal ? (
                            <span className="text-emerald-400 font-semibold">✓ Meets target (&lt;{targetSys}/{targetDia})</span>
                          ) : (
                            <span className="text-rose-400 font-semibold">⚠ Above target</span>
                          )}
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />

              <Line
                type="monotone"
                dataKey="systolic"
                stroke="#e11d48"
                strokeWidth={2.5}
                dot={(props) => {
                  const { cx, cy, payload } = props
                  const isManual = payload.source === 'manual'
                  return (
                    <circle
                      key={`sys-${payload.timestamp}`}
                      cx={cx}
                      cy={cy}
                      r={isManual ? 4 : 3}
                      fill={isManual ? '#ffffff' : '#e11d48'}
                      stroke="#e11d48"
                      strokeWidth={isManual ? 2.5 : 1}
                    />
                  )
                }}
                activeDot={{ r: 6, fill: '#e11d48' }}
              />

              <Line
                type="monotone"
                dataKey="diastolic"
                stroke="#0284c7"
                strokeWidth={2.5}
                dot={(props) => {
                  const { cx, cy, payload } = props
                  const isManual = payload.source === 'manual'
                  return (
                    <circle
                      key={`dia-${payload.timestamp}`}
                      cx={cx}
                      cy={cy}
                      r={isManual ? 4 : 3}
                      fill={isManual ? '#ffffff' : '#0284c7'}
                      stroke="#0284c7"
                      strokeWidth={isManual ? 2.5 : 1}
                    />
                  )
                }}
                activeDot={{ r: 6, fill: '#0284c7' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pharmacist Monthly Review & Prescriber Communication (Requirement 5) */}
      <div className="card">
        <div className="border-b border-slate-100 pb-4 mb-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Pharmacist RPM Monthly Clinical Review</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Log clinical management time (CPT 99457 / 99458), document patient notes, and transmit recommendations to the prescriber.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200">
              Dr. Alexandra Rivera, PharmD
            </span>
          </div>
        </div>

        {reviewSuccess && (
          <div className="mb-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
            <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-semibold">Review logged successfully!</span>
            {sendToPrescriber && <span>Recommendation transmitted to the Prescriber Communication Log.</span>}
          </div>
        )}

        <form onSubmit={handleSaveReview} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Minutes spent */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Time Spent this Month (Minutes)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="5"
                  max="180"
                  value={reviewMinutes}
                  onChange={e => setReviewMinutes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  required
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">min</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">CPT 99457 requires ≥20 minutes of clinical review time.</p>
            </div>

            {/* Prescriber Recipient */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Primary Prescriber
              </label>
              <select
                value={prescriberName}
                onChange={e => setPrescriberName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              >
                <option value="Dr. Chen">Dr. Chen (Internal Medicine)</option>
                <option value="Dr. Patel">Dr. Patel (Cardiology)</option>
                <option value="Dr. Singh">Dr. Singh (Primary Care)</option>
                <option value="Dr. Russo">Dr. Russo (Pulmonology)</option>
                <option value="Dr. Huang">Dr. Huang (Nephrology)</option>
              </select>
            </div>
          </div>

          {/* Pharmacist Review Note */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Pharmacist Clinical Note
            </label>
            <textarea
              rows={3}
              value={reviewNote}
              onChange={e => setReviewNote(e.target.value)}
              placeholder="e.g. Reviewed 30-day BP telemetry with patient. Overall systolic trending down nicely. Patient reported taking Lisinopril consistently with breakfast. Discussed mild dizziness when standing quickly."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none font-sans"
            />
          </div>

          {/* Prescriber Transmission Toggle (Requirement 5) */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={sendToPrescriber}
                onChange={e => setSendToPrescriber(e.target.checked)}
                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300"
              />
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  Send Recommendation to Prescriber via Prescriber Communication Log
                </span>
                <span className="text-[11px] text-slate-500">
                  Transmits an actionable clinical proposal directly to {prescriberName} for formal electronic sign-off.
                </span>
              </div>
            </label>

            {sendToPrescriber && (
              <div className="pt-2 border-t border-blue-200/60 space-y-2 animate-in fade-in">
                <span className="block text-xs font-semibold text-slate-700">
                  Prescriber Recommendation Message:
                </span>
                <textarea
                  rows={2}
                  value={recommendationText}
                  onChange={e => setRecommendationText(e.target.value)}
                  placeholder="e.g. 30-day RPM average is 122/76 mmHg. Patient well-controlled. Consider initiating step-down taper of Amlodipine from 10mg to 5mg daily, continuing daily RPM surveillance."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                  required={sendToPrescriber}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="btn-primary"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Log RPM Review & Transmit
            </button>
          </div>
        </form>

        {/* Prior Review History */}
        {enrollment.reviewLogs && enrollment.reviewLogs.length > 0 && (
          <div className="mt-6 pt-5 border-t border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              RPM Review History ({enrollment.reviewLogs.length} logged sessions)
            </h4>
            <div className="space-y-2.5">
              {enrollment.reviewLogs.map(log => (
                <div key={log.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center justify-between font-semibold text-slate-800 mb-1">
                    <span className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-brand-100 text-brand-800 text-[10px] font-bold">
                        {log.minutes} mins
                      </span>
                      <span>{log.date}</span>
                    </span>
                    <span className="text-slate-400 text-[11px]">{log.pharmacist}</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">{log.note}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
