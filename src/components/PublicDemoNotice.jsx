import { useLocation } from 'react-router-dom'

export default function PublicDemoNotice() {
  const { pathname } = useLocation()
  const isWorkflow = pathname.startsWith('/integration-demo/') || pathname.startsWith('/dashboard') || pathname === '/portal'
  return (
    <aside aria-label="Public demo notice" className="border-b border-amber-200 bg-amber-50 text-amber-950">
      <div className="mx-auto max-w-7xl px-4 py-3 text-xs leading-5 sm:px-6 lg:px-8">
        <p className="text-center font-semibold">Research and workflow demonstration — fictional data only. No clinical services.</p>
        {isWorkflow && <p className="mt-1 text-center">Form entries, photos, and readings are not sent to a server or clinician. RPM changes are saved locally in this browser and can remain after you close the page.</p>}
      </div>
    </aside>
  )
}
