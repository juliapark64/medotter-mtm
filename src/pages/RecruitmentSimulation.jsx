import { useEffect, useMemo, useReducer, useState } from 'react'
import { Link } from 'react-router-dom'
import { useIntegrationStudy } from '../context/IntegrationStudyContext'
import { FINANCIAL_EVIDENCE, getIntegrationScenarios, getRpmPaymentSchedule } from '../lib/integrationStudy'
import { STUDY_COST_LABELS, STUDY_HOUR_ROWS, ClinicPathwaySummary, RecurringStaffingSummary, PairedPaymentSummary, PatientTaskLedger } from '../components/StudyStaffing'
import '../styles/integrationStudy.css'
import rooms from '../assets/simulation/physician-pharmacy-rooms.png'
import patientSprite from '../assets/simulation/synthetic-patient.png'
import '../styles/recruitmentSimulation.css'

const phaseLabels = inputs => [inputs.recruitmentMode === 'healthpartners' ? 'Pharmacist intake' : 'MTM review', inputs.recruitmentMode === 'healthpartners' ? 'First transmission' : 'RPM offer & start', 'Monitoring', inputs.clinicalMode === 'minor' ? '45-day deprescribing' : 'Medication reduction', 'Financial result']
const LAST_PHASE = 4
const initialPlayback = { cursor: 0, phase: 0, processed: 0, playing: false, inspection: null }
function playbackReducer(state, action) {
  switch (action.type) {
    case 'reset': return { ...initialPlayback }
    case 'play': return state.processed === action.N ? { ...initialPlayback, playing: true } : { ...state, inspection: null, playing: true }
    case 'pause': return { ...state, playing: false }
    case 'inspect': return { ...state, playing: false, inspection: action.index }
    case 'return': return { ...state, inspection: null }
    case 'finish': return { ...state, cursor: action.N - 1, phase: LAST_PHASE, processed: action.N, inspection: null, playing: false }
    case 'advance': {
      if (state.inspection !== null) return { ...state, inspection: null }
      if (state.phase < LAST_PHASE) {
        const phase = state.phase + 1
        return { ...state, phase, processed: phase === LAST_PHASE ? Math.max(state.processed, state.cursor + 1) : state.processed, playing: phase === LAST_PHASE && state.cursor === action.N - 1 ? false : state.playing }
      }
      return state.cursor < action.N - 1 ? { ...state, cursor: state.cursor + 1, phase: 0 } : { ...state, playing: false }
    }
    default: return state
  }
}

const known = value => typeof value === 'number' && Number.isFinite(value)
const number = value => known(value) ? value.toLocaleString('en-US', { maximumFractionDigits: 2 }) : 'Not estimated'
const signed = value => known(value) ? `${value > 0 ? '+' : ''}${number(value)}` : 'Not estimated'
const money = value => known(value) ? value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }) : 'Not estimated'
const difference = (a, b) => known(a) && known(b) ? a - b : null
const yesNo = value => value ? 'Yes' : 'No'
const percent = value => known(value) ? `${number(value * 100)}%` : 'Not estimated'

function rpmStatus(patient) {
  if (patient.existingRpm) return 'Existing RPM continues'
  if (patient.baseline.newInitiation) return 'Starts through usual care'
  if (patient.additionalInitiation) return 'Additional start through MTM'
  return 'No RPM initiation'
}

function reviewStatus(patient, inputs) {
  if (inputs.recruitmentMode === 'healthpartners') {
    if (!patient.pharmacist.inReviewPopulation) return 'Not targeted for pharmacist intake'
    return patient.pharmacist.reviewCompleted ? 'Pharmacist intake attended' : 'Outreach made; intake not attended'
  }
  if (!patient.pharmacist.inReviewPopulation) return 'Outside the MTM review population'
  return patient.pharmacist.reviewCompleted ? 'MTM review completed' : 'MTM review not completed'
}

function offerStatus(patient) {
  const p = patient.pharmacist
  if (p.recontacted) return 'RPM offered after a usual referral did not lead to initiation'
  if (p.duplicateOffer) return 'Offer overlaps the usual physician referral'
  if (p.offered) return 'RPM offered'
  if (!p.reviewCompleted) return 'No completed review for an RPM offer'
  if (patient.baseline.participating) return 'Current-program RPM already available'
  if (p.reasonForNoOffer === 'recontact-disabled') return 'Further contact after a usual referral is not modeled'
  return 'RPM not offered'
}

function phaseContent(patient, phase, inputs) {
  const { clinicalMode } = inputs
  const a = patient.baseline
  const b = patient.integrated
  switch (phase) {
    case 0: return {
      title: reviewStatus(patient, inputs),
      note: inputs.recruitmentMode === 'healthpartners' ? `HealthPartners reported 385/1,423 attending intake within six weeks. This scenario assumes ${percent(inputs.intakeAttendance)} attendance among the ${percent(inputs.f)} targeted share. Each targeted patient incurs outreach work; each attendee incurs ${number(inputs.intakeMinutes)} pharmacist minutes even if no RPM activation follows. The one-hour protocol appointment is a workload assumption, not an observed mean.` : 'The modeled MTM review can support recruitment or medication assessment for someone already receiving RPM.',
      fields: [
        [inputs.recruitmentMode === 'healthpartners' ? 'Targeted for intake outreach' : 'In the review population', yesNo(patient.pharmacist.inReviewPopulation)],
        [inputs.recruitmentMode === 'healthpartners' ? 'Pharmacist intake attended' : 'Review completed', yesNo(patient.pharmacist.reviewCompleted)],
      ],
    }
    case 1: return {
      title: rpmStatus(patient),
      note: inputs.recruitmentMode === 'healthpartners' ? `A first transmitted BP reading defines activation. The applied probability after completed intake is ${percent(inputs.activationAfterIntake)}; the study reference is 80%. Attendance alone does not count as RPM initiation. Existing participants and overlapping physician contacts do not create a second episode. Recontact after a failed physician referral follows its separate assumption.` : 'A new start requires a first transmitted BP reading. A referral or an offer alone does not count as initiation.',
      fields: [
        ['Pharmacist RPM offer', offerStatus(patient)],
        ['Additional RPM start', yesNo(patient.additionalInitiation)],
      ],
    }
    case 2: return {
      title: b.participating ? 'Monitoring contributes service months' : 'No RPM service in this realization',
      note: `These are service-month totals for the budget year, not elapsed playback time. The baseline uses ${number(inputs.monitorPhysicianMinutes)} physician, ${number(inputs.monitorNurseMinutes)} nurse and ${number(inputs.monitorAssistantMinutes)} medical-assistant minutes per active month, with no pharmacist involvement. ${inputs.staffingMode === 'shared-clinic' ? 'The integrated pathway retains this routine care team and adds pharmacist recruitment and review.' : 'The optional integrated pathway replaces routine nurse/assistant work with pharmacist/technician work, while physician clinical review remains.'} All task durations are planning assumptions.`,
      fields: [
        ['Current program · active months', number(a.activeMonths)],
        ['With MTM integration · active months', number(b.activeMonths)],
        ['Added service months', signed(b.activeMonths - a.activeMonths)],
        ['Baseline · qualifying clinical minutes/month', number(getRpmPaymentSchedule(inputs, 'baseline').qualifyingClinicalMinutes)],
        ['Integrated · qualifying clinical minutes/month', number(getRpmPaymentSchedule(inputs, 'integrated').qualifyingClinicalMinutes)],
        ...STUDY_HOUR_ROWS.map(([key, label]) => [label + ' · baseline → integrated', `${number(a[key])} → ${number(b[key])}`]),
        ['With MTM · reimbursement-qualified months', number(b.qualifiedMonths)],
        ['With MTM · one-time setup qualified', yesNo(b.qualifiedSetups)],
      ],
    }
    case 3: return {
      title: clinicalMode === 'none' ? 'Medication benefits excluded in this scenario' : known(b.clinical.actions) ? clinicalMode === 'minor' ? 'Modeled patient-level deprescribing at 45 days' : 'Medication reductions under the applied assumptions' : 'Medication reduction is not yet estimated',
      note: clinicalMode === 'none'
        ? 'This conservative scenario explicitly sets medication reductions and drug savings to zero in both programs. This is a modeling assumption, not a finding about deprescribing effectiveness.'
        : clinicalMode === 'minor' && known(b.clinical.actions)
        ? `MINOR reference: 11/161 usual monitoring/review versus 31/161 with pharmacist management. The applied comparable-population share is ${percent(inputs.minorEligibleShare)}; no low-BP multiplier is applied. This synthetic outcome does not establish exactly one medication stopped. ${inputs.minorExtrapolation === 'assumed' ? 'Persistence and one-medicine-equivalent savings are an optional extrapolation starting at the 45-day assessment (approximated as two months after intake), not trial results.' : 'Long-term persistence and medication savings are not estimated.'}`
        : known(b.clinical.actions)
        ? 'Synthetic medication events use the applied scenario assumptions. Persistence is assessed 12 months after reduction and can extend beyond the first-year budget.'
        : 'The clinical inputs are unspecified. This patient is not assigned an invented reduction or an observed clinical benefit.',
      fields: [
        ['With MTM · active at the modeled assessment', yesNo(b.activeAtAssessment)],
        [clinicalMode === 'minor' ? 'Current program · patient with deprescribing at 45 days' : 'Current program · medication reductions', number(a.clinical.actions)],
        [clinicalMode === 'minor' ? 'With integration · patient with deprescribing at 45 days' : 'With MTM · medication reductions', number(b.clinical.actions)],
        [clinicalMode === 'minor' ? 'Extrapolated maintenance 12 months after assessment' : 'With MTM · maintained 12 months after reduction', number(b.clinical.sustainedAt12Months)],
        ['Assumed reduced-medication months in budget year', number(b.clinical.medicationMonths)],
      ],
    }
    default: return {
      title: 'This patient’s incremental financial contribution',
      note: 'With MTM integration minus the current program for an Original Medicare fee-for-service clinic. Receipts reflect qualification and collection assumptions; all clinic collections count without a payer-share reduction. These are modeled receipts, not actual collections. Setup is counted once for a qualifying new start, never for an existing participant. Patient-level amounts exclude fixed cohort costs. Medication savings are separate and do not enter clinic surplus.',
      fields: [
        ['Additional program cost', money(b.programCost - a.programCost)],
        ['Additional recurring RPM receipts', money(b.monthlyRevenue - a.monthlyRevenue)],
        ['Additional one-time setup receipts', money(b.setupRevenue - a.setupRevenue)],
        ['Total additional clinic receipts', money(b.revenue - a.revenue)],
        ['Medication cost offset · separate from clinic surplus', money(difference(b.drugSavings, a.drugSavings))],
        ['Added clinic financial surplus', money(difference(b.netFinancialBenefit, a.netFinancialBenefit))],
      ],
    }
  }
}

function UsualCareContext({ patient, inputs }) {
  return (
    <section className="sim-usual-care" aria-label="Current-program context for the selected patient">
      <div className="sim-context-scene" style={{ backgroundImage: `url(${rooms})` }} aria-hidden="true">
        <img src={patientSprite} alt="" /><span>{patient.id}</span>
      </div>
      <div className="sim-context-copy">
        <span className="sim-eyebrow">CURRENT PROGRAM · CONTINUES WITH INTEGRATION</span>
        <h2>Physician-led RPM with clinic staff</h2><p className="sim-usual-workflow">Physician referral → nurse/assistant onboarding → physician clinical review and nurse follow-up. No pharmacist participates in this baseline.</p>
        <dl>
          <div><dt>RPM at baseline</dt><dd>{yesNo(patient.existingRpm)}</dd></div>
          <div><dt>Usual physician referral</dt><dd>{yesNo(patient.physician.referred)}</dd></div>
          <div><dt>RPM under current care</dt><dd>{yesNo(patient.baseline.participating)}</dd></div><div><dt>Baseline physician hours</dt><dd>{number(patient.baseline.physicianHours)}</dd></div><div><dt>Baseline nurse / assistant hours</dt><dd>{number(patient.baseline.nurseHours)} / {number(patient.baseline.assistantHours)}</dd></div><div><dt>Routine care with integration</dt><dd>{inputs.staffingMode === 'shared-clinic' ? 'Same clinic team' : 'Physician + optional pharmacy team'}</dd></div>
        </dl>
      </div>
    </section>
  )
}

function IntegrationJourney({ patient, phase, inputs }) {
  const content = phaseContent(patient, phase, inputs)
  return (
    <article className="sim-room sim-room-pharmacy sim-integration-room">
      <header className="sim-room-heading">
        <div><span className="sim-eyebrow">ADDED PHARMACIST INVOLVEMENT</span><h2>MTM + RPM integration</h2></div>
        <span className="sim-code">{patient.id}</span>
      </header>
      <div className="sim-scene" style={{ backgroundImage: `url(${rooms})` }} aria-hidden="true">
        <div className={`sim-character ${phase > 0 && patient.pharmacist.reviewCompleted ? 'sim-at-encounter' : ''}`} key={patient.id}>
          <span>{patient.id}</span><img src={patientSprite} alt="" />
        </div>
        <span className="sim-scene-caption">{phaseLabels(inputs)[phase]} · {phase === 0 ? reviewStatus(patient, inputs) : phase === 1 ? rpmStatus(patient) : phase === 2 ? `${number(patient.integrated.activeMonths)} active service months` : phase === 3 ? 'Scenario-based medication assessment' : 'Incremental financial result'}</span>
      </div>
      <section className="sim-phase-content" aria-labelledby="sim-phase-title">
        <span className="sim-eyebrow">STEP {phase + 1} OF {phaseLabels(inputs).length}</span>
        <h3 id="sim-phase-title">{content.title}</h3>
        <p>{content.note}</p>
        <dl className="sim-phase-fields">{content.fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      </section>
    </article>
  )
}

function summarizeProcessed(patients) {
  return patients.reduce((totals, patient) => {
    totals.addedStarts += Number(patient.additionalInitiation)
    totals.addedMonths += patient.integrated.activeMonths - patient.baseline.activeMonths
    const reductions = difference(patient.integrated.clinical.actions, patient.baseline.clinical.actions)
    totals.addedReductions = known(totals.addedReductions) && known(reductions) ? totals.addedReductions + reductions : null
    return totals
  }, { addedStarts: 0, addedMonths: 0, addedReductions: 0 })
}

function StudyScenarioControls({ inputs, applyInputs, setNotice }) {
  const scenarios = getIntegrationScenarios(inputs).filter(scenario => ['physician-led-minor', 'team-90-10', 'healthpartners-minor', 'healthpartners', 'minor', 'minor-extension', 'no-added-recruitment', 'no-enhanced-deprescribing', 'conservative'].includes(scenario.id))
  return <section className="sim-card sim-study-evidence" aria-label="Study scenarios and sources">
    <label htmlFor="sim-study-scenario">Load a shared study scenario</label>
    <select id="sim-study-scenario" value="" onChange={event => {
      const scenario = scenarios.find(item => item.id === event.target.value)
      if (scenario) { applyInputs(scenario.inputs); setNotice(`${scenario.name} applied to the calculator and microsimulation. Playback restarts with the same seed.`) }
    }}><option value="" disabled>Choose the physician-led baseline or a sensitivity…</option>{scenarios.map(scenario => <option value={scenario.id} key={scenario.id}>{scenario.name}</option>)}</select>
    <div className="sim-evidence-columns">
      <div><h3>{inputs.recruitmentMode === 'healthpartners' ? 'Sensitivity: HealthPartners intake' : 'Remote MTM recruitment · illustrative'}</h3>{inputs.recruitmentMode === 'healthpartners' ? <><p><strong>27.1% attended intake; 80% of attendees sent a BP reading.</strong> HyperLink 3 observed 385/1,423 intake attendees within six weeks. The offered one-hour in-person appointment is a protocol workload assumption, not measured mean time. Transfer to a remote, delivered-device clinic remains uncertain.</p><p>Applied: {percent(inputs.f)} targeted; {percent(inputs.intakeAttendance)} attend; {percent(inputs.activationAfterIntake)} activate; {number(inputs.intakeMinutes)} pharmacist minutes per attendee. Outreach is costed even for nonattendees.</p></> : <><p>Remote pharmacist review and a first transmitted BP reading define the modeled recruitment pathway. No in-person appointment is required. The review reach, completion, offers, uptake and staff durations are assumptions or transferred benchmarks, not a measured combined recruitment effect.</p><p>Applied: {percent(inputs.f)} review reach, {percent(inputs.c)} completion, {percent(inputs.o)} offers and {percent(inputs.qB)} uptake, subject to overlap rules. HealthPartners remains an optional intake-workflow sensitivity.</p></>}<a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC9649877/" target="_blank" rel="noreferrer">HealthPartners reference and its different workflow ↗</a></div>
      <div><h3>{inputs.clinicalMode === 'minor' ? 'MINOR 45-day outcome · active' : 'MINOR deprescribing reference'}</h3><p><strong>19.3% with pharmacist management versus 6.8% with usual review.</strong> The trial reported 31/161 versus 11/161 patients receiving antihypertensive deprescribing at 45 days. Both groups had home monitoring. These are all-participant rates, not probabilities conditional on low BP. The baseline continues to allow physician deprescribing.</p>{inputs.clinicalMode === 'minor' && <p>Applied: {percent(inputs.minorActionIntegrated)} versus {percent(inputs.minorActionBaseline)} in the assumed {percent(inputs.minorEligibleShare)} comparable share. {inputs.minorExtrapolation === 'assumed' ? 'Long-term persistence and medicine-equivalent costs are explicitly extrapolated.' : 'Persistence and medication savings are not estimated.'}</p>}<a href="https://www.sciencedirect.com/science/article/pii/S0149291823002035" target="_blank" rel="noreferrer">Read the MINOR trial ↗</a></div>
    </div>
    <p className="sim-footnote">The studies have different populations and workflows; the combined scenario is not a jointly tested intervention. Eligibility, timing, retention, recruitment overlap, billing qualification and collections remain assumptions. Current publisher/table MINOR counts use 11 controls; an older indexed abstract reports 9 (5.6%). The model does not turn synthetic outcomes into clinical evidence.</p>
  </section>
}

function FinancialAssumptions({ inputs }) {
  return <details className="sim-finance-assumptions">
    <summary>Applied payment and staffing assumptions <span>{inputs.staffingMode === 'shared-clinic' ? 'Same physician / nurse / assistant routine RPM team in both pathways' : 'Optional integrated pharmacy-team delivery; physician clinical review retained'}</span></summary>
    <RecurringStaffingSummary inputs={inputs} />
    <PairedPaymentSummary inputs={inputs} />
    <p className="sim-finance-assumption-note">Billing qualification and all-in collection realization remain assumptions: {percent(inputs.qualificationShare)} of active months and {percent(inputs.setupQualificationShare)} of new setups qualify; {percent(inputs.collectionShare)} of allowed amounts is collected. These are not observed Medicare rates. Physician wages do not set reimbursement. Clinical time must meet the applicable service and supervision requirements; administrative oversight and coordination do not count.</p>
    <p className="sim-finance-assumption-note">The main baseline contains no pharmacist or pharmacy-technician work. Added pharmacist recruitment and review are costed only with integration. Additional participants generate more physician and clinic-staff work. The optional 9:1 technician-to-pharmacist allocation describes only those two roles’ reference task minutes; physician clinical review and pharmacist medication reviews remain separate.</p>
    <p className="sim-finance-assumption-note">Physician referrals use {number(inputs.physicianReferralMinutes)} minutes per referral at {money(inputs.physicianWage)}/hour. Baseline onboarding uses {number(inputs.onboardingNurseMinutes)} nurse + {number(inputs.onboardingAssistantMinutes)} assistant minutes per new start. Added offers use {number(inputs.offerMinutes)} pharmacist + {number(inputs.offerSupportMinutes)} technician minutes per {inputs.recruitmentMode === 'healthpartners' ? 'targeted patient' : 'offer'}. Completed review uses {number(inputs.recruitmentMode === 'healthpartners' ? inputs.intakeMinutes : inputs.reviewMinutes)} pharmacist minutes. Durations are assumptions, not measured mean workloads.</p>
    <p className="sim-finance-assumption-note">Applied technology costs: {money(inputs.deviceCost)} once per new start; {money(inputs.monthlyTechnologyCost)} per active patient-month; {money(inputs.monthlyConnectivityCost)} additional connectivity; {money(inputs.monthlyPlatformBaseCost)} additional platform fee per provider-month × {number(inputs.platformProviderCount)}. The $90/$12 cashbook package is a business-plan assumption, not a verified Prevounce quote. Device, software and cellular are included under the user-specified package; separate connectivity/base fees default to zero. Monthly vendor fees currently apply even when an active month does not qualify for reimbursement.</p>
    <p className="sim-finance-assumption-note">Occupation-specific BLS wage benchmarks and a common compensation loading approximation support employer costs. They do not establish local staffing minutes. Medication outcomes are transferred clinical scenarios; medication cost offsets do not enter clinic surplus. <Link to="/calculator">Review the shared inputs and evidence →</Link></p>
    <details className="sim-finance-sources"><summary>Financial sources and limitations</summary><ul>{FINANCIAL_EVIDENCE.map(source => <li key={source.id}>{source.url ? <a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a> : <strong>{source.title}</strong>}<p>{source.description}</p>{source.reference && <p>{source.reference}</p>}</li>)}</ul></details>
  </details>
}

const costLabels = STUDY_COST_LABELS

function FinancialResultsTable({ run }) {
  const { baseline, integrated, delta } = run.actual
  const receiptRows = [
    ...STUDY_HOUR_ROWS.map(([key, label]) => [key, label, number]),
    ['qualifiedMonths', 'Reimbursement-qualified months', number],
    ['qualifiedSetups', 'New setups qualifying once', number],
    ['monthlyRevenue', 'Clinic recurring receipts', money],
    ['setupRevenue', 'Clinic one-time setup receipts', money],
    ['revenue', 'Total clinic RPM receipts', money],
    ['programCost', 'Total program cost, including fixed costs', money],
    ['operatingMargin', 'Clinic operating margin', money],
  ]
  return <div className="sim-results sim-receipt-results">
    <h3>Modeled receipts and spending</h3><p>Modeled clinic receipts below reflect billing qualification and collection realization. There is no payer-share reduction. Medication cost offsets are excluded from clinic margin, and receipts are not observed collections.</p>
    <div className="sim-table-wrap"><table><caption className="sr-only">Full-cohort modeled receipts and spending for the budget year</caption><thead><tr><th scope="col">Budget-year measure</th><th scope="col">Physician-led baseline</th><th scope="col">With MTM</th><th scope="col">Increment</th></tr></thead><tbody>{receiptRows.map(([key, label, format]) => <tr key={key}><th scope="row">{label}</th><td>{format(baseline[key])}</td><td>{format(integrated[key])}</td><td>{format(delta[key])}</td></tr>)}</tbody></table></div>
    <details className="sim-cost-details"><summary>Where the program spends money</summary><div className="sim-table-wrap"><table><caption className="sr-only">Program cost components; positive increments represent added spending</caption><thead><tr><th scope="col">Cost component</th><th scope="col">Physician-led baseline</th><th scope="col">With MTM</th><th scope="col">Added cost</th></tr></thead><tbody>{costLabels.map(([key, label]) => <tr key={key}><th scope="row">{label}</th><td>{money(baseline.costBreakdown[key])}</td><td>{money(integrated.costBreakdown[key])}</td><td>{money(integrated.costBreakdown[key] - baseline.costBreakdown[key])}</td></tr>)}</tbody></table></div><p className="sim-footnote">Patient-level contributions exclude fixed costs. These cohort totals include each program’s base and fixed costs once. Shared costs cancel in the increment; only additional resources change the integration result.</p></details>
  </div>
}

function IntegrationPlayback({ inputs, run, applyInputs, setNotice, notice }) {
  const [playback, dispatch] = useReducer(playbackReducer, initialPlayback)
  const [speed, setSpeed] = useState('1')
  const [inspectId, setInspectId] = useState('')
  const { processed, cursor, playing, inspection } = playback
  const phase = inspection === null ? playback.phase : LAST_PHASE
  const selectedIndex = inspection ?? cursor
  const patient = run.patients[selectedIndex]
  const complete = processed === inputs.N
  const visibleSummary = useMemo(() => summarizeProcessed(run.patients.slice(0, processed)), [run, processed])
  const queueStart = Math.min(Math.max(0, selectedIndex - 3), Math.max(0, inputs.N - 8))
  const selectedContent = phaseContent(patient, phase, inputs)

  useEffect(() => {
    if (!playing) return undefined
    const timer = setTimeout(() => dispatch({ type: 'advance', N: inputs.N }), 1500 / Number(speed))
    return () => clearTimeout(timer)
  }, [playing, cursor, playback.phase, speed, inputs.N])
  useEffect(() => {
    const pauseIfHidden = () => { if (document.hidden) dispatch({ type: 'pause' }) }
    document.addEventListener('visibilitychange', pauseIfHidden)
    return () => document.removeEventListener('visibilitychange', pauseIfHidden)
  }, [])

  const inspectPatient = event => {
    event.preventDefault()
    const index = /^S?\d+$/i.test(inspectId.trim()) ? Number(inspectId.trim().replace(/^S/i, '')) - 1 : -1
    if (index < 0 || index >= processed) { setNotice('Enter an ID from the patients already processed, such as S0001.'); return }
    dispatch({ type: 'inspect', index })
    setNotice(`Inspecting ${run.patients[index].id}. The cohort counts are unchanged.`)
  }
  const newSeed = () => {
    try {
      applyInputs({ ...inputs, seed: (inputs.seed + 1) >>> 0 })
      setNotice('New seed applied to the shared study scenario. The calculator and patient simulation use this same cohort.')
    } catch (error) { setNotice(`Could not start a new run: ${error.message}`) }
  }

  return (
    <div className="recruitment-sim">
      <div className="sim-shell">
        <header className="sim-title-row">
          <div><span className="sim-eyebrow">STUDY EXPLORER · PATIENT-LEVEL MICROSIMULATION</span><h1>Pharmacist integration <span>in action.</span></h1><p>Follow added pharmacist recruitment, monitoring, medication reductions and clinic financial surplus in an Original Medicare fee-for-service program.</p></div>
          <Link to="/calculator" className="sim-text-link">Shared assumptions & calculator ↗</Link>
        </header>
        <div className="sim-study-note"><strong>Synthetic study model · no collected patient data.</strong> The current program is physician-led RPM with nurse and medical-assistant support, with no pharmacist. Each synthetic record is evaluated through that baseline and a pathway adding pharmacist involvement. Clinical and financial results depend on the shared assumptions.<span className="sim-applied-context">Original Medicare fee-for-service clinic · Deprescribing: {inputs.clinicalMode === 'none' ? 'zero clinical effects assumed' : inputs.clinicalMode === 'unestimated' ? 'not estimated' : inputs.clinicalMode === 'minor' ? 'MINOR-informed 45-day patient outcome' : 'illustrative assumptions'}</span><span className="sim-applied-context">All clinic RPM collections counted after billing qualification and collection realization · Medication cost offsets excluded from clinic surplus.</span></div>
        <ClinicPathwaySummary inputs={inputs} />
        <StudyScenarioControls inputs={inputs} applyInputs={applyInputs} setNotice={setNotice} />
        <FinancialAssumptions inputs={inputs} />

        <section className="sim-toolbar" aria-label="Simulation playback">
          <div className="sim-control-buttons">
            <button type="button" className="sim-button sim-button-primary" onClick={() => dispatch({ type: playing ? 'pause' : 'play', N: inputs.N })}>{playing ? 'Ⅱ Pause' : complete ? '↻ Replay all' : '▶ Play simulation'}</button>
            <button type="button" className="sim-button" disabled={complete && inspection === null} onClick={() => { dispatch({ type: 'pause' }); dispatch({ type: 'advance', N: inputs.N }) }}>Next step →</button>
            <button type="button" className="sim-button" disabled={complete} onClick={() => dispatch({ type: 'finish', N: inputs.N })}>Finish run</button>
            <button type="button" className="sim-button sim-button-quiet" onClick={() => dispatch({ type: 'reset' })}>Rewind</button>
            <button type="button" className="sim-button sim-button-quiet" onClick={newSeed}>New seed</button>
            <label className="sim-speed">Speed <select value={speed} onChange={event => setSpeed(event.target.value)}><option value="1">1×</option><option value="2">2×</option><option value="4">4×</option></select></label>
          </div>
          <div className="sim-progress-heading"><span><strong>{number(processed)}</strong> / {number(inputs.N)} patients processed</span><span>Seed <strong>{inputs.seed}</strong></span></div>
          <progress value={processed} max={inputs.N} aria-label="Patients processed">{number(processed / inputs.N * 100)}%</progress>
          <p className="sim-playback-note">Playback advances through model steps, not clinical months. A patient enters cumulative counts only after the financial-result step.</p>
        </section>

        <div className="sim-workspace">
          <section className="sim-theater" aria-label="Pharmacist integration journey">
            <div className="sr-only" role="status" aria-live={playing ? 'off' : 'polite'} aria-atomic="true">{patient.id}. {phaseLabels(inputs)[phase]}. {selectedContent.title}. {selectedContent.fields.map(([label, value]) => `${label}: ${value}.`).join(' ')} {processed} of {inputs.N} patients processed.{complete ? ` Run complete. Additional RPM starts: ${run.actual.delta.newInitiations}.` : ''}</div>
            <div className="sim-step-bar sim-journey-steps"><span>{inspection !== null ? `INSPECTING ${patient.id}` : `PATIENT ${patient.id}`}</span><ol>{phaseLabels(inputs).map((label, index) => <li key={label} className={index === phase ? 'sim-active-step' : ''} aria-current={index === phase ? 'step' : undefined}><b>{index + 1}</b><span>{label}</span></li>)}</ol></div>
            {inspection !== null && <div className="sim-inspection-note">Completed patient · counts are unchanged. <button type="button" onClick={() => dispatch({ type: 'return' })}>Return to playback →</button></div>}
            <UsualCareContext patient={patient} inputs={inputs} />
            <IntegrationJourney patient={patient} phase={phase} inputs={inputs} />
            {(phase === LAST_PHASE || inspection !== null) && <PatientTaskLedger patient={patient} />}
            {inspection !== null && <section className="sim-inspection-summary" aria-label="Completed patient journey"><h3>Journey for {patient.id}</h3><dl><div><dt>Review</dt><dd>{reviewStatus(patient, inputs)}</dd></div><div><dt>RPM</dt><dd>{rpmStatus(patient)}</dd></div><div><dt>Monitoring</dt><dd>{number(patient.integrated.activeMonths)} active service months with integration</dd></div><div><dt>{inputs.clinicalMode === 'minor' ? 'Patient-level deprescribing at 45 days' : 'Medication reductions'}</dt><dd>{number(patient.baseline.clinical.actions)} current program → {number(patient.integrated.clinical.actions)} with integration</dd></div></dl></section>}
          </section>

          <aside className="sim-cohort-panel" aria-label="Synthetic patient cohort">
            <div className="sim-panel-heading"><span className="sim-eyebrow">SYNTHETIC COHORT</span><h2>Patient register</h2><p>Same IDs in the shared study scenario.</p></div>
            <div className="sim-register-header sim-integration-register"><span>Patient</span><span>RPM outcome</span></div>
            <ol className="sim-register sim-integration-register-list">{run.patients.slice(queueStart, queueStart + 8).map((p, offset) => {
              const index = queueStart + offset
              const done = index < processed
              return <li key={p.id}><button type="button" className={selectedIndex === index ? 'sim-selected-patient' : ''} disabled={!done} onClick={() => dispatch({ type: 'inspect', index })} aria-label={`Inspect ${p.id}${done ? `, ${rpmStatus(p)}` : ', pending'}`}><code>{p.id}</code><span className={done && p.additionalInitiation ? 'sim-register-yes' : ''}>{done ? p.additionalInitiation ? 'Added MTM start' : p.baseline.participating ? 'Current-program RPM' : 'No RPM start' : 'Pending'}</span></button></li>
            })}</ol>
            <p className="sim-register-help">Select a completed ID to inspect its full journey. Inspection does not add the patient to the totals again.</p>
            <form className="sim-inspect-form" onSubmit={inspectPatient}><label htmlFor="inspect-patient">Find a completed patient</label><div><input id="inspect-patient" placeholder="e.g. S0001" value={inspectId} onChange={event => setInspectId(event.target.value)} /><button className="sim-button" disabled={!processed}>View</button></div></form>
            <div className="sim-running-counts"><span className="sim-eyebrow">{complete ? 'COMPLETE RUN · INCREMENTAL COUNTS' : 'PROCESSED PATIENTS ONLY'}</span><div><span>Additional RPM starts</span><strong>{number(visibleSummary.addedStarts)}</strong></div><div><span>Additional service months</span><strong>{signed(visibleSummary.addedMonths)}</strong></div><div><span>{inputs.clinicalMode === 'minor' ? 'Additional patients with deprescribing at 45 days' : 'Additional medication reductions'}</span><strong className={!known(visibleSummary.addedReductions) ? 'sim-not-estimated' : ''}>{processed ? signed(visibleSummary.addedReductions) : '—'}</strong></div><small>{complete ? 'One synthetic realization. Additional outcomes are relative to the continuing current program.' : 'These are partial counts, not full-cohort annual rates. Financial totals include fixed costs only in the completed run.'}</small></div>
          </aside>
        </div>

        <div role="status" className={`sim-status ${notice ? '' : 'sim-status-empty'}`}>{notice || 'The calculator and this simulation share the same applied inputs and synthetic cohort.'}</div>

        <section className="sim-card sim-integration-results" aria-labelledby="sim-results-heading">
          <div className="sim-section-heading"><div><span className="sim-eyebrow">ADDED VALUE OF PHARMACIST INTEGRATION</span><h2 id="sim-results-heading">The full-cohort result</h2><p>{complete ? `${number(inputs.N)} eligible members · one synthetic realization · seed ${inputs.seed}` : 'Finish the run to reveal the complete synthetic result, including fixed program costs.'}</p></div><Link to="/calculator" className="sim-button sim-button-primary">Open financial calculator →</Link></div>
          {complete ? <>
            <div className="sim-financial-result"><span>Additional annual clinic financial surplus per 1,000 eligible members</span><strong>{money(run.actual.delta.netBenefitPer1000)}</strong><p>{known(run.actual.delta.netFinancialBenefit) ? `Cohort total: ${money(run.actual.delta.netFinancialBenefit)} for ${number(inputs.N)} eligible members. Positive means an improvement in clinic operating margin; negative means deterioration.` : 'The financial result is unavailable for these inputs.'}</p></div>
            <dl className="sim-outcome-summary"><div><dt>Additional RPM starts</dt><dd>{number(run.actual.delta.newInitiations)}</dd></div><div><dt>Additional service months</dt><dd>{signed(run.actual.delta.activeMonths)}</dd></div><div><dt>{inputs.clinicalMode === 'minor' ? 'Additional patients with deprescribing at 45 days' : 'Additional reductions maintained 12 months after reduction'}</dt><dd>{signed(inputs.clinicalMode === 'minor' ? run.actual.delta.clinical.actions : run.actual.delta.clinical.sustainedAt12Months)}</dd></div><div><dt>Medication cost offset · excluded from clinic surplus</dt><dd>{money(run.actual.delta.drugSavings)}</dd></div></dl>
            <FinancialResultsTable run={run} />
          </> : <p className="sim-incomplete-result">Patient outcomes appear as the simulation progresses. The calculator provides the expected cohort results and the same applied assumptions at any time.</p>}
          <p className="sim-footnote">The annual financial result uses the modeled budget year. {inputs.clinicalMode === 'minor' ? 'MINOR contributes a 45-day patient outcome; any 12-month persistence or medication savings are separate extrapolations.' : 'Twelve-month medication persistence can extend beyond that year.'} A synthetic realization is not an observed treatment effect, and changing the seed does not measure parameter uncertainty.</p>
        </section>

        <section className="sim-card sim-shared-model" aria-labelledby="sim-shared-heading">
          <div><span className="sim-eyebrow">ONE SHARED STUDY MODEL</span><h2 id="sim-shared-heading">Assumptions, evidence, and reproducibility</h2><p>Set recruitment, monitoring, medication-reduction, and financial assumptions in the calculator. Both pages use the same cohort and seed. Unknown clinical inputs stay unestimated, and scenario choices remain distinct from published evidence.</p><p>Existing RPM participants and usual physician referrals remain in the current program. Additional pharmacist recruitment is counted only when it produces an extra RPM start. Medication outcomes compare the continuing program with added pharmacist involvement.</p></div>
          <div className="sim-shared-links"><Link to="/calculator" className="sim-button">Review assumptions & exports →</Link><Link to="/integration-demo" className="sim-text-link">Explore the care workflow ↗</Link></div>
        </section>
      </div>
    </div>
  )
}

export default function RecruitmentSimulation() {
  const study = useIntegrationStudy()
  return <IntegrationPlayback key={JSON.stringify(study.inputs)} {...study} />
}
