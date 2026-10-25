export default function RpmBanner({ className = '', showThresholdNote = false }) {
  return (
    <div className={`rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 via-indigo-50/50 to-teal-50/40 p-4 shadow-sm ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-700 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-700 text-white tracking-wide uppercase">
                RPM Demo Mode
              </span>
              <p className="text-sm font-semibold text-slate-800">
                Simulated data for demonstration. Not a medical device.
              </p>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Remote physiologic blood pressure readings are generated for clinical workflow training and MTM integration testing.
            </p>
          </div>
        </div>

        {showThresholdNote && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/80 border border-slate-200 text-slate-600 text-xs font-medium shrink-0">
            <svg className="w-3.5 h-3.5 text-amber-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <span>Demonstration thresholds; follow your organization's protocol.</span>
          </div>
        )}
      </div>
    </div>
  )
}
