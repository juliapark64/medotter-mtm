export default function AlertBanner({ interaction }) {
  const { severity, drugs, description } = interaction

  const styles = {
    major: {
      wrapper: 'bg-red-50 border-red-300 border',
      icon: 'text-red-500',
      badge: 'bg-red-100 text-red-700 border border-red-200',
      title: 'text-red-800',
      body: 'text-red-700',
    },
    moderate: {
      wrapper: 'bg-amber-50 border-amber-300 border',
      icon: 'text-amber-500',
      badge: 'bg-amber-100 text-amber-700 border border-amber-200',
      title: 'text-amber-800',
      body: 'text-amber-700',
    },
    minor: {
      wrapper: 'bg-blue-50 border-blue-200 border',
      icon: 'text-blue-500',
      badge: 'bg-blue-100 text-blue-700 border border-blue-200',
      title: 'text-blue-800',
      body: 'text-blue-700',
    },
  }

  const s = styles[severity] || styles.minor

  return (
    <div className={`rounded-xl p-4 flex gap-3 ${s.wrapper}`}>
      <div className="shrink-0 mt-0.5">
        <svg className={`w-5 h-5 ${s.icon}`} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={`text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${s.badge}`}>
            {severity}
          </span>
          <span className={`text-sm font-semibold ${s.title}`}>
            {drugs.join(' + ')}
          </span>
        </div>
        <p className={`text-sm leading-relaxed ${s.body}`}>{description}</p>
      </div>
    </div>
  )
}
