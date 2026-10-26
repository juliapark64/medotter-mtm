import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useIntegrationStudy } from '../context/IntegrationStudyContext'
import { DEFAULT_INTEGRATION_INPUTS, INPUT_DEFINITIONS, createIntegrationExport, expectedIntegrationStudy, findOfferThreshold, getIntegrationScenarios, getRpmPaymentSchedule, integrationExportCsv, validateIntegrationInputs, verifyIntegrationExport } from '../lib/integrationStudy'
import { FINANCIAL_EVIDENCE } from '../data/integrationFinancialEvidence'
import { STUDY_COST_LABELS, STUDY_HOUR_ROWS, ClinicPathwaySummary, RecurringStaffingSummary, PairedPaymentSummary } from '../components/StudyStaffing'
import '../styles/integrationStudy.css'

const TABS = ['Overview', 'RPM recruitment', 'Deprescribing', 'Financial return', 'Evidence & scenarios']
const METHODS = 'https://github.com/juliapark64/medotter-mtm/blob/main/docs/integration-study-methods.md'
const known = value => typeof value === 'number' && Number.isFinite(value)
const number = value => known(value) ? value.toLocaleString('en-US', { maximumFractionDigits: 1 }) : 'Not estimated'
const money = value => known(value) ? value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }) : 'Not estimated'
const rate = value => known(value) ? value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'Not estimated'
const percent = value => known(value) ? `${number(value * 100)}%` : 'Not estimated'
const options = { clinic: 'Original Medicare clinic · operating margin', none: 'No added deprescribing benefit', illustrative: 'Illustrative low-BP scenario', minor: 'MINOR-informed · 45-day patient outcome', unestimated: 'Clinical benefits not estimable', 'shared-clinic': 'Same physician / nurse / assistant RPM team in both pathways', 'integrated-team': 'Optional: pharmacist / technician RPM delivery with physician review', 'mtm-offer': 'Illustrative remote MTM offer pathway', healthpartners: 'Sensitivity: HealthPartners in-person intake → activation', off: 'No long-term extrapolation', assumed: 'Illustrative persistence and medication-cost extension' }
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
    <label htmlFor={`study-${name}`}>{draft.recruitmentMode === 'healthpartners' && hpLabels[name] ? hpLabels[name] : d.label}<span>{isPercent ? '%' : draft.recruitmentMode === 'healthpartners' && ['offerMinutes', 'offerSupportMinutes'].includes(name) ? 'minutes/targeted patient' : d.unit}</span></label>
    {d.options ? <select id={`study-${name}`} value={value} onChange={update} aria-describedby={`study-help-${name}`}>{d.options.map(option => <option key={option} value={option}>{(name === 'reimbursementMode' ? paymentOptions : options)[option] || option}</option>)}</select>
      : <input id={`study-${name}`} type="number" value={displayed} min={d.min * (isPercent ? 100 : 1)} max={d.max * (isPercent ? 100 : 1)} step={d.step === 'any' ? 'any' : d.step * (isPercent ? 100 : 1)} onChange={update} placeholder={d.nullable ? 'Not specified' : undefined} aria-invalid={!!errors[name]} aria-describedby={`study-help-${name}`} />}
    <p id={`study-help-${name}`}>{d.description}{d.nullable && ' Leave blank to keep unspecified.'}</p>
    <div className="study-field-source"><span>{(d.sourceUrls?.length > 0 || d.sourceNotes) && value !== d.default ? `Edited assumption · reference ${reference}` : d.evidenceType}</span>{d.sourceUrls?.map((url, i) => <a key={url} href={url} target="_blank" rel="noreferrer">Source{d.sourceUrls.length > 1 ? ` ${i + 1}` : ''} ↗</a>)}</div>
    {d.sourceNotes && <p className="study-source-note">{Array.isArray(d.sourceNotes) ? d.sourceNotes.join(' ') : d.sourceNotes}</p>}
    {errors[name] && <p className="study-error">{errors[name]}</p>}
  </div>
}

function Comparison({ result, rows }) {
  return <div className="study-table-wrap"><table className="study-table"><thead><tr><th scope="col">Endpoint</th><th scope="col">Physician-led baseline</th><th scope="col">With pharmacist integration</th><th scope="col">Added contribution</th></tr></thead><tbody>{rows.map(({ key, label, format = number, clinical, cost }) => <tr key={key}><th scope="row">{label}</th>{['baseline', 'integrated', 'delta'].map(arm => <td key={arm}>{format(clinical ? result[arm].clinical[key] : cost ? result[arm].costBreakdown[key] : result[arm][key])}</td>)}</tr>)}</tbody></table></div>
}

function StudyEvidenceSummary({ inputs }) {
  return <section className="study-card study-applied-evidence" aria-label="Applied recruitment and deprescribing evidence">
    <p className="study-eyebrow">Applied evidence and remaining assumptions</p>
    <h2>{inputs.recruitmentMode === 'healthpartners' ? 'Sensitivity: HealthPartners-informed recruitment' : 'Illustrative remote MTM recruitment'} + {inputs.clinicalMode === 'minor' ? 'MINOR-informed deprescribing' : options[inputs.clinicalMode]}</h2>
    {inputs.recruitmentMode === 'healthpartners' && <p className="study-copy">The targeted share is <strong>{percent(inputs.f)}</strong> (assumed). Among that group, <strong>{percent(inputs.intakeAttendance)}</strong> attend pharmacist intake; <strong>{percent(inputs.activationAfterIntake)}</strong> of attendees can activate RPM with a first transmission, subject to overlap and recontact rules. The reference is 385/1,423 intake attendance and 80% transmission after intake. Every attendee incurs <strong>{number(inputs.intakeMinutes)} pharmacist minutes</strong>, including nonactivators, using the offered one-hour appointment as a workload assumption. Outreach also costs {number(inputs.offerMinutes)} pharmacist + {number(inputs.offerSupportMinutes)} staff minutes per targeted patient. The intake replaces the separate medication-review bundle and includes device education. <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC9649877/" target="_blank" rel="noreferrer">HyperLink 3 source ↗</a></p>}
    {inputs.recruitmentMode !== 'healthpartners' && <p className="study-copy">Remote pharmacist review and delivered-device enrollment are represented without requiring an in-person visit. Reach, review completion, offers, uptake, and review time are editable transfer or planning assumptions; no source establishes the combined pharmacist recruitment effect in this clinic. The HealthPartners in-person intake is available separately as a sensitivity.</p>}
    {inputs.clinicalMode === 'minor' && <p className="study-copy"><strong>45-day patient-level outcome:</strong> {percent(inputs.minorActionBaseline)} usual monitoring/review and {percent(inputs.minorActionIntegrated)} with completed pharmacist review, among the assumed <strong>{percent(inputs.minorEligibleShare)}</strong> clinically comparable share. The reference counts are 11/161 and 31/161. The low-BP multiplier is not applied. {inputs.minorExtrapolation === 'assumed' ? 'Long-term persistence and one-medicine-equivalent savings are explicitly extrapolated, not MINOR findings.' : 'Long-term persistence and medication savings are not estimated in this scenario.'} <a href="https://www.sciencedirect.com/science/article/pii/S0149291823002035" target="_blank" rel="noreferrer">MINOR source ↗</a></p>}
    <p className="study-source-note">These sources studied different populations and workflows. Combining them is a scenario transfer to Original Medicare, not a jointly tested intervention. Physician referrals continue in both pathways. The cohort reach, overlapping contacts, staffing adaptation, service retention, billing qualification and collections remain assumptions.</p>
  </section>
}

function PaymentSchedule({ inputs, draft = false }) {
  if (Object.keys(validateIntegrationInputs(inputs)).length) return <p className="study-copy">Complete valid inputs to preview the payment calculation.</p>
  const baseline = getRpmPaymentSchedule(inputs, 'baseline')
  const integrated = getRpmPaymentSchedule(inputs, 'integrated')
  return <div className="study-payment-summary">
    <p className="study-eyebrow">{draft ? 'Input preview · apply to update results' : 'Applied payment assumptions'}</p>
    <PairedPaymentSummary inputs={inputs} />
    {inputs.reimbursementMode === 'medicare2026' ? <>
      <p>Baseline qualifying time = {number(inputs.monitorPhysicianMinutes)} physician + {number(inputs.qualifiedNurseMinutes)} qualifying nurse minutes. {inputs.staffingMode === 'shared-clinic' ? 'The integrated pathway uses the same routine team and payment calculation.' : `The optional integrated team uses ${number(inputs.monitorPhysicianMinutes)} physician + ${number(inputs.monitorPharmacistMinutes)} pharmacist + ${number(inputs.qualifiedSupportMinutes)} qualifying pharmacy-technician minutes.`} Qualifying staff minutes are subsets of paid time, not additional labor.</p>
      <p>Device benchmark: {baseline.deviceCodeLabel}, {rate(baseline.deviceFee)} in each pathway. Management benchmark: {rate(baseline.managementFee)} baseline and {rate(integrated.managementFee)} integrated. National nonfacility 2026 allowed amounts are subject to locality and practitioner adjustments. The professional’s wage does not determine reimbursement.</p>
    </> : <p>{inputs.reimbursementMode === 'none' ? 'All RPM collections are zero; staffing, devices, reviews and other service costs remain.' : 'Custom allowed amounts are investigator assumptions and do not establish Medicare billing eligibility.'}</p>}
    <p>Recurring collections = allowed amount × {percent(inputs.qualificationShare)} qualifying months × {percent(inputs.collectionShare)} collection realization. Setup uses {percent(inputs.setupQualificationShare)} qualification and is counted once per new episode. These percentages are planning assumptions, not observed Medicare rates.</p>
    <p>Medical-assistant coordination, administrative work, onboarding and separate medication reviews do not enter recurring management time. Required patient interaction and all other service conditions must also be met. Collections include Medicare and patient or supplemental-insurance receipts; do not apply another 80% factor.</p>
    <a className="study-text-link" href="https://www.medpac.gov/wp-content/uploads/2026/03/Mar26_Ch4_MedPAC_Report_To_Congress_SEC.pdf" target="_blank" rel="noreferrer">2026 fee source · MedPAC Table 4-8 ↗</a>
  </div>
}

function TeamStaffingSummary({ inputs, draft = false }) {
  if (Object.keys(validateIntegrationInputs(inputs)).length) return null
  return <><p className="study-eyebrow">{draft ? 'Staffing preview · apply to update results' : 'Applied team staffing'}</p><RecurringStaffingSummary inputs={inputs} />
    <p className="study-copy">Baseline onboarding uses {number(inputs.onboardingNurseMinutes)} nurse + {number(inputs.onboardingAssistantMinutes)} medical-assistant minutes per new start. Physician referral work uses {number(inputs.physicianReferralMinutes)} minutes per referral, including unsuccessful referrals. Both are time-based costs.</p>
    <p className="study-copy">Added recruitment uses {number(inputs.offerMinutes)} pharmacist + {number(inputs.offerSupportMinutes)} pharmacy-technician minutes per {inputs.recruitmentMode === 'healthpartners' ? 'targeted patient' : 'offer'}. {inputs.recruitmentMode === 'healthpartners' ? `Each attended intake uses ${number(inputs.intakeMinutes)} pharmacist minutes, including nonactivators. The one-hour source appointment is not an observed average workload.` : `Each completed remote medication review and follow-up bundle uses ${number(inputs.reviewMinutes)} pharmacist minutes, an investigator assumption.`}</p>
  </>
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
  const isMinor = inputs.clinicalMode === 'minor'
  const draftHealthPartners = draft.recruitmentMode === 'healthpartners'
  const draftMinor = draft.clinicalMode === 'minor'
  const scenarios = useMemo(() => getIntegrationScenarios(inputs).map(s => ({ ...s, result: expectedIntegrationStudy(s.inputs) })), [inputs])
  const threshold = useMemo(() => tab === 'Financial return' ? findOfferThreshold(inputs) : null, [inputs, tab])
  const commonPaymentBenchmark = getRpmPaymentSchedule(inputs, 'baseline').monthlyBenchmark === getRpmPaymentSchedule(inputs, 'integrated').monthlyBenchmark
  const collectionsDenominator = inputs.reimbursementMode === 'none' ? 0 : run.expected.delta.qualifiedMonths * inputs.collectionShare
  const revenueGap = run.expected.delta.programCost - run.expected.delta.setupRevenue
  const breakEvenRevenue = !commonPaymentBenchmark || !known(run.expected.delta.netFinancialBenefit) ? null : revenueGap <= 0 ? 0 : collectionsDenominator > 0 ? revenueGap / collectionsDenominator : null
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
      <p>Explore added pharmacist recruitment, deprescribing outcomes and financial surplus for a clinic serving Original Medicare patients.</p>
      <div className="study-hero-bottom"><span>12-month budget · same eligible population · hypothetical estimates</span><Link to="/simulation">Watch the microsimulation <span aria-hidden="true">↗</span></Link></div>
    </div></section>

    <div className="study-shell study-body">
      <div className="study-scenario-bar"><div><strong>{options[inputs.perspective]}</strong><p>{options[inputs.recruitmentMode]} · {options[inputs.clinicalMode]}</p><p>{options[inputs.staffingMode]}</p><p>{number(inputs.N)} eligible members · seed {inputs.seed} · model {run.metadata.version}</p></div><label htmlFor="study-result-basis">Results shown<select id="study-result-basis" value={basis} onChange={e => setBasis(e.target.value)}><option value="expected">Expected values</option><option value="actual">Seeded synthetic realization</option></select></label></div>
      <div className="study-scenario-picker"><label htmlFor="study-evidence-scenario">Load a study scenario</label><select id="study-evidence-scenario" value="" onChange={e => { const scenario = scenarios.find(s => s.id === e.target.value); if (scenario) apply(scenario.inputs) }}><option value="" disabled>Choose the physician-led baseline or a sensitivity…</option>{scenarios.filter(s => ['physician-led-minor', 'team-90-10', 'healthpartners-minor', 'healthpartners', 'minor', 'minor-extension', 'no-added-recruitment', 'no-enhanced-deprescribing', 'conservative'].includes(s.id)).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select><span>Applies to both pages; replaces unapplied edits.</span></div>
      <div className="study-metrics">
        <Metric emphasis label="Additional clinic financial surplus" value={money(delta.netBenefitPer1000)} note="Per 1,000 eligible members in year one. Positive = financial improvement; negative = deterioration." />
        <Metric label="Additional RPM starts" value={number(delta.newInitiations)} note="Unique patients with a first BP transmission, beyond the current program." />
        <Metric label={isMinor ? 'Additional patients with deprescribing' : 'Additional sustained reductions'} value={number(isMinor ? delta.clinical.actions : delta.clinical.sustainedAt12Months)} note={isMinor ? 'Modeled 45-day patient outcome; not an annual rate or a count of medicines stopped.' : 'Medication reductions maintained 12 months after action; one medicine per action assumed.'} />
      </div>
      <p className="study-result-note">{basis === 'expected' ? 'Analytic expectations may be fractional. ' : 'This seeded synthetic sample may differ from the expectation. ' }{isMinor ? 'RPM starts and patients with deprescribing' : 'RPM starts and medicines'} are counts for the applied cohort; only the financial card is standardized per 1,000. No study patient data have been collected.</p>
      <p className="study-assumption-note">Original Medicare fee-for-service clinic scenario: all clinic RPM collections are counted, with no payer-share reduction. Applied planning assumptions are {percent(inputs.qualificationShare)} qualifying months, {percent(inputs.setupQualificationShare)} qualifying new setups and {percent(inputs.collectionShare)} collection realization; these are not observed Medicare rates. The baseline has no pharmacist or pharmacy-technician work. Physician, nurse, and medical-assistant task minutes are explicit planning assumptions; their wage benchmarks do not validate the staffing allocation.</p>
      {inputs.reimbursementMode === 'none' && <div className="study-explanation"><strong>Why are collections zero here?</strong> No RPM reimbursement is selected. Costs remain even when services are unpaid. Select the Original Medicare benchmark in Financial return to model clinic collections.</div>}
      {['none', 'unestimated'].includes(inputs.clinicalMode) && <p className="study-clinical-note">{inputs.clinicalMode === 'none' ? 'Conservative scenario: medication effects and savings are explicitly set to zero in both programs; review costs remain.' : 'Clinical effects and medication cost offsets are unspecified. Clinic financial surplus remains estimable because medication savings are separate from clinic revenue.'}</p>}
      <ClinicPathwaySummary inputs={inputs} />
      <StudyEvidenceSummary inputs={inputs} />

      <div className="study-tabs" role="tablist" aria-label="Study calculator sections">{TABS.map(name => <button key={name} id={`tab-${TABS.indexOf(name)}`} role="tab" aria-selected={tab === name} aria-controls="study-panel" onClick={() => setTab(name)}>{name}</button>)}</div>
      <div id="study-panel" role="tabpanel" aria-labelledby={`tab-${TABS.indexOf(tab)}`}>
        {tab === 'Overview' && <>
          <section className="study-card"><div className="study-section-heading"><div><p className="study-eyebrow">The research question</p><h2>What does adding the pharmacist contribute?</h2></div></div><p className="study-copy">Physician referrals and the physician-led RPM service continue in both scenarios. The main integrated pathway adds pharmacist recruitment and medication review to the same physician/nurse/assistant team. The optional staffing sensitivity separately transfers selected routine tasks. A patient reached through both channels has one RPM episode; only starts beyond the current program are additional.</p><div className="study-flow">{[['01', inputs.recruitmentMode === 'healthpartners' ? 'Pharmacist intake' : 'MTM encounters', `${number(result.integrated.reviews)} completed encounters`], ['02', 'RPM participation', `${number(delta.newInitiations)} additional starts`], ['03', 'Medication assessment', `${number(delta.clinical.actions)} additional patients with deprescribing${isMinor ? ' at 45 days' : ''}`], ['04', 'Financial contribution', `${money(delta.netFinancialBenefit)} across the cohort`]].map(([step, title, value]) => <div key={step}><span>{step}</span><h3>{title}</h3><p>{value}</p></div>)}</div></section>
          <section className="study-card"><h2>Follow the added value</h2><p className="study-copy">One-year changes across the applied cohort, relative to the existing program. A positive change can mean a smaller loss; total operating margins appear below.</p><div className="study-bridge"><Metric label="+ Added clinic RPM collections" value={money(delta.revenue)} note={`${money(delta.monthlyRevenue)} recurring + ${money(delta.setupRevenue)} one-time setup; after qualification and collection assumptions`} /><Metric label="− Additional program costs" value={money(delta.programCost)} note="Reviews, offers, added RPM services, devices and implementation" /><Metric label="= Added clinic financial surplus" value={money(delta.netFinancialBenefit)} note="Change in operating margin across the applied cohort" /><Metric label="Medication cost offset · separate" value={money(delta.drugSavings)} note={isMinor && inputs.minorExtrapolation === 'off' ? 'Not estimated without an explicit extension; excluded from clinic surplus' : 'Illustrative medication savings; excluded from clinic revenue and surplus'} /></div><button className="study-small-button study-section-link" onClick={() => setTab('Financial return')}>Inspect reimbursement and costs →</button></section>
          <section className="study-card"><h2>Physician-led baseline → with pharmacist integration</h2><Comparison result={result} rows={[{ key: 'totalParticipants', label: 'Unique RPM participants, including existing' }, { key: 'newInitiations', label: 'New RPM starts' }, { key: 'activeMonths', label: 'Active RPM patient-months' }, { key: isMinor ? 'actions' : 'sustainedAt12Months', label: isMinor ? 'Patients with deprescribing at 45 days' : 'Medicines reduced, sustained 12 months', clinical: true }, { key: 'operatingMargin', label: 'Clinic operating margin in budget year', format: money }]} /></section>
        </>}
        {tab === 'RPM recruitment' && <>
          <section className="study-card"><h2>Reach people who would not otherwise start</h2>{fields(['recruitmentMode'])}<p className="study-copy">{draftHealthPartners ? 'HealthPartners-informed pathway: targeted cohort → completed pharmacist intake → first BP transmission. The source attendance denominator was telehealth-arm study enrollees; applying it to the assumed targeted clinic population is a transfer. The intake rate is not an RPM offer rate. Outreach costs accrue for every targeted patient, even when intake never occurs.' : 'Completed reviews = eligible population × review-population share × completion probability. Offers are conditional on a completed review and the recontact rule.'} Referral or intake alone never counts as activation. Existing RPM patients can receive review without becoming new starts.</p>{fields(['N', 'seed', 'existingRpmShare', 'f', ...(draftHealthPartners ? ['intakeAttendance', 'activationAfterIntake', 'intakeMinutes'] : ['c', 'o', 'qB']), 'recontactUptake'])}{draftHealthPartners && <p className="study-source-note">HyperLink 3 offered an approximately one-hour intake; 60 minutes is a protocol-based workload assumption, not a measured average. This scenario does not claim that the short illustrative review achieves the same activation. <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC9649877/" target="_blank" rel="noreferrer">Read the trial ↗</a></p>}</section>
          <details className="study-card"><summary>Supplementary usual physician referral assumptions</summary><p className="study-copy">These referrals continue unchanged in both scenarios. The 11.8% source rate came from two years of records; its use as an annual physician-pathway probability is an assumption. It does not establish physician-only staffing or prove pharmacist recruitment is higher.</p>{fields(['r', 'qA'])}</details>
          <section className="study-card"><h2>Service timing and recruitment stages</h2><p className="study-copy">New starts use only the remaining budget-year months. HyperLink attendance was measured within six weeks; the model places the cohort’s intake and activation in the selected representative month. That timing is an assumption. Continuation and qualifying months are separate: outreach and monitoring can cost money even when a month produces no revenue.</p>{fields(['startMonth', 'monthlyRetention'])}<Comparison result={result} rows={[{ key: 'physicianReferrals', label: 'Usual physician referrals (supplementary)' }, ...(inputs.recruitmentMode === 'healthpartners' ? [{ key: 'outreachContacts', label: 'Patients targeted for intake outreach' }, { key: 'intakeAttendees', label: 'Completed pharmacist intakes' }] : [{ key: 'reviews', label: 'Added completed MTM reviews' }]), { key: 'offers', label: inputs.recruitmentMode === 'healthpartners' ? 'Intake attendees offered activation, after recontact rules' : 'Pharmacist RPM offers' }, { key: 'duplicateOffers', label: 'Offers overlapping physician referral' }, { key: 'newInitiations', label: 'Unique new RPM starts' }, { key: 'activeMonths', label: 'Active patient-months in year one' }]} /></section>
        </>}
        {tab === 'Deprescribing' && <>
          <section className="study-card"><h2>Medication review is a second contribution</h2><p className="study-copy">Review can support appropriate deprescribing for existing RPM patients and newly recruited patients. The model subtracts outcomes under usual care. A low reading does not itself establish that stopping a medicine is appropriate.</p>{fields(['clinicalMode'])}{draftMinor ? <><div className="study-explanation"><strong>MINOR-informed 45-day scenario</strong> The randomized trial reported patient-level antihypertensive deprescribing in 31/161 (19.3%) with pharmacist management and 11/161 (6.8%) with home monitoring and physician review. The denominator includes all comparable reviewed/monitored participants, not just those with low BP. Transfer to this clinic and the share meeting the trial’s characteristics remain assumptions. These outcomes do not establish exactly one complete medication discontinuation.</div>{fields(['minorEligibleShare', 'minorActionBaseline', 'minorActionIntegrated', 'minorExtrapolation'])}{draft.minorExtrapolation === 'assumed' && <><p className="study-copy">Optional extension: assume one medicine-equivalent per patient outcome and constant monthly restart risk beginning at the 45-day assessment. The 69.4% reference came from a separate Singapore cohort already deprescribed, not MINOR. Applying it for 12 months after this assessment is an additional time-origin and population transfer.</p>{fields(['persistence12', 'drugCostPerMonth'])}</>}<p className="study-source-note">MINOR participants were aged ≥60, treated for hypertension, able to perform home monitoring, and not classified as poorly adherent. Both arms received home BP monitoring. An older indexed PDF abstract reports 9 controls (5.6%); the current publisher abstract, table, and author record report 11 (6.8%). <a href="https://www.sciencedirect.com/science/article/pii/S0149291823002035" target="_blank" rel="noreferrer">Publisher ↗</a> · <a href="https://repositorio.ufba.br/handle/ri/36958" target="_blank" rel="noreferrer">Author record ↗</a></p></> : draft.clinicalMode === 'illustrative' ? <><div className="study-explanation"><strong>Illustrative low-BP scenario</strong> The 10% usual-care and 30% integrated probabilities remain investigator assumptions. MINOR’s subgroup prescription-count reduction is not a patient probability.</div>{fields(['lowBpShare', 'actionBaseline', 'actionIntegrated', 'persistence12', 'drugCostPerMonth'])}</> : <p className="study-copy">{draft.clinicalMode === 'none' ? 'Medication effects and offsets are explicitly zero in both pathways; review and service costs remain.' : 'Clinical outcomes and medication offsets remain unspecified; the clinic financial result still uses collections minus costs.'}</p>}<p className="study-copy">No symptom, fall, hospitalization, or cardiovascular savings are assigned.</p></section>
          <section className="study-card"><h2>Separate the clinical and financial clocks</h2><p className="study-copy">{isMinor ? 'The measured source endpoint is 45 days after home BP monitoring. In the optional extension, the model approximates that assessment as two calendar months after intake and counts only later medication-equivalent months inside the budget year. Twelve-month persistence after that assessment is an extrapolation and can extend beyond year one.' : 'Medication actions occur in the specified assessment month. A reduction sustained for 12 months can extend beyond the first budget year; year-one savings include only medication-months within months 1–12. One medicine per action and a constant monthly restart risk are simplifying assumptions.'}</p><Comparison result={result} rows={[{ key: 'actions', label: isMinor ? 'Patients with deprescribing at 45 days' : 'Patients with a one-medicine reduction', clinical: true }, { key: 'sustainedAt12Months', label: isMinor ? 'Extrapolated reductions maintained 12 months after assessment' : 'Medicines still reduced 12 months after action', clinical: true }, { key: 'medicationMonths', label: 'Assumed reduced-medication months in budget year', clinical: true }, { key: 'drugSavings', label: 'Medication cost offset (excluded from clinic surplus)', format: money }]} /></section>
        </>}
        {tab === 'Financial return' && <>
          <section className="study-card">
            <h2>Original Medicare clinic perspective</h2>
            <p className="study-copy">Clinic operating margin = RPM collections − program costs. Added financial surplus is the change in this margin after pharmacist integration. The study assumes an eligible clinic billing Original Medicare fee-for-service through its physician or qualified practitioner arrangement. All clinic collections count; there is no 50% payer-share reduction. Medication cost offsets are reported separately and do not become clinic revenue.</p>
            <p className="study-copy">The default 70% recurring-month qualification, 70% setup qualification and 90% all-in collection realization are editable planning assumptions, not empirical Medicare estimates. The collection factor applies to the total allowed amount, including payer and patient receipts and adjustments. It is not an extra Medicare payment percentage.</p>
          </section>
          <section className="study-card">
            <h2>Match reimbursement to the clinical work</h2>
            <p className="study-copy">Medicare mode uses cited 2026 national nonfacility benchmarks. The clinical management code uses the relevant pathway’s physician clinical time and qualifying nurse or pharmacist/technician clinical time. Administrative and technical assistance, separate onboarding and medication review do not enter that threshold. Custom mode lets you test a local allowed-amount assumption within this clinic perspective. Neither mode establishes billing eligibility.</p>
            {fields(['reimbursementMode'])}
            {draft.reimbursementMode === 'custom' && fields(['monthlyRevenueBenchmark', 'customSetupRevenueBenchmark'])}
            {fields(['qualificationShare', 'setupQualificationShare', 'collectionShare'])}
            <PaymentSchedule inputs={draft} draft={dirty} />
            <p className="study-copy">The qualifying-month share summarizes months meeting the selected recurring bundle requirements, including data transmission and clinical communication. It is not a daily claims model. Setup is charged once only for a qualifying new episode, never again for overlapping referrals or existing participants.</p>
          </section>
          <section className="study-card">
            <h2>Who does the work?</h2>
            <p className="study-copy">The primary comparison keeps the same physician, nurse, and medical-assistant RPM service in both pathways, then adds pharmacist recruitment and medication review. No pharmacist or pharmacy-technician cost is assigned to the baseline. The alternative staffing scenario changes routine delivery only in the integrated pathway.</p>
            {fields(['staffingMode'])}
            <TeamStaffingSummary inputs={draft} draft={dirty} />
            <h3>Published wage benchmarks · explicit employer-cost approximation</h3>
            <p className="study-copy">Each occupation has its own cited BLS wage benchmark. A healthcare compensation loading factor is applied once; local wages and benefits may differ. No wages come from the cashbook. Task duration is a separate investigator assumption and is not established by the wage source.</p>
            {fields(['physicianWage', 'nurseWage', 'assistantWage', 'pharmacistWage', 'supportWage'])}
            <h3>Physician-led clinic workflow · both pathways in the main analysis</h3>
            {fields(['physicianReferralMinutes', 'monitorPhysicianMinutes', 'monitorNurseMinutes', 'qualifiedNurseMinutes', 'monitorAssistantMinutes', 'onboardingNurseMinutes', 'onboardingAssistantMinutes'])}
            <h3>Added pharmacist recruitment and medication review</h3>
            {fields(['offerMinutes', 'offerSupportMinutes', ...(draftHealthPartners ? ['intakeMinutes'] : ['reviewMinutes'])])}
            {draft.staffingMode === 'integrated-team' && <><h3>Optional pharmacy team delivery · integrated pathway only</h3><p className="study-copy">The reference 27 technician and 3 pharmacist minutes give a 9:1 task-time ratio. Physician clinical review remains additional, and pharmacist reviews/recruitment are separate. This is not a headcount ratio or a measured average workflow. The specified clinical subset of technician time must meet the assumed supervised billing arrangement.</p>{fields(['monitorPharmacistMinutes', 'monitorSupportMinutes', 'qualifiedSupportMinutes', 'onboardingMinutes', 'onboardingSupportMinutes'])}</>}
            <p className="study-copy">Each task is costed once: minutes ÷ 60 × the professional’s hourly employer cost. Qualifying clinical time is a subset of paid work. Additional participants generate additional physician and clinic-staff time. Valued resources do not imply an immediate payroll reduction.</p>
            <div className="study-explanation"><strong>Evidence does not establish one universal staffing mix.</strong> Interviews with 20 US primary care physicians found both personal data review and nurse/assistant/vendor-supported workflows. That study supports testing different arrangements, not the specific minutes chosen here. <a className="study-text-link" href="https://pmc.ncbi.nlm.nih.gov/articles/PMC11436674/" target="_blank" rel="noreferrer">Read the workflow study ↗</a></div>
          </section>
          <section className="study-card">
            <h2>Devices, software and overhead</h2>
            <p className="study-copy">The default uses the cashbook’s $90 one-time vendor/device package per new start and $12 technology bundle per active patient-month. The supplied scenario assumes these charges include the device, software and cellular connectivity, so extra connectivity and platform-base charges start at zero. These are business-plan assumptions, not a verified Prevounce quotation or public price benchmarks. The cost table totals the fees across new starts and active patient-months; it does not show a single clinic setup fee.</p>
            {fields(['deviceCost', 'monthlyTechnologyCost', 'monthlyConnectivityCost', 'monthlyPlatformBaseCost', 'platformProviderCount', 'fixedCost', 'addedFixedCost'])}
            <p className="study-copy">Usual-care clinic onboarding remains separate from the vendor charge. In the HealthPartners scenario, intake-driven starts already receive device education within the intake workload. Do not add component fees already included in the chosen package. If a separate platform subscription is entered, it is counted once in each program and cancels in the added contribution. Other fixed overhead excludes that subscription. Published component-price presets remain available for comparison.</p>
          </section>
          <section className="study-card">
            <h2>Where the money goes</h2>
            <p className="study-copy">Applied results across the full cohort. Each resource appears once, including service in months that do not produce collections. Positive cost differences mean more spending.</p>
            <Comparison result={result} rows={costRows} />
            <Comparison result={result} rows={[
              ...STUDY_HOUR_ROWS.map(([key, label]) => ({ key, label })),
              { key: 'qualifiedMonths', label: 'Qualifying recurring service months' },
              { key: 'qualifiedSetups', label: 'Qualifying unique new setups' },
              { key: 'monthlyRevenue', label: 'Clinic recurring collections', format: money },
              { key: 'setupRevenue', label: 'Clinic one-time setup collections', format: money },
              { key: 'revenue', label: 'Total clinic RPM collections', format: money },
              { key: 'programCost', label: 'Total program costs', format: money },
              { key: 'operatingMargin', label: 'Clinic operating margin', format: money }
            ]} />
          </section>
          <section className="study-card">
            <h2>What would make integration break even?</h2>
            <p className="study-copy">These thresholds use expected additional clinic financial surplus. They address the added pharmacist role, which can still lose money when the whole program is profitable. A mathematical threshold is not a quoted reimbursement rate or a feasibility guarantee.</p>
            <div className="study-break-even">
              <div><h3>{inputs.recruitmentMode === 'healthpartners' ? 'Minimum intake attendance' : 'Minimum offer probability'}</h3><strong>{threshold?.status === 'unestimated' ? 'Not estimable' : known(threshold?.rate) ? percent(threshold.rate) : 'Not attainable'}</strong><p>{threshold?.status === 'unestimated' ? 'The financial threshold is unavailable for these inputs.' : threshold?.status === 'unattainable' ? `No ${inputs.recruitmentMode === 'healthpartners' ? 'intake attendance' : 'offer'} rate from 0% to 100% covers the added costs with the other applied assumptions.` : threshold?.status === 'already-nonnegative' ? `Already nonnegative at zero ${inputs.recruitmentMode === 'healthpartners' ? 'intake attendance' : 'offers'} under the other assumptions.` : inputs.recruitmentMode === 'healthpartners' ? 'Attendance among targeted patients, keeping the activation rate, outreach costs and recontact rules fixed.' : 'Offer probability among completed reviews, with the same eligibility and recontact rules.'}</p></div>
              <div><h3>Required common recurring payment</h3><strong>{known(breakEvenRevenue) ? `${rate(breakEvenRevenue)}/month` : !commonPaymentBenchmark ? 'Different payment tiers' : 'Not attainable / estimable'}</strong><p>{!commonPaymentBenchmark ? 'Not shown because the two pathways use different recurring payment benchmarks. A single common-payment threshold would not describe this staffing scenario.' : breakEvenRevenue === 0 ? 'Added costs are covered without further recurring receipts.' : !known(run.expected.delta.netFinancialBenefit) ? 'The financial threshold is unavailable for these inputs.' : collectionsDenominator <= 0 ? 'Select a paid pathway and a positive share of qualifying, collectible service months to estimate a payment threshold.' : 'The same hypothetical allowance in both pathways, per qualifying month before collections. Holds setup receipts fixed; this does not change the Medicare schedule.'}</p></div>
              <div><h3>Added cost reduction needed</h3><strong>{known(financialGap) ? money(financialGap) : 'Not estimable'}</strong><p>{known(costReduction) ? `${percent(costReduction)} of added costs, holding recruitment, collections and clinical outcomes fixed. Changing staffing may also change reimbursement and care; this is only a financial target.` : 'A positive incremental cost is needed to express the reduction as a percentage.'}</p></div>
            </div>
          </section>
        </>}
        {tab === 'Evidence & scenarios' && <>
          <section className="study-card"><h2>Test the assumptions that drive the result</h2><p className="study-copy">Each preset states the payment, workload or clinical assumptions it changes. Recruitment remains shared with the current program. Applying a preset updates the calculator and restarts microsimulation playback with the same seed.</p><div className="study-table-wrap"><table className="study-table"><thead><tr><th>Scenario</th><th>Added starts</th><th>Added clinic surplus / 1,000</th><th>Use scenario</th></tr></thead><tbody>{scenarios.map(s => <tr key={s.id}><th scope="row">{s.name}</th><td>{number(s.result.delta.newInitiations)}</td><td>{money(s.result.delta.netBenefitPer1000)}</td><td><button className="study-small-button" aria-label={`Apply ${s.name}`} onClick={() => apply(s.inputs)}>Apply {s.id === 'illustrative' ? 'illustrative' : 'scenario'}</button></td></tr>)}</tbody></table></div><p className="study-copy">Expected-value scenarios are deterministic. Seed variation illustrates Monte Carlo noise; it is not a clinical confidence interval or a probabilistic sensitivity analysis.</p></section>
          <section className="study-card"><h2>Evidence, with its limits</h2><p className="study-copy">A source supports a specific input and population. Transferring that quantity to this study remains an assumption. Published allowed amounts and occupation-specific wages support financial benchmarks. MINOR supports a transferred short-term clinical scenario. Recruitment effects, staffing minutes, billing qualification, collections and the unpublished cashbook vendor package remain assumptions; a citation does not validate the complete model. Staff minutes, billing qualification, collection realization, connectivity, overhead, recruitment and deprescribing effects still require local calibration. The population is Original Medicare fee-for-service; a commercial or Medicare Advantage payer mix is not modeled. Prices have their own source years; no automatic inflation adjustment is applied.</p><div className="study-citations">{[...FINANCIAL_EVIDENCE.map(({ title, description, url, reference }) => [title, description, url, reference]), ...citations].map(([title, text, url, reference], i) => <article key={title}><span>{String(i + 1).padStart(2, '0')}</span><div>{url ? <a href={url} target="_blank" rel="noreferrer">{title} ↗</a> : <strong className="study-citation-title">{title}</strong>}<p>{text}</p>{reference && <p className="study-source-note">{reference}</p>}</div></article>)}</div><a href={METHODS} target="_blank" rel="noreferrer" className="study-text-link">Read the complete equations, evidence and limitations ↗</a></section>
          <section className="study-card"><h2>Reproduce this scenario</h2><p className="study-copy">JSON includes the applied inputs, seed, model version, patient histories, analytic expectations, seeded results and source notes. Loading JSON verifies an exact replay before changing the scenario. Earlier model versions are rejected with a clear version message; their calculations are not silently changed. CSV contains full-precision summary results; JSON is the replay format. Exported files contain only synthetic data.</p><p className="study-copy">Model {run.metadata.version} · {run.metadata.id}. The earlier budget calculator has different endpoints and remains available as a <Link className="study-text-link" to="/legacy-budget">historical model</Link>. Its exports are not interchangeable with this study.</p></section>
        </>}
      </div>
      <div className="study-actions"><div><strong>{dirty ? 'You have unapplied edits' : 'Calculator and simulation share this scenario'}</strong><p>{dirty ? 'Apply edits before exporting or opening the simulation.' : 'Save a JSON file to retain inputs after refreshing the page.'}</p></div><div className="study-action-buttons"><button className="btn-primary" onClick={() => apply(draft)} disabled={!dirty}>Apply inputs</button><button className="study-small-button" onClick={() => apply(getIntegrationScenarios(DEFAULT_INTEGRATION_INPUTS).find(s => s.id === 'physician-led-minor').inputs)}>Reset physician-led study scenario</button></div></div>
      {notice && <p className="study-notice" role="status">{typeof notice === 'string' ? notice : notice.text}</p>}
      <div className="study-export-row"><div><button className="study-small-button" onClick={() => save('json')}>Save scenario JSON</button><button className="study-small-button" onClick={() => save('csv')}>Export results CSV</button><button className="study-small-button" disabled={busy} onClick={() => fileInput.current?.click()}>{busy ? 'Verifying…' : 'Load scenario JSON'}</button><input ref={fileInput} type="file" accept=".json,application/json" onChange={load} aria-label="Load integration scenario JSON" hidden /></div><a href={METHODS} target="_blank" rel="noreferrer">Methods & citations ↗</a></div>
    </div>
  </div>
}
