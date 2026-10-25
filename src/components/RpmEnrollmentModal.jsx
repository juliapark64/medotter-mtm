import { useState } from 'react'
import RpmBanner from './RpmBanner'

export default function RpmEnrollmentModal({ isOpen, onClose, patient, onEnroll, initialRecommendation = null }) {
  const [consentChecked, setConsentChecked] = useState(false)
  const [deviceSerial, setDeviceSerial] = useState(() => `OMR-HEM-${Math.floor(1000 + Math.random() * 9000)}-BT`)
  const [targetSystolic, setTargetSystolic] = useState(130)
  const [targetDiastolic, setTargetDiastolic] = useState(80)
  const [consentType, setConsentType] = useState('verbal')

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!consentChecked) return

    onEnroll({
      patientId: patient.id,
      consentDate: new Date().toISOString().slice(0, 10),
      deviceSerial: deviceSerial.trim() || `OMR-HEM-9000-BT`,
      targetSystolic: Number(targetSystolic) || 130,
      targetDiastolic: Number(targetDiastolic) || 80,
      attachedRecommendation: initialRecommendation
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-800 to-brand-700 text-white px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold">Enroll in Remote BP Monitoring (RPM)</h3>
                <p className="text-xs text-brand-100">{patient.name} · MRN: {patient.mrn} · {patient.insurer}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-brand-200 hover:text-white hover:bg-white/10 transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content & Banner */}
        <div className="p-6 space-y-5">
          <RpmBanner />

          {initialRecommendation && (
            <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900">
              <div className="font-bold flex items-center gap-1.5 mb-1 text-indigo-700">
                <span>🔄 Linked Deprescribing Protocol</span>
              </div>
              <p className="line-clamp-2">{initialRecommendation.recommendationText || initialRecommendation}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Cost Disclosure Statement */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-slate-700 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
                <svg className="w-4 h-4 text-amber-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span>Cost Disclosure Statement</span>
              </div>
              <p className="leading-relaxed text-slate-600">
                <strong>Medicare & River Health Plan Coverage Notice:</strong> Remote Physiologic Monitoring (RPM) services (CPT 99453 initial device setup, CPT 99454 monthly transmission of 16+ days of data, and CPT 99457 clinical management) are covered under Medicare Part B and Medicare Advantage with standard 20% coinsurance or $0 out-of-pocket for eligible dual-eligible/supplemental coverage members.
              </p>
              <p className="leading-relaxed text-slate-600">
                The member has been informed that standard plan cost-sharing rules may apply, and that they may opt out of RPM transmission at any time without affecting standard clinic care.
              </p>
            </div>

            {/* Target Blood Pressure */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                Target Blood Pressure (mmHg)
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-slate-500 mb-1 block">Systolic Target (&lt;)</span>
                  <div className="relative">
                    <input
                      type="number"
                      min="90"
                      max="180"
                      value={targetSystolic}
                      onChange={e => setTargetSystolic(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                      required
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400">mmHg</span>
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-500 mb-1 block">Diastolic Target (&lt;)</span>
                  <div className="relative">
                    <input
                      type="number"
                      min="50"
                      max="120"
                      value={targetDiastolic}
                      onChange={e => setTargetDiastolic(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                      required
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400">mmHg</span>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Default clinical goal: 130/80 mmHg per ACC/AHA hypertension management guidelines.
              </p>
            </div>

            {/* Device Serial */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Assigned Device Serial Number
              </label>
              <input
                type="text"
                value={deviceSerial}
                onChange={e => setDeviceSerial(e.target.value)}
                placeholder="e.g. OMR-HEM-9281-BT"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                required
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Cellular or Bluetooth-connected automated upper arm blood pressure cuff.
              </p>
            </div>

            {/* Consent Type */}
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Consent Method
              </span>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition ${consentType === 'verbal' ? 'border-brand-500 bg-brand-50/60 font-semibold text-brand-900' : 'border-slate-200 text-slate-600'}`}>
                  <input
                    type="radio"
                    name="consentType"
                    checked={consentType === 'verbal'}
                    onChange={() => setConsentType('verbal')}
                    className="text-brand-600 focus:ring-brand-500"
                  />
                  <span>Documented Verbal Consent</span>
                </label>
                <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition ${consentType === 'signed' ? 'border-brand-500 bg-brand-50/60 font-semibold text-brand-900' : 'border-slate-200 text-slate-600'}`}>
                  <input
                    type="radio"
                    name="consentType"
                    checked={consentType === 'signed'}
                    onChange={() => setConsentType('signed')}
                    className="text-brand-600 focus:ring-brand-500"
                  />
                  <span>Signed Electronic Form</span>
                </label>
              </div>
            </div>

            {/* Mandatory Consent Checkbox */}
            <div className={`p-4 rounded-xl border transition ${consentChecked ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-300 bg-slate-50'}`}>
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="rpm-consent-checkbox"
                  checked={consentChecked}
                  onChange={e => setConsentChecked(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300"
                />
                <div className="text-xs text-slate-700 leading-snug">
                  <span className="font-bold text-slate-900 block mb-0.5">
                    Informed Consent Confirmation (Required)
                  </span>
                  I confirm that the patient (or legal healthcare representative) has given informed consent for remote blood pressure monitoring, understands transmission requirements, and has reviewed the cost disclosure.
                </div>
              </label>
            </div>

            {/* Blocked Enrollment Notice if not checked */}
            {!consentChecked && (
              <p className="text-xs text-amber-700 font-semibold flex items-center gap-1.5 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                Enrollment is blocked until consent is verified and checked.
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!consentChecked}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold shadow-md transition flex items-center gap-2 ${
                  consentChecked
                    ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-500/20 cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Complete Enrollment
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
