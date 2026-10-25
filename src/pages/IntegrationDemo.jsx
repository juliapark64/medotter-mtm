import { Link } from 'react-router-dom'

const WORKFLOW = ['Medication review', 'RPM offer & setup', 'Home BP readings', 'Pharmacist follow-up']

function DashboardIcon() {
  return (
    <svg aria-hidden="true" className="w-11 h-11" fill="none" viewBox="0 0 32 32" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="16" cy="8" r="5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 29v-4a11 11 0 0122 0v4H5zm11-14v8m-4-7 4 5 4-5m2 7v4m-2-2h4" />
    </svg>
  )
}

function PortalIcon() {
  return (
    <svg aria-hidden="true" className="w-11 h-11" fill="none" viewBox="0 0 32 32" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3" y="4" width="26" height="19" rx="2" />
      <path strokeLinecap="round" d="M16 23v5m-6 0h12" />
    </svg>
  )
}

const DESTINATIONS = [
  { title: 'Pharmacist Dashboard', description: 'Review medications, monitor BP trends, and document follow-up.', to: '/integration-demo/dashboard', action: 'Open Dashboard', Icon: DashboardIcon },
  { title: 'Patient Portal', description: 'Enter home BP readings and explore the patient experience.', to: '/integration-demo/patient-portal', action: 'Open Patient Portal', Icon: PortalIcon },
]

export default function IntegrationDemo() {
  return (
    <div className="bg-white">
      <section className="relative bg-gradient-to-br from-brand-800 via-brand-700 to-teal-600 text-white overflow-hidden">
        <div aria-hidden="true" className="absolute -top-40 -right-20 w-96 h-96 bg-white/5 rounded-full" />
        <div aria-hidden="true" className="absolute -bottom-16 -left-24 w-64 h-64 bg-white/5 rounded-full" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16 lg:py-20">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest bg-white/10 px-3 py-1.5 rounded-full mb-5">
            <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-teal-300" />
            MTM + RPM Demo
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight mb-5">
            See how the<br /><span className="text-teal-300">integration</span> works.
          </h1>
          <p className="max-w-2xl text-lg sm:text-xl text-blue-100 leading-relaxed">
            Follow the pharmacist and patient experience from medication review to remote blood pressure monitoring.
          </p>
        </div>
      </section>

      <section aria-labelledby="workflow-heading" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10 pb-12">
        <h2 id="workflow-heading" className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-5">Illustrative care workflow</h2>
        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6 mb-9">
          {WORKFLOW.map((step, index) => (
            <li key={step} className="flex items-center gap-3 relative">
              <span className="flex items-center justify-center shrink-0 w-11 h-11 sm:w-12 sm:h-12 bg-brand-50 text-brand-700 text-xl font-bold rounded-full">{index + 1}</span>
              <span className="text-sm font-semibold text-brand-800">{step}</span>
              {index < WORKFLOW.length - 1 && <span aria-hidden="true" className="hidden xl:block ml-auto w-7 h-px bg-slate-300 shrink-0" />}
            </li>
          ))}
        </ol>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {DESTINATIONS.map(({ title, description, to, action, Icon }) => (
            <article key={to} className="rounded-2xl border border-brand-200 bg-white shadow-sm p-6 sm:p-8 flex flex-col">
              <div className="flex items-start gap-5 mb-7">
                <div className="w-16 h-16 shrink-0 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center"><Icon /></div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-brand-900 mb-2">{title}</h2>
                  <p className="text-slate-500 leading-relaxed">{description}</p>
                </div>
              </div>
              <Link to={to} className="btn-primary justify-center mt-auto sm:self-start sm:min-w-60">{action}</Link>
            </article>
          ))}
        </div>
        <div className="text-center mt-7">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-900">
            <span aria-hidden="true">←</span> Back to Home
          </Link>
        </div>
      </section>
    </div>
  )
}
