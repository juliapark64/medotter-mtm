import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useIntegrationStudy } from '../context/IntegrationStudyContext'
import { DEFAULT_INTEGRATION_INPUTS, INPUT_DEFINITIONS, createIntegrationExport, expectedIntegrationStudy, getIntegrationScenarios, getRpmPaymentSchedule, integrationExportCsv, validateIntegrationInputs, verifyIntegrationExport } from '../lib/integrationStudy'
import { FINANCIAL_EVIDENCE } from '../data/integrationFinancialEvidence'
import { STUDY_COST_LABELS, STUDY_HOUR_ROWS, ClinicPathwaySummary, RecurringStaffingSummary, PairedPaymentSummary, PolicyContext, armLabels, hasCoveredPhysicianOversight, marginLabel } from '../components/StudyStaffing'
import '../styles/integrationStudy.css'

const TABS = ['Overview', 'Cohort & service', 'Deprescribing', 'Financial return', 'Evidence & scenarios']
const METHODS = 'https://github.com/juliapark64/medotter-mtm/blob/main/docs/integration-study-methods.md'
const known = value => typeof value === 'number' && Number.isFinite(value)
const number = value => known(value) ? value.toLocaleString('en-US', { maximumFractionDigits: 1 }) : 'Not estimated'
const money = value => known(value) ? value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }) : 'Not estimated'
const rate = value => known(value) ? value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'Not estimated'
const percent = value => known(value) ? `${number(value * 100)}%` : 'Not estimated'
const options = { 'additional-time': 'Charge additional physician supervision time', 'existing-resources': '$0 additional cost · existing clinic resources cover oversight', delivery: 'Primary · same-cohort RPM delivery comparison', recruitment: 'Secondary · pharmacist recruitment analysis', clinic: 'Original Medicare clinic · operating margin', none: 'No added deprescribing benefit', illustrative: 'Illustrative low-BP scenario', minor: 'MINOR-informed · 45-day patient outcome', unestimated: 'Clinical benefits not estimable', 'shared-clinic': 'Secondary recruitment: retain the clinic team', 'integrated-team': 'Separate pharmacist / technician delivery budget', 'mtm-offer': 'Illustrative remote MTM offer pathway', healthpartners: 'Sensitivity: HealthPartners in-person intake → activation', off: 'No long-term extrapolation', assumed: 'Illustrative persistence and medication-cost extension' }
const paymentOptions = { medicare2026: '2026 Original Medicare fee-for-service benchmarks', custom: 'Custom local payment benchmark', none: 'No RPM reimbursement' }
const costRows = STUDY_COST_LABELS.map(([key, label]) => ({ key, label, cost: true, format: money }))
const citations = [
  ['HealthPartners / HyperLink 3', '385 of 1,423 telehealth-arm participants attended pharmacist intake within six weeks; 80% of attendees transmitted at least one home BP reading. The protocol offered a one-hour intake including medication review and device education; 60 minutes is a workload assumption, not a measured mean. Transfer to this Original Medicare cohort, its reach, timing, and staffing remains assumed; the study did not measure an added pharmacist recruitment effect in this clinic.', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9649877/'],
  ['MINOR full randomized trial · short-term patient outcome', 'At 45 days, 31/161 (19.3%) with pharmacist management plus home BP monitoring and 11/161 (6.8%) with monitoring and physician review had antihypertensive deprescribing. These rates apply to all comparable reviewed/monitored participants, not just the low-BP subgroup. Current publisher/table counts differ from an older indexed abstract reporting 9 controls (5.6%). The study does not establish one complete medicine stopped, annual persistence, or US RPM effects.', 'https://www.sciencedirect.com/science/article/pii/S0149291823002035'],
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
  if (!d) return null
  const value = draft[name]
  const hpLabels = { f: 'Assumed share targeted for pharmacist intake', offerMinutes: 'Pharmacist outreach per targeted patient', offerSupportMinutes: 'Staff outreach per targeted patient', onboardingMinutes: 'Optional pharmacist onboarding', onboardingSupportMinutes: 'Optional pharmacy-technician onboarding' }
  const isPercent = d.unit === 'probability'
  const reference = typeof d.default === 'string' ? (name === 'reimbursementMode' ? paymentOptions : options)[d.default] || d.default : isPercent ? percent(d.default) : d.unit.startsWith('USD') ? rate(d.default) : number(d.default)
  const displayed = value === null || value === '' ? '' : isPercent ? Number((value * 100).toFixed(8)) : typeof value === 'number' ? Number(value.toFixed(d.unit === 'USD/hour' ? 2 : 8)) : value
  const update = e => {
    const next = d.options ? e.target.value : e.target.value === '' ? (d.nullable ? null : '') : Number(e.target.value) / (isPercent ? 100 : 1)
    setDraft(old => ({ ...old, [name]: next }))
  }
  return <div className="study-field">
    <label htmlFor={`study-${name}`}>{name === 'N' && draft.comparisonMode === 'delivery' ? 'Common enrolled RPM cohort' : draft.comparisonMode === 'recruitment' && draft.recruitmentMode === 'healthpartners' && hpLabels[name] ? hpLabels[name] : d.label}<span>{isPercent ? '%' : draft.recruitmentMode === 'healthpartners' && ['offerMinutes', 'offerSupportMinutes'].includes(name) ? 'minutes/targeted patient' : d.unit}</span></label>
    {d.options ? <select id={`study-${name}`} value={value} onChange={update} aria-describedby={`study-help-${name}`}>{d.options.map(option => <option key={option} value={option}>{(name === 'reimbursementMode' ? paymentOptions : options)[option] || option}</option>)}</select>
      : <input id={`study-${name}`} type="number" value={displayed} min={d.min * (isPercent ? 100 : 1)} max={d.max * (isPercent ? 100 : 1)} step={d.step === 'any' ? 'any' : d.step * (isPercent ? 100 : 1)} onChange={update} placeholder={d.nullable ? 'Not specified' : undefined} aria-invalid={!!errors[name]} aria-describedby={`study-help-${name}`} />}
    <p id={`study-help-${name}`}>{d.description}{d.nullable && ' Leave blank to keep unspecified.'}</p>
    <div className="study-field-source"><span>{(d.sourceUrls?.length > 0 || d.sourceNotes) && value !== d.default ? `Edited assumption · reference ${reference}` : d.evidenceType}</span>{d.sourceUrls?.map((url, i) => <a key={url} href={url} target="_blank" rel="noreferrer">Source{d.sourceUrls.length > 1 ? ` ${i + 1}` : ''} ↗</a>)}</div>
    {d.sourceNotes && <p className="study-source-note">{Array.isArray(d.sourceNotes) ? d.sourceNotes.join(' ') : d.sourceNotes}</p>}
    {errors[name] && <p className="study-error">{errors[name]}</p>}
  </div>
}

function Comparison({ result, rows, inputs }) {
  const labels = armLabels(inputs)
  return <div className="study-table-wrap"><table className="study-table"><thead><tr><th scope="col">Measure</th>{labels.map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{rows.map(({ key, label, format = number, clinical, cost, derive }) => <tr key={key}><th scope="row">{label}</th>{['baseline', 'integrated'].map(arm => <td key={arm}>{format(derive ? derive(result[arm]) : clinical ? result[arm].clinical[key] : cost ? result[arm].costBreakdown[key] : result[arm][key])}</td>)}</tr>)}</tbody></table></div>
}

const financialRows = [
  { key: 'revenue', label: 'Total RPM collections', format: money },
  { key: 'programCost', label: 'Total program costs', format: money },
  { key: 'operatingMargin', label: 'Operating margin under selected cost allocation', format: money },
  { key: 'costPerMonth', label: 'Cost per active patient-month', format: rate, derive: row => row.activeMonths > 0 ? row.programCost / row.activeMonths : null },
  { key: 'marginPerMonth', label: 'Margin per active patient-month', format: rate, derive: row => row.activeMonths > 0 ? row.operatingMargin / row.activeMonths : null },
]

function PaymentSchedule({ inputs }) {
  if (Object.keys(validateIntegrationInputs(inputs)).length) return <p className="study-copy">Complete valid inputs to preview payment.</p>
  return <div className="study-payment-summary"><p className="study-eyebrow">Payment calculation for each program</p><PairedPaymentSummary inputs={inputs} />
    <p>Recurring collections = active months × qualifying share × allowed recurring amount × collection realization. Setup collections are counted once per qualifying new episode. Qualification and collections are unvalidated planning assumptions, not observed Medicare rates.</p>
    <p>Physician supervision, logistics, onboarding and separate medication reviews do not enter recurring management time. Qualifying clinical staff time is a subset of paid work. All requirements, including interactive communication, eligible personnel and supervision, must also be met. A job title or CDTA alone does not establish independent Medicare billing authority.</p>
    <p>2026 national nonfacility fee benchmarks are subject to locality and practitioner adjustments. The clinician’s wage does not set the fee. Collection realization includes Medicare, patient and supplemental-insurance receipts; do not apply another 80% factor.</p><a className="study-text-link" href="https://www.medpac.gov/wp-content/uploads/2026/03/Mar26_Ch4_MedPAC_Report_To_Congress_SEC.pdf" target="_blank" rel="noreferrer">2026 fee source · MedPAC Table 4-8 ↗</a>
  </div>
}

function BreakEven({ inputs, result }) {
  const labels = armLabels(inputs)
  return <section className="study-card"><h2>What would each program need to break even?</h2><p className="study-copy">Each threshold covers the costs allocated to that program in the applied scenario. Existing-resource coverage excludes the additional supervision charge, but not the need for oversight. These are mathematical targets, not quoted prices, guaranteed collections or evidence of feasibility. Assumed workload and service volume are held fixed.</p><div className="study-break-even study-two-programs">{['baseline', 'integrated'].map((arm, index) => {
    const row = result[arm]
    const payment = getRpmPaymentSchedule(inputs, arm)
    const allowed = row.qualifiedMonths * payment.monthlyBenchmark + row.qualifiedSetups * payment.setupFee
    const collectionTarget = allowed > 0 ? row.programCost / allowed : null
    const monthlyTarget = row.qualifiedMonths > 0 && inputs.collectionShare > 0 ? Math.max(0, (row.programCost - row.setupRevenue) / (row.qualifiedMonths * inputs.collectionShare)) : null
    const gap = Math.max(0, -row.operatingMargin)
    return <div key={arm}><h3>{labels[index]}</h3><p>Cost reduction needed at current collections</p><strong>{money(gap)}</strong><p>Required collection realization: <b>{collectionTarget === null ? 'Not attainable without a paid service' : `${percent(collectionTarget)}${collectionTarget > 1 ? ' · exceeds 100%' : ''}`}</b></p><p>Required recurring allowance: <b>{monthlyTarget === null ? 'Not estimable' : `${rate(monthlyTarget)} per qualifying month`}</b>, holding setup receipts fixed.</p><p>{gap === 0 ? 'Already covers the allocated costs under these assumptions.' : 'Changing staffing can affect care and billing eligibility. This financial target does not establish that workload can safely be reduced.'}</p></div>
  })}</div></section>
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
  const labels = armLabels(inputs)
  const direct = inputs.comparisonMode === 'delivery'
  const draftDirect = draft.comparisonMode === 'delivery'
  const isMinor = inputs.clinicalMode === 'minor'
  const draftMinor = draft.clinicalMode === 'minor'
  const hp = draft.recruitmentMode === 'healthpartners'
  const scenarios = useMemo(() => getIntegrationScenarios(inputs).map(s => ({ ...s, result: expectedIntegrationStudy(s.inputs) })), [inputs])
  const editDraft = update => { setDraft(update); setErrors({}) }
  const fields = names => <div className="study-fields">{names.map(name => <Parameter key={name} name={name} draft={draft} setDraft={editDraft} errors={errors} />)}</div>
  const apply = next => {
    const nextErrors = validateIntegrationInputs(next); setErrors(nextErrors)
    if (Object.keys(nextErrors).length) { setNotice('Please correct the highlighted inputs before applying this scenario.'); return }
    applyInputs(next); setNotice('Scenario applied to both pages. The paired simulation restarts with the same seed.')
  }
  const save = type => {
    try {
      const bundle = createIntegrationExport(run)
      download(type === 'json' ? JSON.stringify(bundle, null, 2) : integrationExportCsv(bundle), `rpm-delivery-seed-${inputs.seed}.${type}`, type === 'json' ? 'application/json' : 'text/csv;charset=utf-8')
      setNotice(`Exported applied ${type.toUpperCase()} scenario. ${dirty ? 'Unapplied edits were excluded.' : 'Inputs, evidence notes and results are included.'}`)
    } catch (error) { setNotice(`Export failed: ${error.message}`) }
  }
  const load = async event => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return
    setBusy(true)
    try {
      if (file.size > 35 * 1024 * 1024) throw new Error('Select a JSON export smaller than 35 MB.')
      const bundle = verifyIntegrationExport(JSON.parse(await file.text()))
      applyInputs(bundle.inputs); setNotice('Verified and loaded: every patient and result matches an exact replay.')
    } catch (error) { setNotice(`Import failed: ${error.message}`) } finally { setBusy(false) }
  }
  const comparison = rows => <Comparison result={result} rows={rows} inputs={inputs} />
  const costOnly = costRows.filter(row => !direct || !['physicianReferrals', 'offers', 'supportOffers'].includes(row.key))

  return <div className="integration-study">
    <section className="study-hero"><div className="study-shell"><span className="study-eyebrow">RPM DELIVERY · FINANCIAL FEASIBILITY STUDY</span><h1>Same patients.<br /><span>Two delivery models.</span></h1><p>Compare complete physician-led and pharmacist-led RPM budgets. Explore staffing, reimbursement and optional deprescribing outcomes for an Original Medicare clinic.</p><div className="study-hero-bottom"><span>Synthetic model · one-year budget · no collected patient data</span><Link to="/simulation">Watch the paired microsimulation →</Link></div></div></section>
    <div className="study-shell study-body">
      <div className="study-scenario-bar"><div><strong>{options[inputs.comparisonMode]}</strong><p>{number(inputs.N)} {direct ? 'patients in the common RPM cohort' : 'eligible members'} · seed {inputs.seed} · model {run.metadata.version}</p><p>{options[inputs.clinicalMode]}</p><p>{number(result.baseline.existingPatients)} existing participants · {number(result.baseline.newInitiations)} new starts in month {inputs.startMonth} · {direct ? 'same enrollment in both programs' : 'secondary recruitment analysis'}</p></div><label htmlFor="study-result-basis">Results shown<select id="study-result-basis" value={basis} onChange={e => setBasis(e.target.value)}><option value="expected">Expected values</option><option value="actual">Seeded synthetic realization</option></select></label></div>
      <div className="study-scenario-picker"><label htmlFor="study-evidence-scenario">Load a study scenario</label><select id="study-evidence-scenario" value="" onChange={e => { const scenario = scenarios.find(s => s.id === e.target.value); if (scenario) apply(scenario.inputs) }}><option value="" disabled>Choose a delivery or secondary scenario…</option>{scenarios.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select><span>Applies to both pages; replaces unapplied edits. Staffing presets preserve other applied inputs and can be combined. Choose the combined nurse-supported + 60:40 scenario to apply both teams at once.</span></div>
      <div className="study-metrics study-two-programs">{['baseline', 'integrated'].map((arm, index) => <Metric key={arm} emphasis={index === 1} label={`${labels[index]} · ${marginLabel(inputs, arm)}`} value={money(result[arm].operatingMargin)} note={`${money(result[arm].revenue)} collections − ${money(result[arm].programCost)} program costs across the applied cohort.${arm === 'integrated' && hasCoveredPhysicianOversight(inputs) ? ' Additional supervision cost is excluded under the existing-resources assumption.' : ''}`} />)}</div>
      <p className="study-result-note">{basis === 'expected' ? 'Analytic expectations may be fractional.' : 'One seeded synthetic realization; it can differ from the analytic expectation.'} These are full-cohort annual budgets, not observed profits. Both programs’ costs are reported separately under the selected allocation; a covered-oversight budget excludes that resource’s additional charge.</p>
      <ClinicPathwaySummary inputs={inputs} />
      <div className="study-tabs" role="tablist" aria-label="Study calculator sections">{TABS.map((name, index) => <button key={name} id={`tab-${index}`} role="tab" aria-selected={tab === name} aria-controls="study-panel" onClick={() => setTab(name)}>{name}</button>)}</div>
      <div id="study-panel" role="tabpanel" aria-labelledby={`tab-${TABS.indexOf(tab)}`}>
        {tab === 'Overview' && <>
          <section className="study-card"><h2>{direct ? 'What happens when pharmacists take over RPM delivery?' : 'Secondary question: pharmacist recruitment'}</h2><p className="study-copy">{direct ? 'Each synthetic patient receives the same enrollment date, retention and qualifying-month draws in both programs. The pharmacist program uses its own team instead of inheriting the physician-led delivery budget. Its separately modeled physician supervision remains visible. Equal service and collection assumptions give equal reimbursement; the primary financial difference comes from resource costs.' : 'This secondary analysis allows added pharmacist recruitment to change participation. It is distinct from the matched-cohort delivery comparison and should be reported separately.'}</p>{comparison([{ key: 'totalParticipants', label: 'Unique RPM participants' }, { key: 'newInitiations', label: 'New starts' }, { key: 'activeMonths', label: 'Active patient-months' }, ...financialRows])}<button className="study-small-button study-section-link" onClick={() => setTab('Financial return')}>Inspect separate budgets and break-even targets →</button></section>
          <section className="study-card"><p className="study-eyebrow">SECONDARY SUMMARY · DIFFERENCE BETWEEN COMPLETE PROGRAMS</p><h2>Financial impact of switching</h2><div className="study-metrics study-two-programs"><Metric label="Margin difference under selected cost allocation" value={money(result.delta.operatingMargin)} note={`${labels[1]} minus ${labels[0]}. A positive value can mean a smaller loss; inspect each program’s margin above.`} /><Metric label="Physician hours released" value={number(result.baseline.physicianHours - result.integrated.physicianHours)} note="Capacity difference, not an automatic reduction in salaried payroll. No new-visit revenue is assumed." /></div><p className="study-copy">The primary result is each program’s financial feasibility. Medication offsets remain outside clinic revenue. Recruitment, staffing mixes and clinical outcomes can be examined separately without treating a synthetic result as observed evidence.</p></section>
          <PolicyContext />
        </>}
        {tab === 'Cohort & service' && <>
          <section className="study-card"><h2>Choose the research question</h2>{fields(['comparisonMode'])}<p className="study-copy">Primary delivery comparison uses one common enrolled cohort. The secondary recruitment analysis starts with an eligible population and models how people enter RPM; its enrollment effect is not part of the primary staffing comparison.</p>{fields(['N', 'seed', 'existingRpmShare', 'startMonth', 'monthlyRetention'])}{draftDirect && <div className="study-explanation"><strong>Same people, same calendar</strong>Existing RPM patients begin in month 1. All other cohort members begin in the selected start month. Both programs use the same patient-specific retention and billing-qualification draws. Referral probabilities do not control this cohort or create referral costs.</div>}</section>
          {!draftDirect && <section className="study-card"><h2>Secondary pharmacist recruitment assumptions</h2>{fields(['recruitmentMode', 'f', ...(hp ? ['intakeAttendance', 'activationAfterIntake', 'intakeMinutes'] : ['c', 'o', 'qB']), 'recontactUptake', 'r', 'qA'])}<p className="study-copy">HealthPartners uses an offered in-person intake with 385/1,423 attendance and 80% transmission among attendees. The 60-minute protocol appointment is not a measured mean workload. UCSD’s 11.8% referral rate came from two years of records and does not establish an annual physician-only probability. These transfers remain assumptions.</p></section>}
          <section className="study-card"><h2>Applied service volume</h2>{comparison([{ key: 'existingPatients', label: 'Existing participants' }, { key: 'newInitiations', label: 'New starts' }, { key: 'activeMonths', label: 'Active patient-months' }, { key: 'qualifiedMonths', label: 'Qualifying recurring months' }, { key: 'qualifiedSetups', label: 'Qualifying new setups' }, ...(!direct ? [{ key: 'physicianReferrals', label: 'Physician referrals' }, { key: 'offers', label: 'Pharmacist offers' }, { key: 'duplicateOffers', label: 'Overlapping offers' }] : [])])}</section>
        </>}
        {tab === 'Deprescribing' && <>
          <section className="study-card"><h2>Deprescribing as a separate clinical scenario</h2><p className="study-copy">The primary delivery comparison does not presume a clinical advantage. You can add a MINOR-informed 45-day outcome and an explicitly costed medication-review resource. Drug cost offsets are reported separately; they do not become clinic reimbursement or automatically offset program spending.</p>{fields(['clinicalMode'])}{['minor', 'illustrative'].includes(draft.clinicalMode) && fields(['f', 'c', 'reviewMinutes'])}{draftMinor ? <><div className="study-explanation"><strong>MINOR · transferred trial outcome</strong>Patient-level antihypertensive deprescribing at 45 days: 31/161 (19.3%) with pharmacist management and 11/161 (6.8%) with home monitoring and physician review. These are all-participant rates, not low-BP-conditional probabilities. The trial does not establish annual medication savings or exactly one complete discontinuation.</div>{fields(['minorEligibleShare', 'minorActionBaseline', 'minorActionIntegrated', 'minorExtrapolation'])}{draft.minorExtrapolation === 'assumed' && fields(['persistence12', 'drugCostPerMonth'])}<p className="study-copy">MINOR studied Brazilian patients aged 60 or older able to perform home monitoring and not classified as poorly adherent. Transfer to this US clinic, review coverage and time remains assumed. An older indexed abstract reports 9 controls; current publisher/table and author counts report 11. <a className="study-text-link" href="https://www.sciencedirect.com/science/article/pii/S0149291823002035" target="_blank" rel="noreferrer">Trial source ↗</a></p></> : draft.clinicalMode === 'illustrative' ? fields(['lowBpShare', 'actionBaseline', 'actionIntegrated', 'persistence12', 'drugCostPerMonth']) : <p className="study-copy">{draft.clinicalMode === 'none' ? 'This explicitly assumes zero clinical effects in both programs.' : 'Clinical outcomes remain unestimated. Staffing economics can still be calculated.'}</p>}<p className="study-copy">A low BP reading alone does not establish that deprescribing is appropriate. No falls, cardiovascular events, hospitalization savings or clinical noninferiority are inferred.</p></section>
          <section className="study-card"><h2>Clinical outcomes stay separate from clinic margin</h2>{comparison([{ key: 'reviews', label: 'Additional completed medication reviews' }, { key: 'actions', label: isMinor ? 'Patients with deprescribing at 45 days' : 'Patients with a modeled medication reduction', clinical: true }, { key: 'sustainedAt12Months', label: 'Assumed reductions maintained 12 months after assessment', clinical: true }, { key: 'medicationMonths', label: 'Assumed reduced-medication months inside budget year', clinical: true }, { key: 'drugSavings', label: 'Medication cost offset · excluded from clinic margin', format: money }])}<p className="study-copy">MINOR short-term mode leaves annual persistence and medicine savings unestimated. Any extension assumes one medicine-equivalent per patient and a separate persistence model; it is not an annual MINOR finding.</p></section>
        </>}
        {tab === 'Financial return' && <>
          <section className="study-card"><h2>Each program pays for its own work</h2><p className="study-copy">Operating margin = collected RPM revenue − labor, vendor charges and overhead allocated to that program. The existing-resources supervision scenario excludes only the additional oversight charge; it is not a fully allocated economic-cost estimate. The pharmacist-delivered program does not include the physician-led clinical-delivery, nurse or medical-assistant budget. Required physician supervision is a separate editable assumption. Both programs use an eligible Original Medicare billing arrangement.</p>{comparison(financialRows)}</section>
          <section className="study-card"><h2>Reimbursement and collections</h2>{fields(['reimbursementMode'])}{draft.reimbursementMode === 'custom' && fields(['monthlyRevenueBenchmark', 'customSetupRevenueBenchmark'])}{fields(['qualificationShare', 'setupQualificationShare', 'collectionShare'])}<PaymentSchedule inputs={draft} /><p className="study-copy">The default 70% monthly/setup qualification and 90% collection realization are planning assumptions, not evidence-based Original Medicare population estimates. There is no external-payer 50% reduction.</p></section>
          <section className="study-card"><h2>Task allocation for each delivery team</h2>{!draftDirect && fields(['staffingMode'])}{Object.keys(validateIntegrationInputs(draft)).length === 0 && <RecurringStaffingSummary inputs={draft} />}<h3>Physician-delivered program only</h3>{fields(['monitorPhysicianMinutes', 'monitorNurseMinutes', 'qualifiedNurseMinutes', 'monitorAssistantMinutes', 'onboardingNurseMinutes', 'onboardingAssistantMinutes'])}<h3>Pharmacist-delivered program only</h3>{fields(['monitorPharmacistMinutes', 'monitorSupportMinutes', 'qualifiedSupportMinutes', 'physicianOversightCostMode', 'physicianOversightMinutes', 'onboardingMinutes', 'onboardingSupportMinutes'])}<p className="study-copy">The main matched-service assumption allocates 20 clinical minutes to the physician or pharmacist, with 10 support minutes. This is a scenario, not a measured average or a claim that a physician must personally provide every billing minute. The nurse-supported, 9:1 and 60:40 technician/pharmacist presets test other recurring-time allocations. The 60:40 preset changes recurring work only; onboarding and medication-review time retain their applied values. Source observations and transfer assumptions appear above when a matching staffing pattern is applied.</p>{!draftDirect && <><h3>Secondary recruitment work</h3>{fields(['physicianReferralMinutes', 'offerMinutes', 'offerSupportMinutes', ...(hp ? ['intakeMinutes'] : ['reviewMinutes'])])}</>}<h3>Occupation-specific employer costs</h3>{fields(['physicianWage', 'nurseWage', 'assistantWage', 'pharmacistWage', 'supportWage'])}<p className="study-copy">BLS national wages receive one healthcare benefits-loading approximation. No cashbook wages are used. Minutes ÷ 60 × loaded hourly cost values each task once; clinical qualification is a subset of paid time. Salaried time released is capacity, not guaranteed cash savings.</p></section>
          <section className="study-card"><h2>Technology and program overhead</h2><p className="study-copy">The $90/new start and $12/active month package remains a user-supplied business-plan assumption, not a verified Prevounce quote. Device, software and cellular are included; clinic labor is separate. No additional included component is charged twice. Both delivery teams need technology; the staffing proposal does not establish a ban on technology suppliers.</p>{fields(['deviceCost', 'monthlyTechnologyCost', 'monthlyConnectivityCost', 'monthlyPlatformBaseCost', 'platformProviderCount', 'fixedCost', 'addedFixedCost'])}<p className="study-copy">Vendor onboarding is charged once for each new participant, not once for the entire clinic. Monthly costs apply to all active months, even those not qualifying for reimbursement. The pharmacist program’s transition/additional overhead is separate from common program overhead.</p></section>
          <section className="study-card"><h2>Where each program spends money</h2>{comparison(costOnly)}{comparison([...STUDY_HOUR_ROWS.map(([key, label]) => ({ key, label })), { key: 'monthlyRevenue', label: 'Recurring collections', format: money }, { key: 'setupRevenue', label: 'One-time setup collections', format: money }, ...financialRows])}</section>
          <BreakEven inputs={inputs} result={run.expected} />
          <PolicyContext />
        </>}
        {tab === 'Evidence & scenarios' && <>
          <section className="study-card"><h2>Keep the comparison and assumptions visible</h2><p className="study-copy">Delivery scenarios use matched patients. Recruitment scenarios answer a separate question. Workload, staffing capacity, physician supervision time and its coverage by existing resources, vendor pricing, billing qualification and collection realization remain assumptions even when fees and wages have citations.</p><div className="study-table-wrap"><table className="study-table"><thead><tr><th>Scenario</th><th>Program A margin</th><th>Program B margin</th><th>Apply</th></tr></thead><tbody>{scenarios.map(s => <tr key={s.id}><th scope="row">{s.name}<br /><small>{options[s.inputs.comparisonMode]}</small></th><td>{money(s.result.baseline.operatingMargin)}</td><td>{money(s.result.integrated.operatingMargin)}</td><td><button className="study-small-button" aria-label={`Apply ${s.name}`} onClick={() => apply(s.inputs)}>Apply scenario</button></td></tr>)}</tbody></table></div></section>
          <PolicyContext />
          <section className="study-card"><h2>Evidence and applicability</h2><p className="study-copy">Sources support specific quantities, not the entire combined model. Published staffing interviews do not establish a universal duration or allocation. Prices retain their source years with no automatic inflation adjustment. MINOR is a transferred clinical scenario; HealthPartners and UCSD are secondary recruitment references. No source establishes that either delivery arrangement is clinically equivalent.</p><div className="study-citations">{[...FINANCIAL_EVIDENCE.map(({ title, description, url, reference }) => [title, description, url, reference]), ...citations].map(([title, text, url, reference], index) => <article key={title}><span>{String(index + 1).padStart(2, '0')}</span><div>{url ? <a href={url} target="_blank" rel="noreferrer">{title} ↗</a> : <strong>{title}</strong>}<p>{text}</p>{reference && <p>{reference}</p>}</div></article>)}</div><a className="study-text-link" href={METHODS} target="_blank" rel="noreferrer">Read equations and limitations ↗</a></section>
          <section className="study-card"><h2>Reproduce the paired simulation</h2><p className="study-copy">JSON stores the model version, complete inputs, seed, patient task histories, expected results, seeded results and evidence notes. Loading verifies an exact replay. CSV contains full-precision summaries; JSON is the replay format. Older versions are rejected rather than silently recalculated. A larger synthetic sample or another seed does not strengthen the underlying evidence or represent parameter uncertainty.</p><p className="study-copy">Model {run.metadata.version} · {run.metadata.id}. <Link className="study-text-link" to="/legacy-budget">Historical budget model →</Link></p></section>
        </>}
      </div>
      <div className="study-actions"><div><strong>{dirty ? 'You have unapplied edits' : 'Both pages use the same applied scenario'}</strong><p>{dirty ? 'Apply edits before exporting or inspecting the simulation.' : 'Save JSON to retain and replay this scenario.'}</p></div><div className="study-action-buttons"><button className="btn-primary" onClick={() => apply(draft)} disabled={!dirty}>Apply inputs</button><button className="study-small-button" onClick={() => apply(getIntegrationScenarios(DEFAULT_INTEGRATION_INPUTS).find(s => s.id === 'delivery').inputs)}>Reset direct delivery comparison</button></div></div>
      {notice && <p className="study-notice" role="status">{typeof notice === 'string' ? notice : notice.text}</p>}
      <div className="study-export-row"><div><button className="study-small-button" onClick={() => save('json')}>Save scenario JSON</button><button className="study-small-button" onClick={() => save('csv')}>Export results CSV</button><button className="study-small-button" disabled={busy} onClick={() => fileInput.current?.click()}>{busy ? 'Verifying…' : 'Load scenario JSON'}</button><input ref={fileInput} type="file" accept=".json,application/json" onChange={load} aria-label="Load delivery scenario JSON" hidden /></div><a href={METHODS} target="_blank" rel="noreferrer">Methods & citations ↗</a></div>
    </div>
  </div>
}
