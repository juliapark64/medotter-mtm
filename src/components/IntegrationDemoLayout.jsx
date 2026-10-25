import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'

export default function IntegrationDemoLayout() {
  const { pathname } = useLocation()
  const isOverview = pathname.replace(/\/$/, '') === '/integration-demo'
  const tabClass = ({ isActive }) => `px-3 py-2 rounded-lg text-sm font-semibold transition ${isActive ? 'bg-brand-700 text-white' : 'text-slate-600 hover:bg-brand-50 hover:text-brand-700'}`

  return (
    <>
      {!isOverview && (
        <div className="border-b border-slate-200 bg-white no-print">
          <nav aria-label="Integration demo navigation" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
            <Link to="/integration-demo" className="text-sm font-semibold text-brand-700 hover:text-brand-900">← Integration overview</Link>
            <div className="flex flex-wrap gap-2">
              <NavLink to="/integration-demo/dashboard" className={tabClass}>Pharmacist Dashboard</NavLink>
              <NavLink to="/integration-demo/patient-portal" className={tabClass}>Patient Portal</NavLink>
            </div>
          </nav>
        </div>
      )}
      <Outlet />
    </>
  )
}
