import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/simulation', label: 'Simulation' },
  { to: '/insurer', label: 'Insurer' },
  { to: '/calculator', label: 'Value Calculator' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => {
    setOpen(false)
  }, [pathname])
  const linkClass = ({ isActive }) =>
    `text-sm font-medium transition ${isActive ? 'text-brand-700 font-bold' : 'text-slate-600 hover:text-brand-700'}`
  const demoClass = ({ isActive }) =>
    `btn-primary justify-center ${isActive ? 'bg-brand-800' : ''}`

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between md:justify-end h-16">
          <NavLink to="/" className={({ isActive }) => `${linkClass({ isActive })} md:hidden`} end>Home</NavLink>
          <nav aria-label="Main navigation" className="hidden md:flex items-center gap-7">
            {LINKS.map(link => <NavLink key={link.to} to={link.to} end={link.end} className={linkClass}>{link.label}</NavLink>)}
            <NavLink to="/integration-demo" className={demoClass}>MTM + RPM Demo</NavLink>
          </nav>
          <button
            type="button"
            className="md:hidden p-2 rounded-md text-slate-600 hover:text-brand-700 hover:bg-slate-100"
            onClick={() => setOpen(value => !value)}
            aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={open}
            aria-controls="mobile-navigation"
          >
            <svg aria-hidden="true" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d={open ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
            </svg>
          </button>
        </div>
        {open && (
          <nav id="mobile-navigation" aria-label="Mobile navigation" className="md:hidden pb-4 flex flex-col items-start gap-4">
            {LINKS.map(link => <NavLink key={link.to} to={link.to} end={link.end} className={linkClass} onClick={() => setOpen(false)}>{link.label}</NavLink>)}
            <NavLink to="/integration-demo" className={demoClass} onClick={() => setOpen(false)}>MTM + RPM Demo</NavLink>
          </nav>
        )}
      </div>
    </header>
  )
}
