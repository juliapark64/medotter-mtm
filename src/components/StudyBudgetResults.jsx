import { MODES } from '../lib/valueCalculator'

const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
const pmpm = value => '$' + value.toFixed(3)
const percent = value => (value * 100).toFixed(1) + '%'

export default function StudyBudgetResults({ analysis }) {
  const row = analysis.combined.years?.[0]
  const threshold = analysis.implementationThreshold
  return <section className="card mb-6" aria-label="Primary study results">
    <div className="flex flex-wrap items-start justify-between gap-6">
      <div className="max-w-xl">
        <p className="text-xs font-bold uppercase tracking-widest text-teal-700">Primary analysis · Year 1</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-900">Can deprescribing savings offset RPM costs?</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Health-plan budget impact of adding deprescribing screening and hypertension RPM to standard MTM. Program costs minus net drug savings and modeled cardiovascular (CV) cost savings.</p>
      </div>
      {analysis.isComplete && <div className="rounded-xl bg-teal-50 px-6 py-4">
        <p className="text-sm font-semibold text-teal-900">Combined program · net budget impact</p>
        <p className="mt-1 text-4xl font-extrabold text-teal-900">{pmpm(row.netPMPM)} <span className="text-base font-semibold">PMPM</span></p>
        <p className="mt-2 text-sm text-teal-900">{money(Math.abs(row.netImpact))} net {row.netImpact < 0 ? 'savings' : 'cost'} in year 1</p>
      </div>}
    </div>
    <p className="mt-4 text-xs leading-5 text-slate-500">PMPM = per member per month across all covered members. Positive net impact means added cost; negative means savings. Standard MTM is the reference: its incremental costs and offsets are zero here, not its actual spending.</p>
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">One-year incremental results relative to standard MTM</caption>
        <thead><tr className="bg-slate-100 text-right text-xs text-slate-600"><th className="p-3 text-left">Program</th><th className="p-3">Program cost</th><th className="p-3">Net drug offset</th><th className="p-3">CV offset</th><th className="p-3">Net cost</th><th className="p-3">Net PMPM</th></tr></thead>
        <tbody>
          <tr className="border-b border-slate-100 text-slate-500"><th className="p-3 text-left font-medium">Standard MTM (reference)</th>{[0, 1, 2, 3].map(key => <td key={key} className="p-3 text-right">$0</td>)}<td className="p-3 text-right">$0.000</td></tr>
          {analysis.arms.map(({ mode, result }) => <tr key={mode} className={'border-b border-slate-100 ' + (mode === MODES.COMBINED ? 'bg-teal-50 font-bold text-teal-950' : 'text-slate-700')}>
            <th className="p-3 text-left">{mode}</th>
            {result.isComplete ? <>{['programCost', 'avoidedDrug', 'avoidedCV', 'netImpact'].map(key => <td key={key} className="whitespace-nowrap p-3 text-right tabular-nums">{money(result.years[0][key])}</td>)}<td className="p-3 text-right tabular-nums">{pmpm(result.years[0].netPMPM)}</td></> : <td colSpan={5} className="p-3 text-right font-normal text-amber-800">Complete the required assumptions</td>}
          </tr>)}
        </tbody>
      </table>
    </div>
    <p className="mt-3 text-xs leading-5 text-slate-500">Shared platform and setup costs are counted once in the combined program. Standalone program costs should not be added together.</p>
    {analysis.isComplete ? <div className="mt-5 grid gap-4 md:grid-cols-2">
      <div className="rounded-xl border border-slate-200 p-4">
        <h3 className="font-bold text-slate-800">Do drug savings alone cover the program?</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">With CV cost savings set to zero, the combined program has {money(Math.abs(analysis.noCvNetImpact))} in net {analysis.noCvNetImpact < 0 ? 'savings' : 'cost'} ({pmpm(analysis.noCvNetPMPM)} PMPM) in year 1.</p>
      </div>
      <div className="rounded-xl border border-slate-200 p-4">
        <h3 className="font-bold text-slate-800">Implementation needed to break even</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{threshold.status === 'already-covered'
          ? 'The modeled CV offset already covers program costs at 0% deprescribing implementation.'
          : threshold.status === 'attainable'
            ? percent(threshold.rate) + ' of additional discontinuation recommendations must be implemented to cover combined year-one costs, including the current CV offset.'
            : threshold.rate !== null
              ? 'The implied rate is ' + percent(threshold.rate) + '—above 100%. Implementation alone cannot reach break-even with these assumptions.'
              : 'Implementation alone cannot reach break-even because it adds no positive net drug offset under these assumptions.'}</p>
        <p className="mt-2 text-xs leading-5 text-slate-500">All other inputs held fixed. Implementation includes acceptance and action; it is not prescriber acceptance alone.</p>
      </div>
    </div> : <p role="status" className="mt-4 text-sm text-amber-800">Enter valid population, deprescribing, RPM and cost assumptions to calculate the combined primary endpoint.</p>}
  </section>
}
