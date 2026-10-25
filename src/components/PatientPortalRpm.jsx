import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea, ReferenceLine
} from 'recharts'
import { useRpm } from '../context/RpmContext'
import { calculateAverages, calculateGoalPercentage, getSimulatedToday } from '../lib/rpmAlerts'
import RpmBanner from './RpmBanner'

export default function PatientPortalRpm({ patientId = 'p001' }) {
  const { getEnrollment, getPatientReadings, addReading } = useRpm()
  const enrollment = getEnrollment(patientId)
  const readings = getPatientReadings(patientId)

  const [timeRange, setTimeRange] = useState('30d') // '14d', '30d', 'all'
  const [systolic, setSystolic] = useState('')
  const [diastolic, setDiastolic] = useState('')
  const [pulse, setPulse] = useState('')
  const [readingTime, setReadingTime] = useState(() => {
    const now = new Date()
    return now.toISOString().slice(0, 16)
  })
  const [readingNote, setReadingNote] = useState('')
  const [successMsg, setSuccessMsg] = useState(null)

  const targetSys = enrollment?.targetSystolic || 130
  const targetDia = enrollment?.targetDiastolic || 80
  const refDate = getSimulatedToday()

  const avg7 = useMemo(() => calculateAverages(readings, 7, refDate), [readings])
  const avg30 = useMemo(() => calculateAverages(readings, 30, refDate), [readings])
  const goalPct = useMemo(() => calculateGoalPercentage(readings, targetSys, targetDia), [readings, targetSys, targetDia])

  // Filter chart data
  const chartData = useMemo(() => {
    if (!readings || readings.length === 0) return []
    const limitDays = timeRange === '14d' ? 14 : timeRange === '30d' ? 30 : 90
    const cutoff = new Date(refDate)
    cutoff.setDate(cutoff.getDate() - limitDays)

    return readings
      .filter(r => timeRange === 'all' || new Date(r.timestamp) >= cutoff)
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

  const latestReading = readings && readings.length > 0 ? readings[readings.length - 1] : null

  // Handle manual log submit (Requirement 8: marked source "manual")
  const handleSubmitManualReading = (e) => {
    e.preventDefault()
    const sysNum = Number(systolic)
    const diaNum = Number(diastolic)
    const pulseNum = Number(pulse) || 72

    if (!sysNum || !diaNum) return

    const ts = readingTime ? new Date(readingTime).toISOString() : new Date().toISOString()

    addReading({
      patientId,
      systolic: sysNum,
      diastolic: diaNum,
      pulse: pulseNum,
      source: 'manual', // Explicitly marked as manual per Requirement 8
      timestamp: ts
    })

    setSuccessMsg(`Blood pressure reading of ${sysNum}/${diaNum} mmHg recorded with source: Manual Entry!`)
    setSystolic('')
    setDiastolic('')
    setPulse('')
    setReadingNote('')
    setTimeout(() => setSuccessMsg(null), 6000)
  }

  return (
    <div className="space-y-6">
      {/* Required Banner (Requirement 11) */}
      <RpmBanner showThresholdNote={false} />

      {/* Top Patient Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Latest Reading
          </div>
          {latestReading ? (
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-800">
                  {latestReading.systolic}/{latestReading.diastolic}
                </span>
                <span className="text-xs text-slate-500">mmHg</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                <span>Pulse {latestReading.pulse} bpm</span>
                <span>·</span>
                <span className="font-semibold text-teal-600 uppercase text-[10px]">{latestReading.source}</span>
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-400">No readings yet</div>
          )}
        </div>

        <div className="card p-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            7-Day Average
          </div>
          {avg7 ? (
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-800">
                  {avg7.systolic}/{avg7.diastolic}
                </span>
                <span className="text-xs text-slate-500">mmHg</span>
              </div>
              <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                {avg7.systolic <= targetSys && avg7.diastolic <= targetDia ? '✓ Within target' : 'Above target'}
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-400">Not enough data</div>
          )}
        </div>

        <div className="card p-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            30-Day Average
          </div>
          {avg30 ? (
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-800">
                  {avg30.systolic}/{avg30.diastolic}
                </span>
                <span className="text-xs text-slate-500">mmHg</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Target: &lt;{targetSys}/{targetDia} mmHg
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-400">Not enough data</div>
          )}
        </div>

        <div className="card p-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Readings at Goal
          </div>
          <div>
            <div className="text-2xl font-black text-teal-700">
              {goalPct}%
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1.5">
              <div
                className="h-1.5 rounded-full bg-teal-500"
                style={{ width: `${goalPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Chart & Manual Log Form (Requirement 8) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Readings Chart (2 Cols) */}
        <div className="lg:col-span-2 card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <h3 className="text-lg font-bold text-slate-800">My Blood Pressure Trends</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Target healthy range (<span className="text-emerald-700 font-semibold">&lt;{targetSys}/{targetDia} mmHg</span>) shaded in green.
              </p>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              {[
                { id: '14d', label: '14 Days' },
                { id: '30d', label: '30 Days' },
                { id: 'all', label: 'All Readings' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setTimeRange(t.id)}
                  className={`px-3 py-1 rounded-lg transition ${
                    timeRange === t.id
                      ? 'bg-white text-teal-700 font-bold shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />

                {/* Shaded Target Area */}
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

                <ReferenceLine
                  y={targetSys}
                  stroke="#059669"
                  strokeDasharray="4 4"
                  label={{ value: `Target Sys (${targetSys})`, fill: '#059669', fontSize: 10, position: 'right' }}
                />
                <ReferenceLine
                  y={targetDia}
                  stroke="#0284c7"
                  strokeDasharray="4 4"
                  label={{ value: `Target Dia (${targetDia})`, fill: '#0284c7', fontSize: 10, position: 'right' }}
                />

                <XAxis
                  dataKey="dateStr"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  dy={6}
                />
                <YAxis
                  domain={[50, 190]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />

                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload
                      return (
                        <div className="bg-slate-900 text-white rounded-xl p-3 shadow-xl text-xs space-y-1 border border-slate-700">
                          <div className="flex items-center justify-between gap-3 text-slate-400 border-b border-slate-800 pb-1">
                            <span>{d.dateStr} · {d.timeStr}</span>
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                              d.source === 'manual' ? 'bg-amber-500/20 text-amber-300' : 'bg-teal-500/20 text-teal-300'
                            }`}>
                              {d.source === 'manual' ? 'Manual Entry' : 'Connected Device'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4 font-bold text-sm">
                            <span>Blood Pressure:</span>
                            <span>{d.systolic}/{d.diastolic} mmHg</span>
                          </div>
                          <div className="text-slate-300">Pulse: {d.pulse} bpm</div>
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
                  dot={{ r: 3, fill: '#e11d48' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="diastolic"
                  stroke="#0284c7"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#0284c7' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-rose-500 rounded" />
              <span>Systolic (top number)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-sky-600 rounded" />
              <span>Diastolic (bottom number)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-2 bg-emerald-100 border border-emerald-300 rounded" />
              <span>Target Zone (&lt;{targetSys}/{targetDia})</span>
            </div>
          </div>
        </div>

        {/* Manual Log Form (Requirement 8: log a reading manually with source "manual") */}
        <div className="card">
          <div className="border-b border-slate-100 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs">
                +
              </div>
              <h3 className="font-bold text-slate-800 text-base">Log a Reading Manually</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Took your blood pressure using a home or clinic cuff? Record it here.
            </p>
          </div>

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium animate-in fade-in">
              ✓ {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmitManualReading} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Systolic (Top)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="60"
                    max="260"
                    placeholder="e.g. 122"
                    value={systolic}
                    onChange={e => setSystolic(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    required
                  />
                  <span className="absolute right-2.5 top-2 text-[11px] text-slate-400">mmHg</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Diastolic (Bottom)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="40"
                    max="150"
                    placeholder="e.g. 78"
                    value={diastolic}
                    onChange={e => setDiastolic(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    required
                  />
                  <span className="absolute right-2.5 top-2 text-[11px] text-slate-400">mmHg</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Pulse (Heart Rate)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="40"
                    max="180"
                    placeholder="e.g. 72"
                    value={pulse}
                    onChange={e => setPulse(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="absolute right-2.5 top-2 text-[11px] text-slate-400">bpm</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Measurement Time
                </label>
                <input
                  type="datetime-local"
                  value={readingTime}
                  onChange={e => setReadingTime(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Notes / Context (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Taken after morning walk, felt fine"
                value={readingNote}
                onChange={e => setReadingNote(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Requirement 8: Explicit source indicator */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
              <span>Audit Source Record:</span>
              <span className="px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-amber-100 text-amber-800 border border-amber-200">
                source: "manual"
              </span>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md shadow-teal-600/20 transition flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span>Submit Manual Reading</span>
            </button>
          </form>
        </div>
      </div>

      {/* Recent Reading History Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-800 text-base">Recent Measurement Log</h3>
            <p className="text-xs text-slate-500 mt-0.5">Chronological record of device and manual readings.</p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Total {readings.length} readings recorded
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-left">
                <th className="py-2.5 px-3">Date & Time</th>
                <th className="py-2.5 px-3">Blood Pressure</th>
                <th className="py-2.5 px-3">Pulse</th>
                <th className="py-2.5 px-3">Source Tag</th>
                <th className="py-2.5 px-3">Goal Status</th>
              </tr>
            </thead>
            <tbody>
              {[...readings].reverse().slice(0, 10).map((r, i) => {
                const atGoal = r.systolic <= targetSys && r.diastolic <= targetDia
                const d = new Date(r.timestamp)
                return (
                  <tr key={i} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                    <td className="py-2.5 px-3 font-medium text-slate-700 whitespace-nowrap">
                      {d.toLocaleDateString()} at {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2.5 px-3 font-extrabold text-slate-800">
                      {r.systolic} / {r.diastolic} <span className="font-normal text-slate-400 text-[10px]">mmHg</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {r.pulse} bpm
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        r.source === 'manual'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-teal-100 text-teal-800 border border-teal-200'
                      }`}>
                        {r.source}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {atGoal ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          At Goal
                        </span>
                      ) : (
                        <span className="text-rose-600 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          Above Target
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
