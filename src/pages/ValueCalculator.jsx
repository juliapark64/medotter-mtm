import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { INPUT_GROUPS, MODEL_METADATA } from '../data/calculatorDefaults'
import { GEISINGER_PROFILE, getEvidenceProfile, getGeisingerScenarios } from '../data/deprescribingScenarios'
import { calculateProjection, getRequiredInputsForMultiYear, MODES, OUTPUT_LABELS } from '../lib/valueCalculator'
import { getScenarioDefinitions, getParameterSnapshot, createScenarioBundle, verifyScenarioBundle, bundleToCsv } from '../lib/scenarioExports'
import { getStudyBaseScenario } from '../data/studyScenarios'
import { calculateStudyAnalysis } from '../lib/studyAnalysis'
import StudyBudgetResults from '../components/StudyBudgetResults'

const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
const number = value => new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value)
const pmpm = value => '$' + value.toFixed(3)
const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500'
const buttonClass = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed'
const costRows = ['pharmacistLaborCost', 'supportLaborCost', 'deviceCost', 'connectivityCost', 'platformCost', 'setupCost', 'programCost', 'grossAvoidedDrug', 'replacementDrugCost', 'avoidedDrug', 'avoidedCV', 'netImpact', 'netPMPM']
const workloadRows = ['reviews', 'newStops', 'newRpmPatients', 'rpmPatientMonths', 'pharmacistHours', 'supportHours', 'avoidedEvents']

function download(contents, name, type) {
  const url = URL.createObjectURL(new Blob([contents], { type }))
  const anchor = document.createElement('a')
  anchor.href = url; anchor.download = name; anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function ValueCalculator() {
  const [inputs, setInputs] = useState(() => getStudyBaseScenario().inputs)
  const [mode, setMode] = useState(MODES.COMBINED)
  const [scenarioName, setScenarioName] = useState(() => getStudyBaseScenario().name)
  const [evidenceProfileId, setEvidenceProfileId] = useState(() => getStudyBaseScenario().evidenceProfileId)
  const [notes, setNotes] = useState('')
  const [exportScope, setExportScope] = useState('current')
  const [message, setMessage] = useState(null)
  const [busy, setBusy] = useState(false)
  const [imported, setImported] = useState(null)
  const [importIndex, setImportIndex] = useState(0)
  const fileInput = useRef(null)
  const result = useMemo(() => calculateProjection(inputs, mode, 3), [inputs, mode])
  const studyAnalysis = useMemo(() => calculateStudyAnalysis(inputs), [inputs])
  const required = getRequiredInputsForMultiYear(MODES.COMBINED)
  const inputErrors = { ...studyAnalysis.combined.errors, ...result.errors }
  const evidenceProfile = getEvidenceProfile(evidenceProfileId)
  const parameters = useMemo(() => getParameterSnapshot(inputs, evidenceProfileId), [inputs, evidenceProfileId])
  const definitions = useMemo(() => {
    const list = getScenarioDefinitions(inputs, mode, false, evidenceProfileId)
    list[0].name = scenarioName.trim() || 'Current scenario'
    return list
  }, [inputs, mode, scenarioName, evidenceProfileId])
  const comparisons = useMemo(() => definitions.map(d => ({ ...d, result: calculateProjection(d.inputs, d.mode, 3) })), [definitions])
  const exportable = result.isComplete && (exportScope === 'current' || comparisons.every(s => s.result.isComplete))

  function reset() {
    const base = getStudyBaseScenario()
    setInputs(base.inputs); setMode(MODES.COMBINED); setScenarioName(base.name)
    setNotes(''); setImported(null); setMessage(null); setEvidenceProfileId(base.evidenceProfileId)
  }
  function applyGeisinger(noAddedBenefit) {
    const s = getGeisingerScenarios(inputs, mode)[noAddedBenefit ? 1 : 0]
    setInputs(s.inputs); setScenarioName(s.name); setEvidenceProfileId(s.evidenceProfileId); setImported(null)
    setMessage({ ok: true, text: noAddedBenefit
      ? 'Loaded 1.09 recommendations and 33.2% implementation, with additional findings set to 0%. Program costs and RPM assumptions are retained.'
      : 'Loaded 1.09 recommendations and 33.2% implementation. All other inputs are retained, including the additional-findings share. Set that share to your assumed benefit beyond existing MTM.' })
  }
  async function exportFile(format) {
    setBusy(true); setMessage(null)
    try {
      const bundle = await createScenarioBundle(exportScope === 'current' ? [definitions[0]] : definitions, { notes })
      const stem = 'medotter-v' + MODEL_METADATA.version + '-' + bundle.scenarios[0].inputFingerprint.slice(0, 12) + '-' + exportScope
      download(format === 'json' ? JSON.stringify(bundle, null, 2) : bundleToCsv(bundle), stem + '.' + format,
        format === 'json' ? 'application/json' : 'text/csv;charset=utf-8')
      setMessage({ ok: true, text: 'Exported ' + bundle.scenarios.length + ' scenario(s), with inputs, sources, and all three years of results.' })
    } catch (error) { setMessage({ ok: false, text: error.message }) }
    finally { setBusy(false) }
  }
  function applyImported(bundle, index) {
    const s = bundle.scenarios[index]
    setInputs({ ...s.inputs }); setMode(s.mode); setScenarioName(s.name); setNotes(bundle.notes)
    setEvidenceProfileId(s.evidenceProfileId)
    setImportIndex(index)
  }
  async function importFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy(true); setMessage(null)
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error('Choose a scenario JSON file smaller than 20 MB.')
      const bundle = await verifyScenarioBundle(JSON.parse(await file.text()))
      setImported(bundle); applyImported(bundle, 0)
      setMessage({ ok: true, text: 'Verified and loaded ' + bundle.scenarios.length + ' scenario(s). All saved results matched recalculation.' })
    } catch (error) { setMessage({ ok: false, text: 'Import failed: ' + error.message }) }
    finally { setBusy(false) }
  }
  const format = (key, value) => key === 'netPMPM' ? pmpm(value) : costRows.includes(key) ? money(value) : number(value)

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Link to="/calculator" className="text-sm font-semibold text-teal-700 hover:underline">← Current study calculator</Link>
        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Historical budget model: these assumptions and endpoints are separate from the current pharmacist-integration study.</p>
        <div className="mt-4 mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-widest text-teal-700">MedOtter · MTM financial impact study</p>
            <h1 className="mt-2 text-3xl font-extrabold text-slate-900">Deprescribing and RPM budget impact</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">A hypothetical Medicare Advantage plan employing MTM pharmacists, with an RPM vendor providing devices and data service. The primary endpoint is combined-program net budget impact per member per month over one year; three-year projections are secondary.</p>
            <p className="mt-2 text-sm font-medium text-amber-800">Scenario estimates, not observed outcomes. Costs and incremental effects remain assumptions unless a source is specified.</p>
          </div>
          <button onClick={reset} className={buttonClass}>Reset study base case</button>
        </div>

        <StudyBudgetResults analysis={studyAnalysis} />

        <section className="card mb-6" aria-label="Scenario controls">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">Scenario name
              <input value={scenarioName} onChange={e => setScenarioName(e.target.value)} maxLength={160} className={inputClass + ' mt-1'} />
            </label>
            <label className="text-sm font-semibold text-slate-700">Services for detailed projection and export
              <select value={mode} onChange={e => setMode(e.target.value)} className={inputClass + ' mt-1'}>
                {Object.values(MODES).map(m => <option key={m}>{m}</option>)}
              </select>
            </label>
          </div>
          <label className="mt-4 block text-sm font-semibold text-slate-700">Local assumptions and source notes
            <textarea value={notes} onChange={e => setNotes(e.target.value)} maxLength={10000} rows={2} className={inputClass + ' mt-1'} placeholder="Document local quotes, costing methods, sources, and why values were changed." />
          </label>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="text-xs font-semibold text-slate-600">Export scope
              <select value={exportScope} onChange={e => setExportScope(e.target.value)} className={inputClass + ' mt-1'}>
                <option value="current">Current scenario</option>
                <option value="comparisons">Displayed comparison set</option>
              </select>
            </label>
            <button onClick={() => exportFile('json')} disabled={!exportable || busy} className="btn-primary disabled:opacity-40">Save scenario JSON</button>
            <button onClick={() => exportFile('csv')} disabled={!exportable || busy} className={buttonClass}>Export results CSV</button>
            <button onClick={() => fileInput.current.click()} disabled={busy} className={buttonClass}>Load scenario JSON</button>
            <input ref={fileInput} type="file" accept=".json,application/json" onChange={importFile} className="hidden" aria-label="Scenario JSON file" />
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">Both formats include the complete assumptions and annual results. JSON can be loaded and verified here. Model v{MODEL_METADATA.version}; all costs are constant {inputs.priceYear || 'selected-year'} USD. Changing the price year does not convert costs.</p>
          {!exportable && <p className="mt-2 text-sm text-amber-800">Complete the required inputs for the selected export scope to enable export.</p>}
          {message && <p role="status" className={'mt-3 text-sm ' + (message.ok ? 'text-teal-800' : 'text-red-700')}>{message.text}</p>}
          {imported?.scenarios.length > 1 && <label className="mt-3 block text-sm font-semibold text-slate-700">Load another scenario from this file
            <select className={inputClass + ' mt-1'} value={importIndex} onChange={e => applyImported(imported, Number(e.target.value))}>
              {imported.scenarios.map((s, i) => <option key={s.id} value={i}>{s.name}</option>)}
            </select>
          </label>}
        </section>

        <section className="card mb-6" aria-label="Geisinger evidence and scenarios">
          <h2 className="text-lg font-bold text-slate-900">Geisinger-informed scenarios</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Use <strong>1.09 discontinuation recommendations per completed initial review</strong> (199/182) and <strong>33.2% implementation</strong> (66/199). The companion scenario assumes no added deprescribing benefit beyond existing MTM, while retaining review workload, program costs and any RPM effects.</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button onClick={() => applyGeisinger(false)} disabled={mode === MODES.RPM} className={buttonClass}>Apply Geisinger scenario</button>
            <button onClick={() => applyGeisinger(true)} disabled={mode === MODES.RPM} className={buttonClass}>Apply no added benefit</button>
          </div>
          {mode === MODES.RPM ? <p className="mt-3 text-sm text-slate-600">Select Combined or Deprescribing only to apply these scenarios. Deprescribing inputs have no effect in RPM only mode.</p>
            : evidenceProfile && <p className="mt-3 text-sm font-medium text-teal-800">Geisinger reference active. Current additional-findings share: {inputs.incrementalDetection === null ? 'missing' : number(inputs.incrementalDetection * 100) + '%'} (investigator assumption).
              {inputs.incrementalDetection === 0 && ' No added medication discontinuations or drug savings are projected.'}
              {(inputs.pimsPerPatient !== 1.09 || inputs.implementationRate !== 0.332) && ' You have changed one or both study-informed inputs; current values are user assumptions.'}
            </p>}
          <p className="mt-3 text-xs leading-5 text-slate-600">Source: <a href={GEISINGER_PROFILE.citation.url} target="_blank" rel="noreferrer" className="font-semibold text-teal-700 underline">Graybill et al., JACCP (2021), Tables 1–2 and Methods 2.4</a>. DOI: {GEISINGER_PROFILE.citation.doi}. Citations and derivations are included in both exports when a Geisinger scenario is selected.</p>
          <details className="mt-3 text-xs leading-5 text-slate-600">
            <summary className="cursor-pointer font-semibold">Study population and limits of applying these values</summary>
            <p className="mt-2">{GEISINGER_PROFILE.population}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">{GEISINGER_PROFILE.context.map(text => <li key={text}>{text}</li>)}</ul>
          </details>
        </section>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(300px,400px)_minmax(0,1fr)]">
          <div className="space-y-4">
            <p className="text-sm font-semibold text-slate-600">Edit assumptions by expanding a section.</p>
            {Object.entries(INPUT_GROUPS).map(([group, title]) => (
              <details key={group} className="card !p-0">
                <summary className="cursor-pointer px-5 py-4 font-bold text-slate-800">{title}</summary>
                <div className="space-y-5 border-t border-slate-100 px-5 py-5">
                  {Object.entries(parameters).filter(([key, d]) => d.group === group && required.includes(key)).map(([key, d]) => {
                    const value = inputs[key]
                    const display = value === null || value === undefined || value === '' ? '' : d.percent ? Number((Number(value) * 100).toFixed(8)) : value
                    return <div key={key}>
                      <label htmlFor={'input-' + key} className="block text-sm font-semibold text-slate-700">{d.label}{d.multiYear && <span className="ml-1 text-xs font-normal text-slate-400">Years 2–3</span>}</label>
                      <div className="mt-1 flex items-center gap-2">
                        <input id={'input-' + key} type="number" value={display} min={d.percent ? d.min * 100 : d.min} max={d.max === undefined ? undefined : d.percent ? d.max * 100 : d.max} step={d.step}
                          aria-invalid={Boolean(inputErrors[key])} aria-describedby={'help-' + key}
                          onChange={e => setInputs(prev => ({ ...prev, [key]: e.target.value === '' ? null : Number(e.target.value) / (d.percent ? 100 : 1) }))}
                          className={inputClass + (inputErrors[key] ? ' !border-red-500' : '')} />
                        {d.percent && <span className="text-sm text-slate-500">%</span>}
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{d.unit}</p>
                      <p id={'help-' + key} className="mt-1 text-xs leading-5 text-slate-500">{d.description}</p>
                      {inputErrors[key] && <p role="alert" className="mt-1 text-xs font-semibold text-red-700">{inputErrors[key]}</p>}
                    </div>
                  })}
                </div>
              </details>
            ))}
          </div>

          <div className="min-w-0 space-y-6">
            {!result.isComplete ? <div className="card" role="status">
              <h2 className="text-lg font-bold text-slate-800">Complete the highlighted assumptions</h2>
              <p className="mt-2 text-sm text-slate-600">Results and exports update when all required values are valid.</p>
              {result.errors.calculation && <p className="mt-2 text-red-700">{result.errors.calculation}</p>}
            </div> : <>
              <section className="card" aria-label="Budget results">
                <h2 className="text-xl font-bold text-slate-900">Detailed projection: {mode}</h2>
                <p className="mt-1 text-xs text-slate-500">Positive values are additional cost. Negative values are modeled savings.</p>
                <details className="mt-4">
                <summary className="cursor-pointer text-sm font-semibold text-slate-700">Secondary three-year projection and annual chart</summary>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {[['Year 1', result.years[0]], ['Cumulative 3 years', result.cumulative]].map(([label, row]) => <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-600">{label}</p>
                    <p className={'mt-2 text-3xl font-extrabold ' + (row.netImpact < 0 ? 'text-teal-700' : 'text-slate-900')}>{money(row.netImpact)}</p>
                    <p className="mt-1 text-sm text-slate-600">{pmpm(row.netPMPM)} per member per month</p>
                  </div>)}
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-500">Year-one PMPM divides by 12 member-months per covered member; cumulative PMPM divides by 36. Fixed costs are counted once when services are combined.</p>
                <div className="mt-6 h-64" aria-label="Annual costs and offsets chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={result.years} margin={{ left: 0, right: 4, top: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="year" tickFormatter={v => 'Year ' + v} />
                      <YAxis tickFormatter={v => '$' + Math.round(v / 1000) + 'k'} width={65} />
                      <Tooltip formatter={v => money(v)} labelFormatter={v => 'Year ' + v} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="programCost" name="Program cost" fill="#334155" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="avoidedDrug" name="Net drug offset" fill="#0d9488" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="avoidedCV" name="CV offset" fill="#0284c7" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                </details>
              </section>
              <details className="card !px-0" aria-label="Annual financial detail">
                <summary className="cursor-pointer px-5 text-lg font-bold text-slate-900">Annual cost and savings detail</summary>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-slate-100 text-right text-slate-600"><th className="p-3 text-left">Cost or offset</th>{['Year 1', 'Year 2', 'Year 3', '3-year total'].map(x => <th key={x} className="whitespace-nowrap p-3">{x}</th>)}</tr></thead>
                    <tbody>{costRows.map(key => <tr key={key} className={'border-b border-slate-100 ' + (['netImpact', 'netPMPM', 'programCost'].includes(key) ? 'bg-slate-50 font-bold' : '')}>
                      <th scope="row" className="p-3 text-left font-medium text-slate-700">{OUTPUT_LABELS[key]}</th>
                      {[...result.years, result.cumulative].map((row, i) => <td key={i} className="whitespace-nowrap p-3 text-right tabular-nums">{format(key, row[key])}</td>)}
                    </tr>)}</tbody>
                  </table>
                </div>
                <p className="mt-3 px-5 text-xs text-slate-500">Replacement medication costs reduce the drug offset. CV offsets are modeled, not observed. No discounting or future price escalation is applied.</p>
              </details>
              <details className="card !px-0" aria-label="Workforce and service volumes">
                <summary className="cursor-pointer px-5 text-lg font-bold text-slate-900">Workforce and service volumes</summary>
                <div className="mt-4 overflow-x-auto"><table className="w-full text-xs">
                  <thead><tr className="bg-slate-100 text-right text-slate-600"><th className="p-3 text-left">Measure</th>{['Year 1', 'Year 2', 'Year 3'].map(x => <th key={x} className="p-3">{x}</th>)}</tr></thead>
                  <tbody>{workloadRows.map(key => <tr key={key} className="border-b border-slate-100"><th className="p-3 text-left font-medium text-slate-700">{OUTPUT_LABELS[key]}</th>{result.years.map(row => <td key={row.year} className="p-3 text-right tabular-nums">{number(row[key])}</td>)}</tr>)}</tbody>
                </table></div>
                <p className="mt-3 px-5 text-xs text-slate-500">Expected counts can be fractional. RPM hours include onboarding. RPM participation ends at graduation, dropout, or member departure.</p>
              </details>
            </>}

            <section className="card !px-0" aria-label="Scenario comparisons">
              <h2 className="px-5 text-lg font-bold text-slate-900">Study scenarios</h2>
              <p className="mt-1 px-5 text-xs leading-5 text-slate-500">Geisinger rows apply the paired recommendation and implementation values; the no-added-benefit row also sets additional findings to zero. Other rows change one input or service combination. Remaining inputs are inherited from your current scenario. These are exploratory scenarios, not confidence intervals.</p>
              <div className="mt-4 overflow-x-auto"><table className="w-full text-xs">
                <thead><tr className="bg-slate-100 text-right text-slate-600"><th className="p-3 text-left">Scenario</th><th className="p-3">Year 1 PMPM</th><th className="p-3">Year 1 net cost</th><th className="p-3">Secondary: 3-year PMPM</th></tr></thead>
                <tbody>{comparisons.map(s => <tr key={s.id} className="border-b border-slate-100"><th className="p-3 text-left font-medium text-slate-700">{s.name}</th>{s.result.isComplete ? <>
                  <td className="p-3 text-right">{pmpm(s.result.years[0].netPMPM)}</td><td className="whitespace-nowrap p-3 text-right">{money(s.result.years[0].netImpact)}</td><td className="p-3 text-right">{pmpm(s.result.cumulative.netPMPM)}</td>
                </> : <td colSpan={3} className="p-3 text-right text-amber-800">Additional service inputs required</td>}</tr>)}</tbody>
              </table></div>
            </section>
            <details className="card">
              <summary className="cursor-pointer font-bold text-slate-800">Model assumptions and limits</summary>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-xs leading-5 text-slate-600">{MODEL_METADATA.limitations.map(text => <li key={text}>{text}</li>)}</ul>
            </details>
          </div>
        </div>
        <details className="card mt-6">
          <summary className="cursor-pointer font-bold text-slate-800">Input sources and provenance</summary>
          <p className="mt-3 text-sm text-slate-500">Most values require local validation. Changing an input does not make its original reference evidence for the new value. Add supporting information in the scenario notes.</p>
          <div className="mt-4 overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="border-b border-slate-200 text-left"><th className="p-3">Input</th><th className="p-3">Current value</th><th className="p-3">Basis</th><th className="p-3">Source and context</th></tr></thead>
            <tbody>{Object.entries(parameters).map(([key, d]) => <tr key={key} className="border-b border-slate-100 align-top">
              <th className="p-3 text-left font-medium">{d.label}</th><td className="whitespace-nowrap p-3">{inputs[key] ?? 'Missing'} {d.unit}</td>
              <td className="p-3">{d.valueOrigin}</td><td className="min-w-[240px] break-words p-3 text-slate-500">{d.source}</td>
            </tr>)}</tbody>
          </table></div>
        </details>
      </div>
    </div>
  )
}

