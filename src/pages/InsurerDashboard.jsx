import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts'
import stats from '../data/insurerStats.json'
import { useRpm } from '../context/RpmContext'
import { calculateAverages, getSimulatedToday } from '../lib/rpmAlerts'
import RpmBanner from '../components/RpmBanner'

export default function InsurerDashboard() {
  const { kpis, monthlyCompletion, adherenceTrend, problemTypes, topConditions } = stats
  const { enrollments, readings, allAlerts } = useRpm()

  const refDate = getSimulatedToday()

  // Format helpers
  const formatNumber = (num) => new Intl.NumberFormat('en-US').format(num)
  const formatCurrency = (num) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num)

  // ── RPM Metrics Calculations (Requirement 10) ─────────────────
  const rpmMetrics = useMemo(() => {
    const activeEnrollments = enrollments.filter(e => e.status === 'active')
    const enrolledCount = activeEnrollments.length

    // Percentage with a reading in the last 7 days
    const with7dReading = activeEnrollments.filter(e => {
      return readings.some(r => {
        if (r.patientId !== e.patientId) return false
        const diffMs = refDate - new Date(r.timestamp)
        return diffMs >= 0 && diffMs <= 7 * 24 * 60 * 60 * 1000
      })
    }).length
    const pctReading7d = enrolledCount > 0 ? Math.round((with7dReading / enrolledCount) * 100) : 0

    // Percentage at goal (30-day average <= targetSystolic & targetDiastolic)
    const atGoalCount = activeEnrollments.filter(e => {
      const patientReadings = readings.filter(r => r.patientId === e.patientId)
      const avg30 = calculateAverages(patientReadings, 30, refDate)
      return avg30 && avg30.systolic <= e.targetSystolic && avg30.diastolic <= e.targetDiastolic
    }).length
    const pctAtGoal = enrolledCount > 0 ? Math.round((atGoalCount / enrolledCount) * 100) : 0

    // Alerts per 100 patient-months
    // 3 months per enrolled patient in 90-day demo = enrolledCount * 3 patient-months
    const patientMonths = Math.max(1, enrolledCount * 3)
    const alertsPer100 = ((allAlerts.length / patientMonths) * 100).toFixed(1)

    // Plan scale projection
    const planEnrolled = 342
    const urgentAlertCount = allAlerts.filter(a => a.severity === 'urgent').length

    return {
      enrolledCount,
      planEnrolled,
      pctReading7d,
      pctAtGoal,
      alertsPer100,
      urgentAlertCount,
      totalAlerts: allAlerts.length,
      patientMonths
    }
  }, [enrollments, readings, allAlerts, refDate])

  // Simulated comparative RPM outcome data for chart
  const rpmOutcomeDistribution = [
    { category: 'Baseline (Pre-RPM)', controlled: 32, stage1: 44, stage2Urgent: 24 },
    { category: 'Month 1', controlled: 48, stage1: 36, stage2Urgent: 16 },
    { category: 'Month 2', controlled: 61, stage1: 29, stage2Urgent: 10 },
    { category: 'Current (Month 3)', controlled: rpmMetrics.pctAtGoal || 67, stage1: 26, stage2Urgent: 7 },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                </div>
                <span className="text-sm font-bold uppercase tracking-widest text-blue-400">Insurer Analytics</span>
              </div>
              <h1 className="text-3xl font-extrabold">{stats.insurer}</h1>
              <p className="text-slate-400 mt-1 text-sm">MTM & Remote Physiologic Monitoring (RPM) Outcomes · {stats.reportPeriod}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/calculator"
                id="insurer-nav-value-calculator"
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition flex items-center gap-2 shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 3h.008v.008H8.25v-.008zm0 3h.008v.008H8.25v-.008zm3-6h.008v.008H11.25v-.008zm0 3h.008v.008H11.25v-.008zm0 3h.008v.008H11.25v-.008zm3-6h.008v.008H14.25v-.008zm0 3h.008v.008H14.25v-.008zM4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15A2.25 2.25 0 002.5 6.75v10.5A2.25 2.25 0 004.5 19.5z" />
                </svg>
                Value Calculator
              </Link>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm font-semibold hover:bg-white/20 transition flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Export Report
              </button>
            </div>
          </div>

          {/* Core Plan MTM KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">MTM Completion Rate</div>
              <div className="flex items-end gap-2">
                <div className="text-3xl font-extrabold text-white">{kpis.reviewCompletionRate}%</div>
                <div className="text-sm text-slate-400 mb-1">of {formatNumber(kpis.eligibleMembers)} eligible</div>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Avg Medication Adherence</div>
              <div className="flex items-end gap-2">
                <div className="text-3xl font-extrabold text-emerald-400">{kpis.avgAdherenceRate}%</div>
                <div className="text-sm text-emerald-400/80 mb-1">↑ 4% vs last year</div>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Problems Resolved</div>
              <div className="flex items-end gap-2">
                <div className="text-3xl font-extrabold text-white">{formatNumber(kpis.medicationProblemsResolved)}</div>
              </div>
            </div>
            <div className="bg-blue-600 border border-blue-500 rounded-xl p-5 shadow-lg shadow-blue-900/20">
              <div className="text-blue-100 text-xs font-semibold uppercase tracking-wider mb-1">Est. Cost Savings</div>
              <div className="flex items-end gap-2">
                <div className="text-3xl font-extrabold text-white">{formatCurrency(kpis.estimatedCostSavings)}</div>
                <div className="text-sm text-blue-200 mb-1 font-medium">{formatCurrency(kpis.avgSavingsPerMember)}/member</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Value Calculator Banner Callout */}
        <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-blue-950/80 border border-emerald-500/30 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 3h.008v.008H8.25v-.008zm0 3h.008v.008H8.25v-.008zm3-6h.008v.008H11.25v-.008zm0 3h.008v.008H11.25v-.008zm0 3h.008v.008H11.25v-.008zm3-6h.008v.008H14.25v-.008zm0 3h.008v.008H14.25v-.008zM4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15A2.25 2.25 0 002.5 6.75v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-base">Deprescribing + RPM Budget Impact</span>
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">New Tool</span>
              </div>
              <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl">
                Can deprescribing savings offset RPM costs? Explore one-year health-plan budget impact per member per month, program costs, and savings relative to standard MTM.
              </p>
            </div>
          </div>
          <Link
            to="/calculator"
            id="insurer-cta-value-calculator"
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold tracking-wide transition shadow-md shadow-emerald-900/30 flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            Launch Calculator
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>

        {/* ── RPM Section Header + Required Banner (Requirement 10 & 11) ── */}
        <div className="space-y-4">
          <RpmBanner showThresholdNote={true} />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-widest text-teal-700">Clinical Telehealth Innovation</span>
              </div>
              <h2 className="text-2xl font-black text-slate-800 mt-1">
                Remote Blood Pressure Monitoring (RPM) Performance
              </h2>
              <p className="text-sm text-slate-500">
                Quality measures, member engagement adherence, and clinical safety telemetry under CPT 99453 / 99454 / 99457.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
                Hypertensive Cohort: <strong>1,102 Members</strong>
              </span>
            </div>
          </div>

          {/* ── 4 Dedicated RPM Metrics (Requirement 10) ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metric 1: Patients Enrolled in RPM */}
            <div className="card border-l-4 border-l-teal-500 p-5 bg-gradient-to-br from-white to-teal-50/20">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                <span>Patients Enrolled</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-teal-100 text-teal-800 font-bold">Active</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-800">
                  {rpmMetrics.enrolledCount}
                </span>
                <span className="text-sm font-semibold text-slate-500">
                  patients in cohort
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                <span className="font-semibold text-teal-700">{rpmMetrics.planEnrolled} members</span> plan-wide enrolled in continuous blood pressure surveillance.
              </p>
            </div>

            {/* Metric 2: Percentage with a reading in the last 7 days */}
            <div className="card border-l-4 border-l-blue-500 p-5 bg-gradient-to-br from-white to-blue-50/20">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                <span>Reading in Last 7 Days</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-blue-100 text-blue-800 font-bold">Transmission</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-blue-700">
                  {rpmMetrics.pctReading7d}%
                </span>
                <span className="text-xs font-semibold text-emerald-600">
                  ↑ High engagement
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                <div
                  className="h-1.5 rounded-full bg-blue-600"
                  style={{ width: `${rpmMetrics.pctReading7d}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Active members transmitting at least 1 reading weekly (CPT 99454 compliance pace).
              </p>
            </div>

            {/* Metric 3: Percentage at Goal */}
            <div className="card border-l-4 border-l-emerald-500 p-5 bg-gradient-to-br from-white to-emerald-50/20">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                <span>Percentage at Goal</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-bold">&lt;130/80</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-emerald-600">
                  {rpmMetrics.pctAtGoal}%
                </span>
                <span className="text-xs font-semibold text-emerald-700">
                  +35% vs baseline
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                <div
                  className="h-1.5 rounded-full bg-emerald-500"
                  style={{ width: `${rpmMetrics.pctAtGoal}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Enrolled cohort members maintaining 30-day average blood pressure within target goal.
              </p>
            </div>

            {/* Metric 4: Alerts per 100 patient-months */}
            <div className="card border-l-4 border-l-rose-500 p-5 bg-gradient-to-br from-white to-rose-50/20">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                <span>Alerts / 100 Pt-Months</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-rose-100 text-rose-800 font-bold">Safety Quality</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-rose-600">
                  {rpmMetrics.alertsPer100}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  alerts / 100 pt-mo
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Standardized clinical escalation frequency. {rpmMetrics.urgentAlertCount} critical hypertensive/hypotensive flags addressed.
              </p>
            </div>
          </div>

          {/* RPM Visual Insights (Outcomes & Distribution) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart: Blood Pressure Control Progression */}
            <div className="lg:col-span-2 card flex flex-col h-96">
              <div className="mb-4">
                <h3 className="text-base font-bold text-slate-800">
                  Hypertension Control Shift Across RPM Enrollment
                </h3>
                <p className="text-xs text-slate-500">
                  Percentage distribution of controlled (&lt;130/80), Stage 1, and Stage 2 / Acute BP before vs after RPM initiation.
                </p>
              </div>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rpmOutcomeDistribution} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={8} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={v => `${v}%`} domain={[0, 100]} />
                    <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="controlled" name="Controlled (<130/80)" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="stage1" name="Stage 1 Hypertension" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="stage2Urgent" name="Stage 2 / Urgent Flags" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Clinical Value / Avoided Utilization Card */}
            <div className="card flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-teal-700 uppercase tracking-widest block mb-1">
                  Economic & Safety ROI
                </span>
                <h3 className="text-lg font-extrabold text-slate-800 mb-2">
                  Avoided Acute Utilization
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  By detecting blood pressure excursions (systolic ≥180 or &lt;90) and observing medication tapers before office visits:
                </p>

                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <span className="text-slate-600">Avoided Hypertensive ER Visits</span>
                    <span className="font-extrabold text-slate-800 text-sm">~14 visits</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <span className="text-slate-600">Deprescribing Tapers Monitored</span>
                    <span className="font-extrabold text-indigo-700 text-sm">9 protocols</span>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                    <span className="text-emerald-800 font-semibold">Net RPM Cost Avoidance</span>
                    <span className="font-black text-emerald-700 text-base">$46,200</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 text-[11px] text-slate-400">
                Source: River Health Plan actuarial modeling of continuous ambulatory RPM cohorts.
              </div>
            </div>
          </div>
        </div>

        {/* Existing Charts: MTM Completion by Month & Adherence Trend */}
        <div className="pt-4 border-t border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Core MTM Program Operations</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Chart 1: MTM Completion by Month */}
            <div className="card h-96 flex flex-col">
              <div className="mb-4">
                <h3 className="text-base font-bold text-slate-800">MTM Reviews Completed</h3>
                <p className="text-xs text-slate-500">Monthly completions vs Target (150)</p>
              </div>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyCompletion} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="completed" name="Completed Reviews" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="target" name="Target" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Average Adherence Trend */}
            <div className="card h-96 flex flex-col">
              <div className="mb-4">
                <h3 className="text-base font-bold text-slate-800">Adherence Trend (PDC)</h3>
                <p className="text-xs text-slate-500">Average Proportion of Days Covered over time</p>
              </div>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={adherenceTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                    <YAxis domain={[60, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={v => `${v}%`} />
                    <RechartsTooltip cursor={{ stroke: '#cbd5e1' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Line type="monotone" dataKey="rate" name="Avg Adherence" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Problem Types (Donut) */}
            <div className="card h-96 flex flex-col">
              <div className="mb-4">
                <h3 className="text-base font-bold text-slate-800">Medication Problems Identified</h3>
                <p className="text-xs text-slate-500">Breakdown by category</p>
              </div>
              <div className="flex-1 min-h-0 flex items-center">
                <div className="w-1/2 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={problemTypes}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {problemTypes.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-1/2 pl-4">
                  <ul className="space-y-3">
                    {problemTypes.map((pt, i) => (
                      <li key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: pt.color }} />
                          <span className="text-slate-600">{pt.name}</span>
                        </div>
                        <span className="font-bold text-slate-800">{pt.value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Chart 4: Top Conditions */}
            <div className="card h-96 flex flex-col">
              <div className="mb-4">
                <h3 className="text-base font-bold text-slate-800">Top Conditions in Cohort</h3>
                <p className="text-xs text-slate-500">By number of members</p>
              </div>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topConditions} layout="vertical" margin={{ top: 0, right: 30, left: 30, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis type="category" dataKey="condition" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#475569', fontWeight: 500 }} />
                    <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="members" name="Members" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
