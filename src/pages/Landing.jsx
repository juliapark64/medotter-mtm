import { Link } from 'react-router-dom'

const STUDY_QUESTIONS = [
  {
    step: '01',
    title: 'Compare RPM delivery',
    desc: 'For the same RPM patients, how do physician-delivered and pharmacist-delivered services differ in staffing cost?',
  },
  {
    step: '02',
    title: 'Support deprescribing',
    desc: 'A separate clinical scenario explores pharmacist medication review and short-term deprescribing outcomes.',
  },
  {
    step: '03',
    title: 'Estimate staffing needs',
    desc: 'What physician, nurse, assistant, pharmacist, and technician time would the two care pathways require?',
  },
  {
    step: '04',
    title: 'Compare program margins',
    desc: 'Show each delivery model’s revenue, costs and margin, then estimate the financial impact of switching.',
  },
]

const PATHWAYS = [
  {
    title: 'Physician-delivered RPM',
    description: 'Physicians provide clinical RPM with medical-assistant support. A nurse-supported workflow is available as a sensitivity.',
    steps: ['Common enrolled RPM cohort', 'Assistant onboarding and coordination', 'Physician clinical monitoring and follow-up', 'Complete physician-program budget'],
  },
  {
    title: 'Pharmacist-delivered RPM',
    description: 'Pharmacists take over clinical RPM with technician support. Required physician oversight is costed separately.',
    steps: ['The same patients and service months', 'Pharmacist and technician onboarding', 'Pharmacist clinical monitoring and follow-up', 'Complete pharmacist-program budget'],
  },
]

export default function Landing() {
  return (
    <div>
      <section className="relative bg-gradient-to-br from-brand-800 via-brand-700 to-teal-700 text-white overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/5 rounded-full" aria-hidden="true" />
        <div className="absolute -bottom-16 -left-16 w-72 h-72 bg-white/5 rounded-full" aria-hidden="true" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-300" aria-hidden="true" />
              MTM + RPM Research
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight mb-6">
              MTM + RPM.
              <span className="block"><span className="text-teal-300">Studied</span> Together.</span>
            </h1>
            <p className="text-lg md:text-xl text-blue-100 mb-10 leading-relaxed max-w-xl">
              Explore the financial impact of pharmacists taking over remote blood pressure monitoring in a clinic serving Original Medicare patients.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/integration-demo" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-brand-700 font-bold text-base hover:bg-blue-50 transition shadow-lg">
                Explore MTM + RPM
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              <Link to="/calculator" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border-2 border-white/50 text-white font-semibold text-base hover:bg-white/10 transition">
                Open Study Calculator
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white border-b border-slate-200" aria-label="Study at a glance">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: 'Same Patients', label: 'Two independent delivery budgets' },
              { value: '12 Months', label: 'Budget horizon' },
              { value: 'MTM + RPM', label: 'Integrated care workflow' },
              { value: 'Modeled Results', label: 'Literature-informed scenarios' },
            ].map(item => (
              <div key={item.value}>
                <div className="text-2xl md:text-3xl font-extrabold text-brand-700">{item.value}</div>
                <div className="text-sm text-slate-500 mt-1">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-slate-50" id="study-overview">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="section-title">The Questions Behind the Study</h2>
            <p className="section-sub">
              A planned study of physician-delivered versus pharmacist-delivered RPM, with deprescribing and recruitment explored separately.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STUDY_QUESTIONS.map(question => (
              <div key={question.step} className="card flex flex-col gap-4 hover:shadow-md transition">
                <span className="w-12 h-12 rounded-xl bg-brand-700 text-white flex items-center justify-center font-bold text-lg">{question.step}</span>
                <h3 className="font-bold text-slate-800 text-lg">{question.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{question.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-white" id="study-pathways">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="section-title">Same Patients. Two Ways to Deliver RPM.</h2>
            <p className="section-sub">
              Match enrollment, monitoring months, reimbursement and technology costs. Compare each team’s own work and spending. The pharmacist program does not carry forward the physician program’s delivery budget.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PATHWAYS.map((pathway, index) => (
              <div key={pathway.title} className={['card border-t-4', index === 0 ? 'border-brand-600' : 'border-teal-600'].join(' ')}>
                <h3 className="font-bold text-slate-800 text-xl mb-2">{pathway.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-6">{pathway.description}</p>
                <ol className="space-y-3">
                  {pathway.steps.map((step, stepIndex) => (
                    <li key={step} className="flex items-center gap-3 text-sm text-slate-700">
                      <span className={['flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold', index === 0 ? 'bg-brand-50 text-brand-700' : 'bg-teal-50 text-teal-700'].join(' ')} aria-hidden="true">{stepIndex + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-2xl bg-brand-50 border border-brand-200 p-6">
            <h3 className="font-bold text-brand-800 mb-2">Explore the current tools</h3>
            <p className="text-sm text-brand-800 leading-relaxed">
              The calculator and interactive microsimulation share one model. Follow each synthetic patient through both delivery teams and inspect their tasks, costs and collections. Literature informs selected inputs; workload and other unmeasured quantities remain explicit assumptions. No study patient data have been collected.
            </p>
            <Link to="/simulation" className="btn-primary inline-flex mt-5">Explore the Microsimulation →</Link>
          </div>
        </div>
      </section>

      <section className="py-20 bg-slate-50" id="integration-demo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-gradient-to-br from-brand-800 via-brand-700 to-teal-700 px-6 py-12 md:p-12 text-white flex flex-col md:flex-row items-start md:items-center gap-8">
            <div className="flex-1">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">MTM + RPM Integration Demo</h2>
              <p className="text-blue-100 leading-relaxed max-w-2xl">
                See how medication review, blood pressure readings, and follow-up fit into a shared workflow. Explore the demonstration with fictional patient information.
              </p>
            </div>
            <Link to="/integration-demo" className="shrink-0 inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white text-brand-700 font-bold hover:bg-blue-50 transition shadow-lg">
              Explore MTM + RPM
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
