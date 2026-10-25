import { useMemo, useRef, useState } from 'react'
import { COMMON_FIELDS, SETTING_FIELDS, getSettingFields, SETTINGS, PROVIDER_MODEL, getProviderInputs } from '../data/providerDefaults'
import { PROVIDER_EVIDENCE } from '../data/providerEvidence'
import { calculateProviderComparison, providerLoadedWage, PROVIDER_OUTPUTS } from '../lib/providerFeasibility'
import { createProviderBundle, verifyProviderBundle, providerBundleToCsv } from '../lib/providerExports'

const money = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
const rate = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)
const number = n => new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(n)
const inputClass = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500'
const buttonClass = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40'
const detailKeys = ['currentReviewRevenue', 'currentContractRpmRevenue', 'currentRpmAllowedCharges', 'rpmBillingPracticeReceipts', 'rpmPartnerRetainedRevenue', 'currentRpmMedicareRevenue', 'currentRpmPatientRevenue', 'currentRevenue', 'actMedicareRevenue', 'actPatientRevenue', 'revenue', 'reviewStaffCost', 'rpmPharmacistCost', 'rpmClinicalStaffCost', 'supportStaffCost', 'staffCost', 'deviceCost', 'technologyCost', 'claimCost', 'dispensingLoss', 'fixedCost', 'totalCost', 'margin']
const sourceLink = key => <a className="font-semibold text-teal-700 underline" target="_blank" rel="noreferrer" href={PROVIDER_EVIDENCE[key].url}>{PROVIDER_EVIDENCE[key].title}</a>
const inputLabel = path => {
  const [scope, setting, key] = path.split('.')
  return scope === 'common' ? COMMON_FIELDS[setting]?.label : scope === 'settings'
    ? SETTINGS[setting] + ': ' + SETTING_FIELDS[key]?.label : 'Calculation'
}

export default function ProviderFeasibility({ active }) {
  const [inputs, setInputs] = useState(getProviderInputs)
  const [notes, setNotes] = useState('')
  const [name, setName] = useState('Community pharmacy and integrated clinic')
  const [setting, setSetting] = useState('pharmacy')
  const [detail, setDetail] = useState('pharmacy-current')
  const [message, setMessage] = useState(null)
  const [busy, setBusy] = useState(false)
  const fileInput = useRef(null)
  const result = useMemo(() => calculateProviderComparison(inputs), [inputs])
  const selected = result.scenarios.find(s => s.id === detail)
  const currentSettings = result.scenarios.filter(s => s.policyId === 'current')
  const update = (scope, key, value) => setInputs(prev => scope === 'common'
    ? { ...prev, common: { ...prev.common, [key]: value } }
    : { ...prev, settings: { ...prev.settings, [scope]: { ...prev.settings[scope], [key]: value } } })
  const reset = () => { setInputs(getProviderInputs()); setNotes(''); setName('Community pharmacy and integrated clinic'); setMessage(null) }
  async function exportFile(format) {
    setBusy(true); setMessage(null)
    try {
      const bundle = await createProviderBundle(inputs, { name, notes })
      const contents = format === 'json' ? JSON.stringify(bundle, null, 2) : providerBundleToCsv(bundle)
      const url = URL.createObjectURL(new Blob([contents], { type: format === 'json' ? 'application/json' : 'text/csv;charset=utf-8' }))
      const anchor = document.createElement('a')
      anchor.href = url; anchor.download = 'medotter-provider-v' + PROVIDER_MODEL.version + '-' + bundle.inputFingerprint.slice(0, 12) + '.' + format; anchor.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setMessage({ ok: true, text: 'Exported all six scenarios with annual results, break-even enrollment, assumptions and citations.' })
    } catch (error) { setMessage({ ok: false, text: error.message }) }
    finally { setBusy(false) }
  }
  async function importFile(event) {
    const file = event.target.files?.[0]; event.target.value = ''
    if (!file) return
    setBusy(true); setMessage(null)
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error('Choose a provider comparison JSON smaller than 20 MB.')
      const bundle = await verifyProviderBundle(JSON.parse(await file.text()))
      setInputs(bundle.inputs); setNotes(bundle.notes); setName(bundle.name)
      setMessage({ ok: true, text: 'Verified and restored all six provider scenarios. Saved results and citations matched recalculation.' })
    } catch (error) { setMessage({ ok: false, text: 'Import failed: ' + error.message }) }
    finally { setBusy(false) }
  }
  function fields(definitions, scope, values) {
    const visible = Object.fromEntries(Object.entries(definitions).filter(([key, d]) => {
      if (scope === 'common') return true
      if (d.group === 'RPM qualification and collections') return values.rpmPaymentBasis !== 0
      if (key === 'rpmContractRetainedShare') return values.rpmPaymentBasis === 2
      return key !== 'currentRpmReceipt' || values.rpmPaymentBasis === 0
    }))
    return [...new Set(Object.values(visible).map(d => d.group))].map(group => <details key={group} className="rounded-xl border border-slate-200 bg-white">
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-800">{group}</summary>
      <div className="grid gap-5 border-t border-slate-100 p-4 md:grid-cols-2">
        {Object.entries(visible).filter(([, d]) => d.group === group).map(([key, d]) => {
          const path = scope === 'common' ? 'common.' + key : 'settings.' + scope + '.' + key
          const value = values[key]
          const display = value === null ? '' : d.percent ? Number((value * 100).toFixed(8)) : value
          return <div key={key}>
            <label htmlFor={'provider-' + scope + '-' + key} className="block text-sm font-semibold text-slate-700">{d.label}{d.percent ? ' (%)' : ''}</label>
            {d.options ? <select id={'provider-' + scope + '-' + key} value={value} className={inputClass}
              aria-invalid={Boolean(result.errors[path])} aria-describedby={'provider-help-' + scope + '-' + key}
              onChange={e => update(scope, key, Number(e.target.value))}>{Object.entries(d.options).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select>
              : <input id={'provider-' + scope + '-' + key} type="number" value={display} min={d.percent ? d.min * 100 : d.min} max={d.max === undefined ? undefined : d.percent ? d.max * 100 : d.max} step={d.step}
              aria-invalid={Boolean(result.errors[path])} aria-describedby={'provider-help-' + scope + '-' + key}
              onChange={e => update(scope, key, e.target.value === '' ? null : Number(e.target.value) / (d.percent ? 100 : 1))}
              className={inputClass + (result.errors[path] ? ' !border-red-500' : '')} />}
            <p id={'provider-help-' + scope + '-' + key} className="mt-1 text-xs leading-5 text-slate-600">{d.unit}. {d.description}</p>
            <p className="mt-1 text-xs font-medium text-amber-800">{value === d.value ? d.evidenceType : 'User-entered assumption'}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{d.citationUrl ? <a className="text-teal-700 underline" href={d.citationUrl} target="_blank" rel="noreferrer">{d.source}</a> : d.source}{d.sourceYear ? ' · Source year: ' + d.sourceYear : ''}{value !== d.value && d.citationUrl ? ' · Citation supports the reference default, not your edited value.' : ''}</p>
            {result.errors[path] && <p role="alert" className="mt-1 text-xs text-red-700">{result.errors[path]}</p>}
          </div>
        })}
      </div>
    </details>)
  }
  if (!active) return null
  return <div className="bg-slate-50 pb-10 pt-6">
    <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-widest text-teal-700">Provider perspective · Three-year feasibility</p>
          <h1 className="mt-2 text-3xl font-extrabold text-slate-900">Community pharmacy vs integrated clinic</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Compare the same program and patient mix across two delivery settings and three payment scenarios. Both settings use receipts minus delivery costs to measure operating margin.</p>
          <p className="mt-2 text-sm font-medium text-amber-800">Published wage and fee benchmarks with explicitly assumed eligibility, collections and delivery costs. Results are conditional projections, not observed profitability. Act passage remains hypothetical.</p>
        </div>
        <button className={buttonClass} onClick={reset}>Reset provider assumptions</button>
      </div>

      <section className="card" aria-label="Provider scenario controls">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">Comparison name<input className={inputClass} value={name} maxLength={160} onChange={e => setName(e.target.value)} /></label>
          <label className="text-sm font-semibold text-slate-700">Local contract and cost notes<textarea className={inputClass} value={notes} rows={2} maxLength={10000} onChange={e => setNotes(e.target.value)} placeholder="Record payer/clinic contracts, eligible populations, fee assumptions and local costs." /></label>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button className="btn-primary disabled:opacity-40" disabled={!result.isComplete || busy} onClick={() => exportFile('json')}>Save six-scenario JSON</button>
          <button className={buttonClass} disabled={!result.isComplete || busy} onClick={() => exportFile('csv')}>Export provider CSV</button>
          <button className={buttonClass} disabled={busy} onClick={() => fileInput.current.click()}>Load provider JSON</button>
          <input ref={fileInput} type="file" accept=".json,application/json" className="hidden" aria-label="Provider comparison JSON file" onChange={importFile} />
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">Provider model v{PROVIDER_MODEL.version}. Exports preserve all six scenarios, full precision, sources and assumptions. Integrated-system files use the separate budget tab.</p>
        {message && <p role="status" className={'mt-3 text-sm ' + (message.ok ? 'text-teal-800' : 'text-red-700')}>{message.text}</p>}
      </section>

      <section className="card" aria-label="How reimbursement is modeled">
        <h2 className="text-lg font-bold text-slate-900">What each payment scenario assumes</h2>
        <div className="mt-3 grid gap-4 text-sm leading-6 text-slate-600 md:grid-cols-3">
          <p><strong className="text-slate-900">Current reimbursement</strong><br />Paid RPM is assumed in both settings. Pharmacy: CDTA plus a service contract paying an assumed 80% of the collaborating billing practice’s RPM collections. Clinic: retains its own external RPM collections. Review-payment assumptions remain separate.</p>
          <p><strong className="text-slate-900">Assumed Act passage</strong><br />Retains current receipts and adds hypothetical payments for a separate, previously unpaid eligible share. Default Act RPM eligibility is 0%.</p>
          <p><strong className="text-slate-900">No added reimbursement</strong><br />No new receipts for this program. Delivery costs and ordinary overhead remain; claim-specific and Act-specific costs are excluded.</p>
        </div>
        <p className="mt-4 rounded-lg bg-teal-50 p-3 text-sm leading-6 text-teal-900"><strong>Same financial perspective:</strong> the clinic is a service provider, excluding its parent health plan. Avoided drug and hospital spending and own-plan internal transfers are not new provider income. The default payment arrangements differ; results do not establish that one setting is inherently more profitable.</p>
        <p className="mt-3 text-xs leading-5 text-slate-600">Act formula: allowed amount = min(charge, 85% × assumed physician fee benchmark); expected receipt = allowed amount × payment realization × (80% + 20% × patient-share collection). The $100 starting benchmarks are illustrative, with no CPT code assigned. <a className="font-semibold text-teal-700 underline" target="_blank" rel="noreferrer" href={PROVIDER_MODEL.citations[0].url}>Read the introduced bill</a>.</p>
      </section>

      <section className="card" aria-label="Evidence behind the provider defaults">
        <h2 className="text-lg font-bold text-slate-900">Evidence behind the defaults</h2>
        <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="bg-slate-100"><th className="p-3">Reference input</th><th className="p-3">Community pharmacy</th><th className="p-3">Integrated clinic</th></tr></thead><tbody>
          <tr className="border-b"><th className="p-3 font-medium">2024 pharmacist wage</th><td className="p-3">$60.11/hour · independent</td><td className="p-3">$80.61/hour · ambulatory care</td></tr>
          <tr className="border-b"><th className="p-3 font-medium">Employment-cost assumptions</th><td colSpan={2} className="p-3">30% load; 100% productive time; wages carried forward with no growth. Management starts at 20 pharmacist minutes plus 0 other clinical-staff minutes per active month. Editable assumptions, not mandatory pharmacist time.</td></tr>
          <tr className="border-b"><th className="p-3 font-medium">Initial review payment</th><td className="p-3">Historical $50 fee; assumed 50% eligibility and 90% collection. Sensitivity: $35–$75.</td><td className="p-3">$0 until a separate payment pathway is specified.</td></tr>
          <tr><th className="p-3 font-medium">RPM payment</th><td className="p-3">CDTA + paid contract; assumed 80% of billing-practice RPM collections. The retained share is editable and not a published rate.</td><td className="p-3">2026 fees: $21.71 setup + $52.11 data + $51.77 for 20-minute management, only when each qualifies.</td></tr>
        </tbody></table></div>
        <p className="mt-3 text-xs leading-5 text-slate-600">References: {sourceLink('wages')}; {sourceLink('cmr')}; {sourceLink('rpmFees')}. These reference values stay visible when you edit inputs. The broader community wage average is $67.94/hour. Source wages and the historical CMR fee are not inflation-adjusted automatically.</p>
        <p className="mt-3 text-xs leading-5 text-amber-900">Reference defaults assume 100% of RPM participants have an external payment pathway in both settings, with 80% qualification for each code, 90% payment realization and 80% collection of the patient portion. The pharmacy then retains 80% under its assumed service contract. These percentages are scenario assumptions, not observed study estimates. Device, staffing, technology and overhead costs remain assumptions.</p>
      </section>

      <section className="card" aria-label="CDTA and paid RPM arrangement">
        <h2 className="text-lg font-bold text-slate-900">CDTA plus a paid RPM arrangement</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">This scenario assumes an appropriate collaborative drug therapy agreement and a separate payment arrangement. The pharmacy’s collaborating practitioner bills for qualifying RPM services; the pharmacy receives its contracted amount. The clinic bills through its eligible practitioner. CDTA authority alone does not establish payment or a fee.</p>
        <p className="mt-2 text-xs leading-5 text-slate-600">References: {sourceLink('cdta')} (state example); {sourceLink('cms')}; {sourceLink('rpmContract')} (contracting example, without a published retained percentage).</p>
        {result.isComplete && <>
          <div className="mt-3 overflow-x-auto"><table className="w-full text-sm text-right"><thead><tr className="bg-slate-100"><th className="p-3 text-left">Annual RPM payment flow</th>{currentSettings.map(s => <th className="p-3" key={s.id}>{s.settingName}</th>)}</tr></thead><tbody>
            <tr className="border-b border-slate-100"><th className="p-3 text-left font-medium">Participants with a payment pathway</th>{currentSettings.map(s => <td className="p-3" key={s.id}>{number(inputs.settings[s.settingId].currentRpmShare * 100)}%</td>)}</tr>
            <tr className="border-b border-slate-100"><th className="p-3 text-left font-medium">Payment arrangement</th>{currentSettings.map(s => <td className="p-3 text-xs" key={s.id}>{getSettingFields(s.settingId).rpmPaymentBasis.options[inputs.settings[s.settingId].rpmPaymentBasis]}</td>)}</tr>
            {['rpmBillingPracticeReceipts', 'rpmPartnerRetainedRevenue', 'currentRpmRevenue'].map(key => <tr className="border-b border-slate-100" key={key}><th className="p-3 text-left font-medium">{PROVIDER_OUTPUTS[key]}</th>{currentSettings.map(s => <td className="p-3 tabular-nums" key={s.id}>{key !== 'currentRpmRevenue' && inputs.settings[s.settingId].rpmPaymentBasis === 0 ? 'Not used in fixed-contract mode' : money(s.years[0][key])}</td>)}</tr>)}
          </tbody></table></div>
          <p className="mt-3 text-xs leading-5 text-slate-600">Only total current RPM receipts enter provider income. Billing-practice collections are a reference subtotal; the partner remainder is excluded, not charged again as a provider expense. In benchmark-derived contract mode, the provider receives {number(inputs.settings.pharmacy.rpmContractRetainedShare * 100)}% of the pharmacy partner’s collections. Local contract administration is charged per covered active month; clinic direct billing is charged per submitted code.</p>
        </>}
      </section>

      {!result.isComplete ? <section className="card" role="status"><h2 className="font-bold text-red-800">Complete the provider assumptions</h2><ul className="mt-2 list-disc pl-5 text-sm text-red-700">{Object.entries(result.errors).map(([key, text]) => <li key={key}>{inputLabel(key)}: {text}</li>)}</ul></section> : <>
        <section className="card !px-0" aria-label="Six-scenario financial comparison">
          <h2 className="px-5 text-xl font-bold text-slate-900">Financial feasibility comparison</h2>
          <p className="mt-2 px-5 text-sm text-slate-600">{number(inputs.common.annualEnrollment)} new participants per year in each setting; {number(inputs.common.annualEnrollment * inputs.common.rpmShare)} also start RPM. Projection dollar year: {inputs.common.priceYear}; historical sources are carried forward under the stated assumptions.</p>
          <p className="mt-1 px-5 text-xs text-slate-500">Positive margin = surplus. Negative margin = funding gap. Break-even is constant annual enrollment across three years.</p>
          <div className="mt-4 overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="bg-slate-100 text-right text-slate-600">{['Setting', 'Reimbursement scenario', 'Year 1 margin', '3-year receipts', '3-year costs', '3-year margin', 'Break-even annual enrollment'].map((s, i) => <th className={'p-3 ' + (i < 2 ? 'text-left' : '')} key={s}>{s}</th>)}</tr></thead>
            <tbody>{result.scenarios.map(s => <tr className="border-b border-slate-100" key={s.id}>
              <th className="p-3 text-left font-semibold text-slate-800">{s.settingName}</th><td className="p-3 text-slate-600">{s.policyName}</td>
              <td className="whitespace-nowrap p-3 text-right tabular-nums">{money(s.years[0].margin)}</td>
              <td className="whitespace-nowrap p-3 text-right tabular-nums">{money(s.cumulative.revenue)}</td><td className="whitespace-nowrap p-3 text-right tabular-nums">{money(s.cumulative.totalCost)}</td>
              <td className={'whitespace-nowrap p-3 text-right font-bold tabular-nums ' + (s.cumulative.margin >= 0 ? 'text-teal-800' : 'text-amber-900')}>{money(s.cumulative.margin)}</td>
              <td className="p-3 text-right">{s.breakEvenEnrollment === null ? 'Not attainable at these unit economics' : number(s.breakEvenEnrollment)}</td>
            </tr>)}</tbody>
          </table></div>
          <p className="mt-3 px-5 text-xs leading-5 text-slate-500">Break-even assumes unchanged patient mix, linear variable costs and sufficient staff capacity. If receipts per participant do not cover variable costs, more enrollment cannot cover fixed overhead. Differences reflect wages and selected payment arrangements, not a measured advantage of either setting.</p>
        </section>
        <section className="card" aria-label="RPM spending and workload audit">
          <h2 className="text-lg font-bold text-slate-900">Check the pharmacist workload</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Minutes are per active patient-month, not per day. Recurring pharmacist hours = active patient-months × pharmacist minutes ÷ 60. Onboarding is charged once per new RPM episode. A billing threshold can include other eligible clinical staff; it is not a required amount of pharmacist time for every patient.</p>
          <div className="mt-3 overflow-x-auto"><table className="w-full text-sm text-right"><thead><tr className="bg-slate-100"><th className="p-3 text-left">Annual workload in each model year</th>{currentSettings.map(s => <th key={s.id} className="p-3">{s.settingName}</th>)}</tr></thead><tbody>
            {['rpmStarts', 'rpmMonths', 'rpmManagementPharmacistHours', 'rpmOnboardingPharmacistHours', 'reviewPharmacistHours', 'pharmacistHours', 'rpmClinicalStaffHours', 'supportHours'].map(key => <tr key={key} className="border-b border-slate-100"><th className="p-3 text-left font-medium">{PROVIDER_OUTPUTS[key]}</th>{currentSettings.map(s => <td key={s.id} className="p-3 tabular-nums">{number(s.years[0][key])}</td>)}</tr>)}
          </tbody></table></div>
          <p className="mt-3 text-xs leading-5 text-slate-600">The total pharmacist row includes review, onboarding and recurring RPM hours; do not add the subtotal to its components. Technical support is nonclinical device help and cannot meet the management billing threshold. Employment costs value time used, even when existing staff provide it; these are not necessarily new salary payments.</p>
          <details className="mt-4 rounded-lg border border-slate-200 p-3">
            <summary className="cursor-pointer text-sm font-semibold text-slate-800">Where three-year spending goes under current payment pathways</summary>
            <div className="mt-3 overflow-x-auto"><table className="w-full text-xs text-right"><thead><tr className="bg-slate-100"><th className="p-3 text-left">Three-year cost or receipt</th>{currentSettings.map(s => <th key={s.id} className="p-3">{s.settingName}</th>)}</tr></thead><tbody>
              {['reviewStaffCost', 'rpmPharmacistCost', 'rpmClinicalStaffCost', 'supportStaffCost', 'deviceCost', 'technologyCost', 'claimCost', 'dispensingLoss', 'fixedCost', 'totalCost', 'revenue', 'margin'].map(key => <tr key={key} className="border-b border-slate-100"><th className="p-3 text-left font-medium">{PROVIDER_OUTPUTS[key]}</th>{currentSettings.map(s => <td key={s.id} className="p-3 tabular-nums">{money(s.cumulative[key])}</td>)}</tr>)}
            </tbody></table></div>
            <p className="mt-2 text-xs leading-5 text-slate-600">Costs accrue for all delivered services. Both settings have an assumed paid RPM pathway; code qualification, collections and any partner allocation reduce retained receipts. Device purchase, technology, overhead, startup, support costs and collection percentages remain assumptions. Fixed costs are incremental program expenses; do not enter overhead already included elsewhere.</p>
          </details>
          <p className="mt-4 text-xs leading-5 text-slate-600">Workload evidence: HealthPartners HyperLink reported 11.4 pharmacist encounters at 34.2 minutes each during a 12-month intervention—approximately 390 minutes per patient by multiplying the reported means. This more intensive historical program is context, not a universal time requirement or a calibration for this six-month scenario. {sourceLink('rpmTime')}. Staffing rules: {sourceLink('cms')}.</p>
        </section>
        <details className="card">
          <summary className="cursor-pointer font-bold text-slate-800">Annual receipts, costs and workload</summary>
          <label className="mt-4 block text-sm font-semibold text-slate-700">Detailed provider scenario<select value={detail} onChange={e => setDetail(e.target.value)} className={inputClass}>{result.scenarios.map(s => <option key={s.id} value={s.id}>{s.settingName} · {s.policyName}</option>)}</select></label>
          <div className="mt-4 overflow-x-auto"><table className="w-full text-xs"><thead><tr className="bg-slate-100 text-right"><th className="p-3 text-left">Measure</th>{['Year 1', 'Year 2', 'Year 3', '3-year total'].map(t => <th className="p-3" key={t}>{t}</th>)}</tr></thead>
            <tbody>{[...detailKeys, 'reviews', 'rpmStarts', 'rpmMonths', 'rpmSetupUnits', 'rpmDeviceUnits', 'rpmManagementUnits', 'reviewPharmacistHours', 'rpmOnboardingPharmacistHours', 'rpmManagementPharmacistHours', 'pharmacistHours', 'rpmClinicalStaffHours', 'supportHours', 'newStops'].map(key => <tr key={key} className="border-b border-slate-100"><th className="p-3 text-left font-medium">{PROVIDER_OUTPUTS[key]}</th>{[...selected.years, selected.cumulative].map((row, i) => <td className="whitespace-nowrap p-3 text-right tabular-nums" key={i}>{detailKeys.includes(key) ? money(row[key]) : number(row[key])}</td>)}</tr>)}</tbody>
          </table></div>
          <p className="mt-3 text-xs text-slate-500">Expected counts may be fractional. Staff costs and total pharmacist hours are subtotals of the component rows, not extra costs or hours. Billing-practice collections and the partner remainder explain the payment flow and must not be added to provider receipts. Clinical outcomes are shared across reimbursement scenarios. Discontinuations affect provider margin only when a dispensing contribution assumption is entered.</p>
        </details>
        <section className="card" aria-label="Observed RPM reimbursement context">
          <h2 className="text-lg font-bold text-slate-900">Observed clinic collections: context, not a monthly rate</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Ohio State reported $96.30 per enrolled patient in phase 1 (140 patients) and $124.17 in phase 2 (167 patients), during 2022–2024 observation. These are total collections over observation, not monthly payments or profit. Different durations, populations and incomplete episodes prevent direct calibration. {sourceLink('ohio')}.</p>
          <p className="mt-2 text-sm text-slate-700">Your clinic current-pathway projection: {inputs.common.annualEnrollment * inputs.common.rpmShare > 0 ? rate(result.scenarios.find(s => s.id === 'clinic-current').years[0].currentRpmRevenue / (inputs.common.annualEnrollment * inputs.common.rpmShare)) + ' per new RPM enrollee across the modeled episode' : 'no RPM enrollees'}. Includes unpaid enrollees; excludes review and Act receipts.</p>
        </section>
      </>}

      <section className="card" aria-label="Shared provider assumptions">
        <h2 className="text-lg font-bold text-slate-900">Shared population, clinical and policy assumptions</h2>
        <p className="mt-2 mb-4 text-sm text-slate-600">All six scenarios use the same population and clinical inputs. Each annual cohort starts January 1 and receives one initial review. This provider model has its own inputs; editing the health-system tab does not change them.</p>
        <div className="space-y-3">{fields(COMMON_FIELDS, 'common', inputs.common)}</div>
      </section>
      <section className="card" aria-label="Setting-specific provider assumptions">
        <h2 className="text-lg font-bold text-slate-900">Costs and payment arrangements by setting</h2>
        <label className="mt-3 block max-w-md text-sm font-semibold text-slate-700">Setting to edit<select className={inputClass} value={setting} onChange={e => setSetting(e.target.value)}>{Object.entries(SETTINGS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <p className="mb-4 mt-3 text-sm leading-6 text-slate-700">Calculated pharmacist employment cost: {['pharmacistRate', 'wageYearFactor', 'employmentLoad', 'productiveShare'].some(k => result.errors['settings.' + setting + '.' + k]) ? 'complete the wage inputs' : rate(providerLoadedWage(inputs.settings[setting])) + '/productive hour'}. Base wage × year adjustment × (1 + employment load) ÷ productive share.</p>
        <p className="mb-4 text-xs leading-5 text-slate-500">Every input shows its source or assumption label. A citation supports its reference default only. Dispensing-margin effects remain zero until locally estimated. Qualification and collection controls appear for direct Medicare benchmarks and benchmark-derived contracts. Select fixed net contract mode to enter an agreed monthly receipt directly.</p>
        <div className="space-y-3">{fields(getSettingFields(setting), setting, inputs.settings[setting])}</div>
      </section>
      <details className="card">
        <summary className="cursor-pointer font-bold text-slate-800">Sources, reimbursement limits and model methods</summary>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-xs leading-5 text-slate-600">{PROVIDER_MODEL.assumptions.map(t => <li key={t}>{t}</li>)}</ul>
        <ul className="mt-4 space-y-2 text-xs leading-5">{PROVIDER_MODEL.citations.map(c => <li key={c.url}><a className="font-semibold text-teal-700 underline" href={c.url} target="_blank" rel="noreferrer">{c.title}</a>{c.supports && <span className="text-slate-600"> — {c.supports}</span>}</li>)}</ul>
      </details>
    </div>
  </div>
}
