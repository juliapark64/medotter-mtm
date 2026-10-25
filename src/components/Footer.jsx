import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-slate-800 text-slate-300 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <div className="text-white font-bold mb-3">MTM + RPM Research</div>
            <p className="text-sm leading-relaxed text-slate-400">
              Exploring medication therapy management, remote blood pressure monitoring, and the resources needed to connect them.
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider">Explore</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-white transition">Home</Link></li>
              <li><Link to="/simulation" className="hover:text-white transition">Recruitment Simulation</Link></li>
              <li><Link to="/insurer" className="hover:text-white transition">Insurer</Link></li>
              <li><Link to="/calculator" className="hover:text-white transition">Value Calculator</Link></li>
              <li><Link to="/integration-demo" className="hover:text-white transition">MTM + RPM Demo</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider">Research Context</h3>
            <p className="text-sm leading-relaxed text-slate-400">
              Model outputs reflect literature-informed scenarios and explicit assumptions. Workflow demonstrations use fictional information; they are not study observations or clinical services.
            </p>
          </div>
        </div>

        <div className="border-t border-slate-700 mt-10 pt-6 text-center text-xs text-slate-400">
          © 2026 MTM + RPM Research · Research and educational demonstration
        </div>
      </div>
    </footer>
  )
}
