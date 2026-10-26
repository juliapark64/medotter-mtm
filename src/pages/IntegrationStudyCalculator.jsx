import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useIntegrationStudy } from '../context/IntegrationStudyContext'
import { DEFAULT_INTEGRATION_INPUTS, INPUT_DEFINITIONS, createIntegrationExport, expectedIntegrationStudy, findOfferThreshold, getIntegrationScenarios, getRpmPaymentSchedule, integrationExportCsv, validateIntegrationInputs, verifyIntegrationExport } from '../lib/integrationStudy'
import { FINANCIAL_EVIDENCE } from '../data/integrationFinancialEvidence'
import '../styles/integrationStudy.css'

const TABS = ['Overview', 'RPM recruitment', 'Deprescribing', 'Financial return', 'Evidence & scenarios']
const METHODS = 'https://github.com/juliapark64/medotter-mtm/blob/main/docs/integration-study-methods.md'
const known = value => typeof value === 'number' && Number.isFinite(value)
const number = value => known(value) ? value.toLocaleString('en-US', { maximumFractionDigits: 1 }) : 'Not estimated'
const money = value => known(value) ? value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }) : 'Not estimated'
const rate = value => known(value) ? value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'Not estimated'
const percent = value => known(value) ? `${number(value * 100)}%` : 'Not estimated'
const options = { consolidated: 'Consolidated integrated system', clinic: 'Clinic operating margin', none: 'No added deprescribing benefit', illustrative: 'Illustrative deprescribing assumptions', unestimated: 'Clinical benefits not estimable' }
const paymentOptions = { medicare2026: '2026 Medicare benchmarks', custom: 'Custom payment contract', none: 'No RPM reimbursement' }
const costRows = [
  ['reviews', 'Added pharmacist medication reviews'], ['offers', 'Pharmacist recruitment offers'], ['supportOffers', 'Staff recruitment assistance'],
  ['onboarding', 'Pharmacist onboarding'], ['supportOnboarding', 'Staff onboarding'],
  ['pharmacistMonitoring', 'Pharmacist clinical monitoring'], ['technicalSupport', 'Non-pharmacist RPM service'],
  ['physicianReferrals', 'Usual physician referrals'], ['devices', 'One-time vendor/device package'], ['software', 'RPM technology bundle'],
  ['connectivity', 'Assumed connectivity'], ['platformBase', 'Shared platform subscription'], ['otherFixed', 'Other program overhead'], ['addedFixed', 'Added integration overhead']
].map(([key, label]) => ({ key, label, cost: true, format: money }))
const citations = [
  ['UCSD physician referral', '11.8% is a mean physician-level rate from two years of records. Its use as an annual patient probability is a transfer assumption.', 'https://www.jmir.org/2025/1/e64933/'],
  ['UCSD RPM uptake', '53% had a first transmission after referral. Transferring uptake to pharmacist offers is assumed. Monthly reading participation does not establish annual retention.', 'https://pages.ucsd.edu/~yfadlon/pdfs/Digital_Health.pdf'],
  ['PQA / historical CMR completion', '84% applies to a defined MA-PD MTM population, not all RPM-eligible members. The review-population share remains a separate assumption.', 'https://www.pqa.org/wp-content/uploads/2025/10/PQA-QuIRC-MTM-Report.pdf'],
  ['MINOR baseline and subgroup', 'The 23% low-BP prevalence is transferred from older Brazilian patients. Low BP prompts assessment; it does not establish overtreatment. The subgroup prescription-count reduction cannot be used as a patient action probability.', 'https://ojs.jaff.org.br/ojs/index.php/jaff/article/view/1367'],
  ['MINOR medication reduction', 'Both trial groups received home monitoring. The study does not validate the illustrative 10% and 30% action probabilities or prove MTM–RPM synergy.', 'https://link.springer.com/article/10.1007/s11096-024-01805-y'],
  ['Deprescribing maintenance', '69.4% is conditional patient-level maintenance at 12 months among 108 already-deprescribed patients in Singapore. One medicine per action and constant monthly restart risk are additional assumptions.', 'https://pubmed.ncbi.nlm.nih.gov/41505212/'],
]

function download(text, filename, type) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function Metric({ label, value, note, emphasis = false }) {
  return <article className={`study-metric ${emphasis ? 'study-metric-primary' : ''}`}><p>{label}</p><strong>{value}</strong><span>{note}</span></article>
}

function Parameter({ name, draft, setDraft, errors }) {
  const d = INPUT_DEFINITIONS[name]
  const value = draft[name]
  const isPercent = d.unit === 'probability'
  const reference = typeof d.default === 'string' ? (name === 'reimbursementMode' ? paymentOptions : options)[d.default] || d.default : isPercent ? percent(d.default) : d.unit.startsWith('USD') ? rate(d.default) : number(d.default)
  const displayed = value === null || value === '' ? '' : isPercent ? Number((value * 100).toFixed(8)) : typeof value === 'number' ? Number(value.toFixed(d.unit === 'USD/hour' ? 2 : 8)) : value
  const update = e => {
    const next = d.options ? e.target.value : e.target.value === '' ? (d.nullable ? null : '') : Number(e.target.value) / (isPercent ? 100 : 1)
    setDraft(old => ({ ...old, [name]: next }))
  }
  return <div className="study-field">
    <label htmlFor={`study-${name}`}>{d.label}<span>{isPercent ? '%' : d.unit}</span></label>
    {d.options ? <select id={`study-${name}`} value={value} onChange={update} aria-describedby={`study-help-${name}`}>{d.options.map(option => <option key={option} value={option}>{(name === 'reimbursementMode' ? paymentOptions : options)[option] || option}</option>)}</select>
      : <input id={`study-${name}`} type="number" value={displayed} min={d.min * (isPercent ? 100 : 1)} max={d.max * (isPercent ? 100 : 1)} step={d.step === 'any' ? 'any' : d.step * (isPercent ? 100 : 1)} onChange={update} placeholder={d.nullable ? 'Not specified' : undefined} aria-invalid={!!errors[name]} aria-describedby={`study-help-${name}`} />}
    <p id={`study-help-${name}`}>{d.description}{d.nullable && ' Leave blank to keep unspecified.'}</p>
    <div className="study-field-source"><span>{(d.sourceUrls?.length > 0 || d.sourceNotes) && value !== d.default ? `Edited assumption · reference ${reference}` : d.evidenceType}</span>{d.sourceUrls?.map((url, i) => <a key={url} href={url} target="_blank" rel="noreferrer">Source{d.sourceUrls.length > 1 ? ` ${i + 1}` : ''} ↗</a>)}</div>
    {d.sourceNotes && <p className="study-source-note">{Array.isArray(d.sourceNotes) ? d.sourceNotes.join(' ') : d.sourceNotes}</p>}
    {errors[name] && <p className="study-error">{errors[name]}</p>}
  </div>
}

function Comparison({ result, rows }) {
  return <div className="study-table-wrap"><table className="study-table"><thead><tr><th scope="col">Endpoint</th><th scope="col">Current program</th><th scope="col">With pharmacist integration</th><th scope="col">Added contribution</th></tr></thead><tbody>{rows.map(({ key, label, format = number, clinical, cost }) => <tr key={key}><th scope="row">{label}</th>{['baseline', 'integrated', 'delta'].map(arm => <td key={arm}>{format(clinical ? result[arm].clinical[key] : cost ? result[arm].costBreakdown[key] : result[arm][key])}</td>)}</tr>)}</tbody></table></div>
}

function PaymentSchedule({ inputs, draft = false }) {
  const errors = validateIntegrationInputs(inputs)
  if (Object.keys(errors).length) return <p className="study-copy">Complete valid inputs to preview the payment calculation.</p>
  const schedule = getRpmPaymentSchedule(inputs)
  const recurringReceipt = schedule.monthlyBenchmark * inputs.qualificationShare * inputs.collectionShare * inputs.externalPayerShare
  return <div className="study-payment-summary">
    <p className="study-eyebrow">{draft ? 'Input preview · apply to update results' : 'Applied payment assumptions'}</p>
    <div className="study-payment-values">
      <div><span>Allowed / contracted recurring amount</span><strong>{rate(schedule.monthlyBenchmark)}<small> / qualifying month</small></strong></div>
      <div><span>Expected outside receipts</span><strong>{rate(recurringReceipt)}<small> / active month</small></strong></div>
      <div><span>Setup allowance</span><strong>{rate(schedule.setupFee)}<small> / qualifying new episode</small></strong></div>
    </div>
    {inputs.reimbursementMode === 'medicare2026' ? <>
      <p>{schedule.deviceCodeLabel}: {rate(schedule.deviceFee)} + {schedule.managementCode || 'no qualifying management code'}{schedule.additionalUnits > 0 ? ` + ${schedule.additionalUnits} × 99458` : ''}: {rate(schedule.managementFee)}. Qualifying clinical time: {number(schedule.qualifyingClinicalMinutes)} minutes/month = {number(inputs.monitorPharmacistMinutes)} pharmacist + {number(inputs.qualifiedSupportMinutes)} supervised staff minutes. The remaining {number(inputs.monitorSupportMinutes - inputs.qualifiedSupportMinutes)} staff minutes are excluded from the billing threshold.</p>
      <p>National nonfacility 2026 allowed amounts; locality and practitioner adjustments may differ. Data and management codes are alternatives within each category. Qualifying time must include the required patient/caregiver interaction and all other service requirements.</p>
    </> : <p>{inputs.reimbursementMode === 'none' ? 'All RPM collections are zero; staffing, devices, reviews and other service costs remain.' : 'Contract amounts are user assumptions. This mode does not assert Medicare code eligibility or infer clinical effectiveness.'}</p>}
    <p>Recurring receipts = benchmark × {percent(inputs.qualificationShare)} qualifying months × {percent(inputs.collectionShare)} collection realization × {percent(inputs.externalPayerShare)} external payer share. Setup is separate, once per new qualifying episode; {percent(inputs.setupQualificationShare)} setup qualification is assumed.</p>
    <a className="study-text-link" href="https://www.medpac.gov/wp-content/uploads/2026/03/Mar26_Ch4_MedPAC_Report_To_Congress_SEC.pdf" target="_blank" rel="noreferrer">2026 fee source · MedPAC Table 4-8 ↗</a>
  </div>
}

function TeamStaffingSummary({ inputs, draft = false }) {
  if (Object.keys(validateIntegrationInputs(inputs)).length) return null
  const pharmacistCost = inputs.monitorPharmacistMinutes / 60 * inputs.pharmacistWage
  const staffCost = inputs.monitorSupportMinutes / 60 * inputs.supportWage
  const totalMinutes = inputs.monitorPharmacistMinutes + inputs.monitorSupportMinutes
  return <div className="study-team-summary">
    <p className="study-eyebrow">{draft ? 'Staffing preview · apply to update results' : 'Applied team staffing'}</p>
    <div className="study-payment-values">
      <div><span>Pharmacist monitoring</span><strong>{number(inputs.monitorPharmacistMinutes)} min<small>{rate(pharmacistCost)} per active month</small></strong></div>
      <div><span>Non-pharmacist RPM service</span><strong>{number(inputs.monitorSupportMinutes)} min<small>{rate(staffCost)} per active month</small></strong></div>
      <div><span>Total recurring labor</span><strong>{rate(pharmacistCost + staffCost)}<small>{number(totalMinutes)} minutes per active month</small></strong></div>
    </div>
    <p><b>{number(inputs.monitorPharmacistMinutes + inputs.qualifiedSupportMinutes)} qualifying clinical minutes</b> include {number(inputs.qualifiedSupportMinutes)} of the {number(inputs.monitorSupportMinutes)} staff minutes. Qualifying staff time is a subset, not additional labor. The other {number(inputs.monitorSupportMinutes - inputs.qualifiedSupportMinutes)} minutes cover nonclinical work.</p>
    <p>Each offer uses {number(inputs.offerMinutes)} pharmacist + {number(inputs.offerSupportMinutes)} staff minutes. Each unique new start uses {number(inputs.onboardingMinutes)} pharmacist + {number(inputs.onboardingSupportMinutes)} staff onboarding minutes. Added medication review and deprescribing follow-up remain {number(inputs.reviewMinutes)} pharmacist minutes per completed review.</p>
    <p>The default adapts the cashbook’s 10% pharmacist / 90% technician service mix while retaining the prior 30-minute monthly workload. Qualifying supervised treatment-management time is assumed for this scenario; a technician credential or CDTA alone does not establish eligibility. The evidence tab includes a case excluding staff time from reimbursement.</p>
  </div>
}

export default function IntegrationStudyCalculator() {
  const { inputs, run, applyInputs, notice, setNotice } = useIntegrationStudy()
  const [draft, setDraft] = useState(inputs)
  const [errors, setErrors] = useState({})
  const [tab, setTab] = useState('Overview')
  const [basis, setBasis] = useState('expected')
  const [busy, setBusy] = useState(false)
  const fileInput = useRef(null)
  useEffect(() => { setDraft(inputs); setErrors({}) }, [inputs])
  const dirty = JSON.stringify(draft) !== JSON.stringify(inputs)
  const result = run[basis]
  const delta = result.delta
  const scenarios = useMemo(() => getIntegrationScenarios(inputs).map(s => ({ ...s, result: expectedIntegrationStudy(s.inputs) })), [inputs])
  const threshold = useMemo(() => tab === 'Financial return' ? findOfferThreshold(inputs) : null, [inputs, tab])
  const retained = inputs.perspective === 'consolidated' ? known(delta.drugSavings) ? delta.drugSavings * inputs.retainedDrugSavingsShare : null : 0
  const expectedRetained = inputs.perspective === 'consolidated' ? known(run.expected.delta.drugSavings) ? run.expected.delta.drugSavings * inputs.retainedDrugSavingsShare : null : 0
  const collectionsDenominator = inputs.reimbursementMode === 'none' ? 0 : run.expected.delta.qualifiedMonths * inputs.collectionShare * inputs.externalPayerShare
  const revenueGap = known(expectedRetained) ? run.expected.delta.programCost - expectedRetained - run.expected.delta.setupRevenue : null
  const breakEvenRevenue = !known(run.expected.delta.netFinancialBenefit) ? null : revenueGap <= 0 ? 0 : collectionsDenominator > 0 ? revenueGap / collectionsDenominator : null
  const financialGap = known(run.expected.delta.netFinancialBenefit) ? Math.max(0, -run.expected.delta.netFinancialBenefit) : null
  const costReduction = known(financialGap) && run.expected.delta.programCost > 0 ? financialGap / run.expected.delta.programCost : null
  const editDraft = update => {
    setDraft(update)
    setErrors({})
    if (notice === 'Please correct the highlighted inputs before applying this scenario.') setNotice(null)
  }
  const fields = names => <div className="study-fields">{names.map(name => <Parameter key={name} name={name} draft={draft} setDraft={editDraft} errors={errors} />)}</div>
  const apply = next => {
    const nextErrors = validateIntegrationInputs(next)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) { setNotice('Please correct the highlighted inputs before applying this scenario.'); return }
    applyInputs(next); setNotice('Scenario applied to the calculator and microsimulation. Playback starts again with the same seed.')
  }
  const save = type => {
    try {
      const bundle = createIntegrationExport(run)
      download(type === 'json' ? JSON.stringify(bundle, null, 2) : integrationExportCsv(bundle), `mtm-integration-seed-${inputs.seed}.${type}`, type === 'json' ? 'application/json' : 'text/csv;charset=utf-8')
      setNotice(`Exported applied scenario ${type.toUpperCase()}. ${dirty ? 'Unapplied edits were not included.' : 'Inputs, evidence notes, and results are included.'}`)
    } catch (error) { setNotice(`Export failed: ${error.message}`) }
  }
  const load = async event => {
    const file = event.target.files?.[0]; event.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      if (file.size > 35 * 1024 * 1024) throw new Error('Select a JSON export smaller than 35 MB.')
      const bundle = verifyIntegrationExport(JSON.parse(await file.text()))
      applyInputs(bundle.inputs); setNotice('Verified and loaded: all saved patient records and results match an exact replay.')
    } catch (error) { setNotice(`Import failed: ${error.message}`) }
    finally { setBusy(false) }
  }

  return <div className="integration-study">
    <section className="study-hero"><div className="study-shell">
      <div className="study-eyebrow">MTM + RPM · study planning</div>
      <h1>Contribution of<br /><span>pharmacist integration.</span></h1>
      <p>Explore how added recruitment and appropriate deprescribing could change the financial return of an existing RPM program.</p>
      <div className="study-hero-bottom"><span>12-month budget · same eligible population · hypothetical estimates</span><Link to="/simulation">Watch the microsimulation <span aria-hidden="true">↗</span></Link></div>
    </div></section>

    <div className="study-shell study-body">
      <div className="study-scenario-bar"><div><strong>{options[inputs.perspective]}</strong><p>{paymentOptions[inputs.reimbursementMode]} · {options[inputs.clinicalMode]}</p><p>{number(inputs.N)} eligible members · seed {inputs.seed} · model {run.metadata.version}</p></div><label htmlFor="study-result-basis">Results shown<select id="study-result-basis" value={basis} onChange={e => setBasis(e.target.value)}><option value="expected">Expected values</option><option value="actual">Seeded synthetic realization</option></select></label></div>
      <div className="study-metrics">
        <Metric emphasis label="Additional net financial benefit" value={money(delta.netBenefitPer1000)} note="Per 1,000 eligible members in year one. Positive = financial improvement; negative = deterioration." />
        <Metric label="Additional RPM starts" value={number(delta.newInitiations)} note="Unique patients with a first BP transmission, beyond the current program." />
        <Metric label="Additional sustained reductions" value={number(delta.clinical.sustainedAt12Months)} note="Medication reductions maintained 12 months after action; one medicine per action assumed." />
      </div>
      <p className="study-result-note">{basis === 'expected' ? 'Analytic expectations may be fractional. ' : 'This seeded synthetic sample may differ from the expectation. ' }Starts and medicines are counts for the applied cohort; only the financial card is standardized per 1,000. No study patient data have been collected.</p>
      <p className="study-assumption-note">Published fees, cost benchmarks and business-plan staffing assumptions are combined: {percent(inputs.externalPayerShare)} external payer share, {percent(inputs.qualificationShare)} qualifying months, and {number(inputs.monitorPharmacistMinutes)} pharmacist + {number(inputs.monitorSupportMinutes)} staff minutes per active month. Of the staff time, {number(inputs.qualifiedSupportMinutes)} minutes are assumed to qualify as supervised clinical work. These are hypothetical program results, not Kaiser data.</p>
      {(inputs.externalPayerShare === 0 || inputs.reimbursementMode === 'none') && <div className="study-explanation"><strong>Why are collections zero here?</strong> {inputs.reimbursementMode === 'none' ? 'No RPM reimbursement is selected. Costs remain even when services are unpaid.' : 'The applied scenario assumes no external payer receipts. Payments within an owned plan and clinic cancel in consolidated accounting.'} Edit the payment pathway and external payer share in Financial return to model outside collections.</div>}
      {inputs.clinicalMode !== 'illustrative' && <p className="study-clinical-note">{inputs.clinicalMode === 'none' ? 'Conservative scenario: medication effects and savings are explicitly set to zero in both programs; review costs remain. Enable illustrative assumptions in Deprescribing to explore that contribution.' : 'Clinical effects are unspecified. Operating margin remains available; the total endpoint is withheld rather than treating unknown benefit as zero.'}</p>}

      <div className="study-tabs" role="tablist" aria-label="Study calculator sections">{TABS.map(name => <button key={name} id={`tab-${TABS.indexOf(name)}`} role="tab" aria-selected={tab === name} aria-controls="study-panel" onClick={() => setTab(name)}>{name}</button>)}</div>
      <div id="study-panel" role="tabpanel" aria-labelledby={`tab-${TABS.indexOf(tab)}`}>
        {tab === 'Overview' && <>
          <section className="study-card"><div className="study-section-heading"><div><p className="study-eyebrow">The research question</p><h2>What does adding the pharmacist contribute?</h2></div></div><p className="study-copy">Usual physician referrals continue in both scenarios. The integrated program adds MTM recruitment and medication review. A patient reached through both channels has one RPM episode; only starts beyond the current program are additional.</p><div className="study-flow">{[['01', 'MTM encounters', `${number(result.integrated.reviews)} completed reviews`], ['02', 'RPM participation', `${number(delta.newInitiations)} additional starts`], ['03', 'Medication assessment', `${number(delta.clinical.actions)} additional reductions`], ['04', 'Financial contribution', `${money(delta.netFinancialBenefit)} across the cohort`]].map(([step, title, value]) => <div key={step}><span>{step}</span><h3>{title}</h3><p>{value}</p></div>)}</div></section>
          <section className="study-card"><h2>Follow the added value</h2><p className="study-copy">One-year changes across the applied cohort, relative to the existing program. A positive change can mean a smaller loss; total operating margins appear below.</p><div className="study-bridge"><Metric label="+ External RPM collections" value={money(delta.revenue)} note={`${money(delta.monthlyRevenue)} recurring + ${money(delta.setupRevenue)} one-time setup; after qualification and collection assumptions`} /><Metric label="+ Retained medication savings" value={money(retained)} note={inputs.perspective === 'clinic' ? 'Excluded from clinic margin; no automatic transfer from the health plan.' : 'Net drug cost × year-one reduced-medication months × retained share'} /><Metric label="− Additional program costs" value={money(delta.programCost)} note="Reviews, offers, added RPM services, devices and implementation" /><Metric label="= Added net financial benefit" value={money(delta.netFinancialBenefit)} note="Incremental benefit or cost across the applied cohort" /></div><button className="study-small-button study-section-link" onClick={() => setTab('Financial return')}>Inspect reimbursement and costs →</button></section>
          <section className="study-card"><h2>Current program → with pharmacist integration</h2><Comparison result={result} rows={[{ key: 'totalParticipants', label: 'Unique RPM participants, including existing' }, { key: 'newInitiations', label: 'New RPM starts' }, { key: 'activeMonths', label: 'Active RPM patient-months' }, { key: 'sustainedAt12Months', label: 'Medicines reduced, sustained 12 months', clinical: true }, { key: 'operatingMargin', label: 'Operating margin in budget year', format: money }, { key: 'netFinancialBenefit', label: 'Net financial benefit in budget year', format: money }]} /></section>
        </>}
        {tab === 'RPM recruitment' && <>
          <section className="study-card"><h2>Reach people who would not otherwise start</h2><p className="study-copy">Completed reviews = eligible population × review-population share × completion probability. Offers are conditional on a completed review and the recontact rule. Referral alone never counts as enrollment. Already-enrolled members can receive medication review without becoming new RPM starts.</p>{fields(['N', 'seed', 'existingRpmShare', 'f', 'c', 'o', 'qB', 'recontactUptake'])}</section>
          <details className="study-card"><summary>Supplementary usual physician referral assumptions</summary><p className="study-copy">These referrals continue unchanged in both scenarios. This is background recruitment, not a comparison of professional performance. Higher pharmacist recruitment is an editable hypothesis.</p>{fields(['r', 'qA'])}</details>
          <section className="study-card"><h2>Service timing</h2><p className="study-copy">New starts use only the remaining budget-year months. Continuation and qualifying months are separate: outreach and monitoring can cost money even when a month produces no revenue.</p>{fields(['startMonth', 'monthlyRetention'])}<Comparison result={result} rows={[{ key: 'physicianReferrals', label: 'Usual physician referrals (supplementary)' }, { key: 'reviews', label: 'Added completed MTM reviews' }, { key: 'offers', label: 'Pharmacist RPM offers' }, { key: 'duplicateOffers', label: 'Offers overlapping physician referral' }, { key: 'newInitiations', label: 'Unique new RPM starts' }, { key: 'activeMonths', label: 'Active patient-months in year one' }]} /></section>
        </>}
        {tab === 'Deprescribing' && <>
          <section className="study-card"><h2>Medication review is a second contribution</h2><p className="study-copy">Review can support appropriate medication reduction for existing RPM patients and newly recruited patients. The model subtracts reductions under usual care and allows medications to restart. Low BP prompts assessment; it does not automatically justify stopping treatment.</p>{fields(['clinicalMode'])}<div className="study-explanation"><strong>What is and is not supported by evidence</strong> The illustrative 10% usual-care and 30% integrated action probabilities are investigator assumptions. MINOR’s 28.6% prescription-count reduction is not a patient probability. No symptom, fall, hospitalization, or cardiovascular savings are assigned.</div>{fields(['lowBpShare', 'actionBaseline', 'actionIntegrated', 'persistence12', 'drugCostPerMonth'])}</section>
          <section className="study-card"><h2>Separate the clinical and financial clocks</h2><p className="study-copy">Medication actions occur in the specified assessment month. A reduction sustained for 12 months can extend beyond the first budget year; year-one savings include only medication-months within months 1–12. One medicine per action and a constant monthly restart risk are explicit simplifying assumptions.</p><Comparison result={result} rows={[{ key: 'actions', label: 'Patients with a one-medicine reduction', clinical: true }, { key: 'sustainedAt12Months', label: 'Medicines still reduced 12 months after action', clinical: true }, { key: 'medicationMonths', label: 'Reduced-medication months in budget year', clinical: true }, { key: 'drugSavings', label: 'Net medication cost offset (before perspective)', format: money }]} /></section>
        </>}
        {tab === 'Financial return' && <>
          <section className="study-card">
            <h2>Define whose money is counted</h2>
            <p className="study-copy">Operating margin = external collections − program costs. Consolidated net benefit adds only the retained share of medication savings. Drug-cost liability is independent of the RPM payer mix. Internal transfers within an owned plan and clinic are excluded.</p>
            {fields(['perspective', 'externalPayerShare', 'retainedDrugSavingsShare'])}
          </section>
          <section className="study-card">
            <h2>Match reimbursement to the clinical work</h2>
            <p className="study-copy">Medicare mode uses cited 2026 national nonfacility benchmarks. The clinical management code uses pharmacist monitoring plus the specified qualifying portion of supervised staff time. Administrative and technical assistance, separate onboarding and medication review do not enter that threshold. Contract mode allows an alternative payment arrangement. Neither mode establishes billing eligibility.</p>
            {fields(['reimbursementMode'])}
            {draft.reimbursementMode === 'custom' && fields(['monthlyRevenueBenchmark', 'customSetupRevenueBenchmark'])}
            {fields(['qualificationShare', 'setupQualificationShare', 'collectionShare'])}
            <PaymentSchedule inputs={draft} draft={dirty} />
            <p className="study-copy">The qualifying-month share summarizes months meeting the selected recurring bundle requirements, including data transmission and clinical communication. It is not a daily claims model. Setup is charged once only for a qualifying new episode, never again for overlapping referrals or existing participants.</p>
          </section>
          <section className="study-card">
            <h2>Staff time and compensation</h2>
            <p className="study-copy">The default team uses the cashbook’s planned base wages of $55/hour for pharmacists and $24/hour for advanced technicians, with the BLS healthcare compensation ratio applied once for benefits. These are business-plan assumptions, not measured study costs. The pharmacist-heavy sensitivity retains the prior national BLS wage benchmarks.</p>
            <TeamStaffingSummary inputs={draft} draft={dirty} />
            {fields(['pharmacistWage', 'supportWage', 'monitorPharmacistMinutes', 'monitorSupportMinutes', 'qualifiedSupportMinutes', 'offerMinutes', 'offerSupportMinutes', 'reviewMinutes', 'onboardingMinutes', 'onboardingSupportMinutes', 'physicianReferralCost'])}
            <p className="study-copy">The same team allocation applies to existing and additional RPM participants. Staff hours include recurring service, recruitment assistance and onboarding, with no double counting of the clinical subset. Valued staff time measures resources used; it does not imply that salaried payroll immediately falls when tasks move between roles.</p>
            <div className="study-explanation"><strong>A billing threshold is not an observed workload</strong> NYU Langone reported 10 minutes of clinical review per week plus 15 minutes of monthly communication, approximately 55–58 minutes/month in its NP-led program. The higher-workload preset transfers this workload to pharmacists as a sensitivity; it does not assume improved clinical outcomes. <a className="study-text-link" href="https://pmc.ncbi.nlm.nih.gov/articles/PMC13016703/" target="_blank" rel="noreferrer">Read the study ↗</a></div>
          </section>
          <section className="study-card">
            <h2>Devices, software and overhead</h2>
            <p className="study-copy">The default uses the cashbook’s $90 one-time vendor/device package per new start and $12 technology bundle per active patient-month. The supplied scenario assumes these charges include the device, software and cellular connectivity, so extra connectivity and platform-base charges start at zero. These are business-plan contract assumptions, not public price benchmarks.</p>
            {fields(['deviceCost', 'monthlyTechnologyCost', 'monthlyConnectivityCost', 'monthlyPlatformBaseCost', 'platformProviderCount', 'fixedCost', 'addedFixedCost'])}
            <p className="study-copy">In-house pharmacist and staff onboarding labor remains separate from the vendor charge. Do not add component fees already included in the chosen package. If a separate platform subscription is entered, it is counted once in each program and cancels in the added contribution. Other fixed overhead excludes that subscription. Published component-price presets remain available for comparison.</p>
          </section>
          <section className="study-card">
            <h2>Where the money goes</h2>
            <p className="study-copy">Applied results across the full cohort. Each resource appears once, including service in months that do not produce collections. Positive cost differences mean more spending.</p>
            <Comparison result={result} rows={costRows} />
            <Comparison result={result} rows={[
              { key: 'pharmacistHours', label: 'Pharmacist hours in budget year' },
              { key: 'supportHours', label: 'Non-pharmacist staff hours, all tasks' },
              { key: 'qualifiedMonths', label: 'Qualifying recurring service months' },
              { key: 'qualifiedSetups', label: 'Qualifying unique new setups' },
              { key: 'monthlyRevenue', label: 'External recurring collections', format: money },
              { key: 'setupRevenue', label: 'External one-time setup collections', format: money },
              { key: 'revenue', label: 'Total external collections', format: money },
              { key: 'programCost', label: 'Total program costs', format: money },
              { key: 'operatingMargin', label: 'Operating margin', format: money },
              { key: 'netFinancialBenefit', label: 'Net benefit including retained drug savings', format: money }
            ]} />
          </section>
          <section className="study-card">
            <h2>What would make integration break even?</h2>
            <p className="study-copy">These thresholds use expected incremental net benefit. They address the added pharmacist role, which can still lose money when the whole program is profitable. A mathematical threshold is not a quoted reimbursement rate or a feasibility guarantee.</p>
            <div className="study-break-even">
              <div><h3>Minimum offer probability</h3><strong>{threshold?.status === 'unestimated' ? 'Not estimable' : known(threshold?.rate) ? percent(threshold.rate) : 'Not attainable'}</strong><p>{threshold?.status === 'unestimated' ? 'Clinical inputs must be specified before estimating total net benefit.' : threshold?.status === 'unattainable' ? 'No offer rate from 0% to 100% covers the added costs with the other applied assumptions.' : threshold?.status === 'already-nonnegative' ? 'Already nonnegative at a zero offer rate under the other assumptions.' : 'Offer probability among completed reviews, with the same eligibility and recontact rules.'}</p></div>
              <div><h3>Required recurring payment</h3><strong>{known(breakEvenRevenue) ? `${rate(breakEvenRevenue)}/month` : 'Not attainable / estimable'}</strong><p>{breakEvenRevenue === 0 ? 'Added costs are covered without further recurring receipts.' : !known(run.expected.delta.netFinancialBenefit) ? 'Clinical inputs must be specified first.' : collectionsDenominator <= 0 ? 'Select a paid pathway and a positive share of collectible outside service months to estimate a payment threshold.' : 'Per qualifying month, before collection and external payer shares. Holds one-time setup receipts fixed. This does not change the Medicare schedule.'}</p></div>
              <div><h3>Added cost reduction needed</h3><strong>{known(financialGap) ? money(financialGap) : 'Not estimable'}</strong><p>{known(costReduction) ? `${percent(costReduction)} of added costs, holding recruitment, collections and clinical outcomes fixed. Changing staffing may also change reimbursement and care; this is only a financial target.` : 'Specify clinical outcomes and a positive incremental cost to estimate a reduction percentage.'}</p></div>
            </div>
          </section>
        </>}
        {tab === 'Evidence & scenarios' && <>
          <section className="study-card"><h2>Test the assumptions that drive the result</h2><p className="study-copy">Each preset states the payment, workload or clinical assumptions it changes. Recruitment remains shared with the current program. Applying a preset updates the calculator and restarts microsimulation playback with the same seed.</p><div className="study-table-wrap"><table className="study-table"><thead><tr><th>Scenario</th><th>Added starts</th><th>Net benefit / 1,000</th><th>Use scenario</th></tr></thead><tbody>{scenarios.map(s => <tr key={s.id}><th scope="row">{s.name}</th><td>{number(s.result.delta.newInitiations)}</td><td>{money(s.result.delta.netBenefitPer1000)}</td><td><button className="study-small-button" aria-label={`Apply ${s.name}`} onClick={() => apply(s.inputs)}>Apply {s.id === 'illustrative' ? 'illustrative' : 'scenario'}</button></td></tr>)}</tbody></table></div><p className="study-copy">Expected-value scenarios are deterministic. Seed variation illustrates Monte Carlo noise; it is not a clinical confidence interval or a probabilistic sensitivity analysis.</p></section>
          <section className="study-card"><h2>Evidence, with its limits</h2><p className="study-copy">A source supports a specific input and population. Transferring that quantity to this study remains an assumption. Published allowed amounts, derived wage benchmarks, public price lists and the unpublished cashbook’s staffing plan are distinct from observed clinic costs. Staff minutes, payer mix, qualification, connectivity, overhead, recruitment and deprescribing effects still require local calibration. Prices have their own source years; no automatic inflation adjustment is applied.</p><div className="study-citations">{[...FINANCIAL_EVIDENCE.map(({ title, description, url, reference }) => [title, description, url, reference]), ...citations].map(([title, text, url, reference], i) => <article key={title}><span>{String(i + 1).padStart(2, '0')}</span><div>{url ? <a href={url} target="_blank" rel="noreferrer">{title} ↗</a> : <strong className="study-citation-title">{title}</strong>}<p>{text}</p>{reference && <p className="study-source-note">{reference}</p>}</div></article>)}</div><a href={METHODS} target="_blank" rel="noreferrer" className="study-text-link">Read the complete equations, evidence and limitations ↗</a></section>
          <section className="study-card"><h2>Reproduce this scenario</h2><p className="study-copy">JSON includes the applied inputs, seed, model version, patient histories, analytic expectations, seeded results and source notes. Loading JSON verifies an exact replay before changing the scenario. Earlier model versions are rejected with a clear version message; their calculations are not silently changed. CSV contains full-precision summary results; JSON is the replay format. Exported files contain only synthetic data.</p><p className="study-copy">Model {run.metadata.version} · {run.metadata.id}. The earlier budget calculator has different endpoints and remains available as a <Link className="study-text-link" to="/legacy-budget">historical model</Link>. Its exports are not interchangeable with this study.</p></section>
        </>}
      </div>
      <div className="study-actions"><div><strong>{dirty ? 'You have unapplied edits' : 'Calculator and simulation share this scenario'}</strong><p>{dirty ? 'Apply edits before exporting or opening the simulation.' : 'Save a JSON file to retain inputs after refreshing the page.'}</p></div><div className="study-action-buttons"><button className="btn-primary" onClick={() => apply(draft)} disabled={!dirty}>Apply inputs</button><button className="study-small-button" onClick={() => apply({ ...DEFAULT_INTEGRATION_INPUTS })}>Reset defaults</button></div></div>
      {notice && <p className="study-notice" role="status">{typeof notice === 'string' ? notice : notice.text}</p>}
      <div className="study-export-row"><div><button className="study-small-button" onClick={() => save('json')}>Save scenario JSON</button><button className="study-small-button" onClick={() => save('csv')}>Export results CSV</button><button className="study-small-button" disabled={busy} onClick={() => fileInput.current?.click()}>{busy ? 'Verifying…' : 'Load scenario JSON'}</button><input ref={fileInput} type="file" accept=".json,application/json" onChange={load} aria-label="Load integration scenario JSON" hidden /></div><a href={METHODS} target="_blank" rel="noreferrer">Methods & citations ↗</a></div>
    </div>
  </div>
}
