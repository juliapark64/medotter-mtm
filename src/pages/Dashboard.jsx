import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import patients from '../data/patients.json'
import StatusBadge from '../components/StatusBadge'
import PrescriberLog from '../components/PrescriberLog'
import RpmQueue from '../components/RpmQueue'
import { useRpm } from '../context/RpmContext'

const COLUMNS = ['Name', 'Age', 'Conditions', 'Meds', 'Last Review', 'Next Follow-up', 'Adherence', 'Status']

export default function Dashboard() {
  const navigate = useNavigate()
  const { allAlerts } = useRpm()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [sortField, setSortField] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const [activeTab, setActiveTab] = useState('patients')

  const unacknowledgedCount = allAlerts.filter(a => !a.acknowledged).length
  const urgentCount = allAlerts.filter(a => a.severity === 'urgent' && !a.acknowledged).length

  function handleSort(field) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const filtered = useMemo(() => {
    let list = [...patients]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.conditions.some(c => c.toLowerCase().includes(q))
      )
    }
    if (statusFilter !== 'All') list = list.filter(p => p.status === statusFilter)
    if (sortField) {
      list.sort((a, b) => {
        let av = a[sortField], bv = b[sortField]
        if (typeof av === 'string') av = av.toLowerCase(), bv = bv.toLowerCase()
        if (av < bv) return sortDir === 'asc' ? -1 : 1
        if (av > bv) return sortDir === 'asc' ? 1 : -1
        return 0
      })
    }
    return list
  }, [search, statusFilter, sortField, sortDir])

  const counts = {
    All: patients.length,
    Overdue: patients.filter(p => p.status === 'Overdue').length,
    'Due Soon': patients.filter(p => p.status === 'Due Soon').length,
    'On Track': patients.filter(p => p.status === 'On Track').length,
  }

  function SortIcon({ field }) {
    if (sortField !== field) return <svg className="w-3.5 h-3.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>
    return sortDir === 'asc'
      ? <svg className="w-3.5 h-3.5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg>
      : <svg className="w-3.5 h-3.5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800">Pharmacist Dashboard</h1>
              <p className="text-slate-500 mt-1 text-sm">Stone Pharmacy · River Health Plan MTM Patients</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
              <span><strong>Demo mode</strong> — all patient data is fictional</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            {[
              { label: 'Total Patients', value: counts.All, color: 'text-slate-800' },
              { label: 'Overdue', value: counts.Overdue, color: 'text-red-600' },
              { label: 'Due Soon', value: counts['Due Soon'], color: 'text-amber-600' },
              { label: 'On Track', value: counts['On Track'], color: 'text-emerald-600' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-slate-200 px-4 py-3 text-center shadow-sm">
                <div className={`text-2xl font-extrabold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('patients')}
              className={`px-5 py-4 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                activeTab === 'patients'
                  ? 'border-brand-600 text-brand-700 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              Patient List
            </button>
            <button
              onClick={() => setActiveTab('rpm')}
              className={`px-5 py-4 text-sm font-medium border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'rpm'
                  ? 'border-brand-600 text-brand-700 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>RPM Queue</span>
              {unacknowledgedCount > 0 ? (
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  urgentCount > 0 ? 'bg-rose-600 text-white animate-pulse' : 'bg-amber-500 text-white'
                }`}>
                  {unacknowledgedCount}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                  {allAlerts.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('log')}
              className={`px-5 py-4 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                activeTab === 'log'
                  ? 'border-brand-600 text-brand-700 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              Prescriber Log
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'patients' && (
          <>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-4">
          {/* Search */}
          <div className="relative w-full sm:w-80">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or condition…"
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
            />
          </div>

          {/* Status filter */}
          <div className="flex gap-2 flex-wrap">
            {['All', 'Overdue', 'Due Soon', 'On Track'].map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  statusFilter === f
                    ? 'bg-brand-700 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-brand-300'
                }`}
              >
                {f} ({counts[f] ?? 0})
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {[
                    { label: 'Name', field: 'name' },
                    { label: 'Age', field: 'age' },
                    { label: 'Conditions', field: null },
                    { label: 'Meds', field: 'medicationCount' },
                    { label: 'Last Review', field: 'lastReview' },
                    { label: 'Next Follow-up', field: 'nextFollowup' },
                    { label: 'Adherence', field: 'adherence' },
                    { label: 'Status', field: 'status' },
                  ].map(col => (
                    <th
                      key={col.label}
                      onClick={() => col.field && handleSort(col.field)}
                      className={`text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap select-none ${col.field ? 'cursor-pointer hover:text-brand-700' : ''}`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {col.field && <SortIcon field={col.field} />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400">No patients match your search.</td>
                  </tr>
                )}
                {filtered.map((p, i) => (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/integration-demo/dashboard/patient/${p.id}`)}
                    className={`border-b border-slate-100 cursor-pointer transition hover:bg-brand-50 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}
                  >
                    <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                      <span className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {p.name.split(' ').map(n => n[0]).join('')}
                        </span>
                        {p.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{p.age}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs">
                      <span className="line-clamp-2 leading-snug">{p.conditions.join(', ')}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-brand-50 text-brand-700 font-bold text-xs">{p.medicationCount}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{p.lastReview}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{p.nextFollowup}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-200 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${p.adherence >= 80 ? 'bg-emerald-500' : p.adherence >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${p.adherence}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-600">{p.adherence}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          Click any row to view the patient's full medication list and review summary.
        </p>
          </>
        )}

        {activeTab === 'rpm' && (
          <RpmQueue />
        )}

        {activeTab === 'log' && (
          <PrescriberLog />
        )}
      </div>
    </div>
  )
}
