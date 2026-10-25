import { useState } from 'react'
import { Link } from 'react-router-dom'

const STEPS = [
  {
    step: '01',
    title: 'Check Eligibility',
    desc: 'Answer a few quick questions about your health conditions and medications to see if you qualify for MTM services under River Health Plan.',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    step: '02',
    title: 'Book a Review',
    desc: 'Schedule a convenient appointment — by phone, video, or in-person at Stone Pharmacy — at no extra cost to you.',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
  },
  {
    step: '03',
    title: 'Meet Your Pharmacist',
    desc: 'Have a private, one-on-one session with a Stone Pharmacy pharmacist who reviews every medication you take.',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
  {
    step: '04',
    title: 'Get Your Medication Plan',
    desc: 'Receive a personalized written plan summarizing your medications, action items, and recommendations — yours to keep.',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
]

const QUALIFY = [
  {
    label: 'Multiple Chronic Conditions',
    detail: 'You have 3 or more chronic health conditions such as diabetes, high blood pressure, heart failure, asthma, or others.',
    icon: '🫀',
  },
  {
    label: 'Multiple Medications',
    detail: 'You take 8 or more medications to manage your conditions (maintenance medications).',
    icon: '💊',
  },
  {
    label: 'Annual Drug Costs',
    detail: 'Your estimated yearly spending on prescriptions is $1,276 or more.',
    icon: '💰',
  },
]

export default function Landing() {
  const [contactDemoSubmitted, setContactDemoSubmitted] = useState(false)

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-brand-800 via-brand-700 to-teal-700 text-white overflow-hidden">
        {/* decorative circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/5 rounded-full" />
        <div className="absolute -bottom-16 -left-16 w-72 h-72 bg-white/5 rounded-full" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-300 animate-pulse" />
              Stone Pharmacy · River Health Plan
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight mb-6">
              Your Medications.{' '}
              <span className="text-teal-300">Managed.</span>{' '}
              Together.
            </h1>
            <p className="text-lg md:text-xl text-blue-100 mb-10 leading-relaxed max-w-xl">
              Medication Therapy Management (MTM) is a free, personalized service for eligible River Health Plan members. Our pharmacists work with you to make sure every medication is safe, effective, and affordable.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/eligibility" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-brand-700 font-bold text-base hover:bg-blue-50 transition shadow-lg">
                Check My Eligibility
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              <Link to="/dashboard" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border-2 border-white/50 text-white font-semibold text-base hover:bg-white/10 transition">
                Pharmacist Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ──────────────────────────────────────── */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: '10M+', label: 'Americans eligible for MTM' },
              { value: 'Free', label: 'For qualified River Health members' },
              { value: '≤60 min', label: 'Typical consultation length' },
              { value: '1-on-1', label: 'Private pharmacist session' },
            ].map(s => (
              <div key={s.label}>
                <div className="text-2xl md:text-3xl font-extrabold text-brand-700">{s.value}</div>
                <div className="text-sm text-slate-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How MTM Works ─────────────────────────────────── */}
      <section className="py-20 bg-slate-50" id="how-it-works">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="section-title">How MTM Works</h2>
            <p className="section-sub">Four simple steps from eligibility to your personal medication plan.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((s, i) => (
              <div key={s.step} className="relative card flex flex-col gap-4 hover:shadow-md transition group">
                {/* connector line */}
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-10 -right-3 w-6 z-10">
                    <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                )}
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-xl bg-brand-700 text-white flex items-center justify-center group-hover:bg-brand-800 transition">
                    {s.icon}
                  </div>
                  <span className="text-3xl font-black text-slate-100 group-hover:text-slate-200 transition select-none">{s.step}</span>
                </div>
                <h3 className="font-bold text-slate-800 text-lg">{s.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who Qualifies ─────────────────────────────────── */}
      <section className="py-20 bg-white" id="who-qualifies">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="section-title">Who Qualifies for MTM?</h2>
            <p className="section-sub">
              River Health Plan follows CMS guidelines to identify members who could benefit most from medication management.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {QUALIFY.map(q => (
              <div key={q.label} className="card flex flex-col items-start gap-4 border-t-4 border-brand-600">
                <div className="text-4xl">{q.icon}</div>
                <h3 className="font-bold text-slate-800 text-lg">{q.label}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{q.detail}</p>
              </div>
            ))}
          </div>

          <div className="bg-brand-50 border border-brand-200 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center gap-4">
            <svg className="w-6 h-6 text-brand-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            <p className="text-brand-800 text-sm">
              <strong>Note:</strong> Actual eligibility criteria may vary by plan year and CMS regulations. This tool provides an estimate only. Contact Stone Pharmacy at <strong>(541) 555-0192</strong> to confirm your eligibility.
            </p>
            <Link to="/eligibility" className="shrink-0 btn-primary">
              Check Now
            </Link>
          </div>
        </div>
      </section>

      {/* ── Conditions ────────────────────────────────────── */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="section-title">Conditions We Support</h2>
            <p className="section-sub">MTM is especially beneficial for members managing any of these chronic conditions.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              'Diabetes', 'High Blood Pressure', 'High Cholesterol', 'Heart Failure',
              "Alzheimer's Disease", 'End-Stage Kidney Disease', 'Bone Disease / Arthritis',
              'Mental Health Conditions', 'Respiratory Disease (Asthma / COPD)', 'HIV/AIDS',
            ].map(c => (
              <span key={c} className="bg-white border border-slate-200 text-slate-700 text-sm font-medium px-4 py-2 rounded-full shadow-sm hover:border-brand-400 hover:text-brand-700 transition cursor-default">
                {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact ───────────────────────────────────────── */}
      <section className="py-20 bg-white" id="contact">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
            {/* Info */}
            <div>
              <h2 className="section-title text-left">Contact Workflow Demo</h2>
              <p className="text-slate-500 mb-8 leading-relaxed">
                Explore a sample contact workflow using fictional information. The pharmacy and contact details below are placeholders; this demo does not provide appointments or clinical services.
              </p>
              <ul className="space-y-5">
                {[
                  { icon: '📍', label: 'Address', value: '1247 River Oak Blvd, Suite 3\nMaplewood, OR 97401' },
                  { icon: '📞', label: 'Phone', value: '(541) 555-0192' },
                  { icon: '📧', label: 'Email', value: 'mtm@stonepharmacy.demo' },
                  { icon: '🕐', label: 'Hours', value: 'Mon–Fri: 8 AM – 6 PM · Sat: 9 AM – 2 PM' },
                ].map(item => (
                  <li key={item.label} className="flex gap-4 items-start">
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{item.label}</div>
                      <div className="text-slate-700 text-sm font-medium whitespace-pre-line">{item.value}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Form */}
            <div className="card">
              <h3 className="font-bold text-slate-800 text-xl mb-2">Try a Sample Message</h3>
              <p className="mb-6 text-sm text-slate-500">Use fictional details only. This form stays in your browser and does not send a message.</p>
              <form className="flex flex-col gap-4" onInput={() => setContactDemoSubmitted(false)} onSubmit={e => { e.preventDefault(); setContactDemoSubmitted(true) }}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                    <input type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" placeholder="Jane" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                    <input type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" placeholder="Doe" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input type="email" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" placeholder="you@example.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone (optional)</label>
                  <input type="tel" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" placeholder="(541) 555-0000" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                  <textarea rows={4} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none" placeholder="Questions about MTM eligibility, scheduling, etc." />
                </div>
                <button type="submit" className="btn-primary justify-center">
                  Preview Demo Confirmation
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                </button>
                {contactDemoSubmitted && <p role="status" className="rounded-lg bg-teal-50 p-3 text-sm text-teal-900">Demo complete. No message was sent, no appointment was booked, and no confirmation email will be sent.</p>}
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ────────────────────────────────────── */}
      <section className="bg-gradient-to-r from-brand-700 to-teal-600 py-16 text-white text-center">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-3xl font-extrabold mb-4">Ready to take control of your medications?</h2>
          <p className="text-blue-100 mb-8 text-lg">Find out in 2 minutes if you qualify for free MTM services through River Health Plan.</p>
          <Link to="/eligibility" className="inline-flex items-center gap-2 bg-white text-brand-700 font-bold px-8 py-4 rounded-xl hover:bg-blue-50 transition shadow-lg text-base">
            Check Eligibility Now
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      </section>
    </div>
  )
}
