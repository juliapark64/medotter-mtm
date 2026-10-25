export default function PublicDemoNotice() {
  return (
    <aside aria-label="Public demo notice" className="border-b border-amber-200 bg-amber-50 text-amber-950">
      <div className="mx-auto max-w-7xl px-4 py-3 text-xs leading-5 sm:px-6 lg:px-8">
        <p><strong>Educational demo — use fictional data only.</strong> Patient and organization details are fictional. This prototype provides no clinical services.</p>
        <p>Form entries, photos, and readings are not sent to a server or clinician. RPM changes are saved locally in this browser and can remain after you close the page.</p>
      </div>
    </aside>
  )
}
