import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useRpm } from '../context/RpmContext'

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const { allAlerts } = useRpm()
  const unacknowledgedCount = allAlerts.filter(a => !a.acknowledged).length

  const linkClass = ({ isActive }) =>
    `text-sm font-medium transition ${isActive ? 'text-brand-700 font-bold' : 'text-slate-600 hover:text-brand-700'}`

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-brand-700 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-lg font-bold text-slate-800">MedOtter <span className="text-brand-700">MTM</span></span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            <NavLink to="/" className={linkClass} end>Home</NavLink>
            <NavLink to="/eligibility" className={linkClass}>Check Eligibility</NavLink>
            <NavLink to="/dashboard" className={linkClass}>
              <span className="flex items-center gap-1.5">
                <span>Dashboard</span>
                {unacknowledgedCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-600 text-white">
                    {unacknowledgedCount}
                  </span>
                )}
              </span>
            </NavLink>
            <NavLink to="/portal" className={linkClass}>Patient Portal</NavLink>
            <NavLink to="/insurer" className={linkClass}>Insurer</NavLink>
            <NavLink to="/calculator" className={linkClass}>Value Calculator</NavLink>
          </nav>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/eligibility" className="btn-primary text-xs px-4 py-2">
              Am I Eligible?
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-md text-slate-600 hover:text-brand-700 hover:bg-slate-100"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden pb-4 flex flex-col gap-3">
            <NavLink to="/" className={linkClass} end onClick={() => setOpen(false)}>Home</NavLink>
            <NavLink to="/eligibility" className={linkClass} onClick={() => setOpen(false)}>Check Eligibility</NavLink>
            <NavLink to="/dashboard" className={linkClass} onClick={() => setOpen(false)}>Dashboard</NavLink>
            <NavLink to="/portal" className={linkClass} onClick={() => setOpen(false)}>Patient Portal</NavLink>
            <NavLink to="/insurer" className={linkClass} onClick={() => setOpen(false)}>Insurer</NavLink>
            <NavLink to="/calculator" className={linkClass} onClick={() => setOpen(false)}>Value Calculator</NavLink>
            <Link to="/eligibility" className="btn-primary self-start" onClick={() => setOpen(false)}>
              Am I Eligible?
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
