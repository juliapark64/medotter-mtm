import { useEffect, useMemo, useReducer, useState } from 'react'
import { Link } from 'react-router-dom'
import { useIntegrationStudy } from '../context/IntegrationStudyContext'
import StudySensitivity from '../components/StudySensitivity'
import { FINANCIAL_EVIDENCE, getIntegrationScenarios, getRpmPaymentSchedule } from '../lib/integrationStudy'
import { STUDY_COST_LABELS, STUDY_HOUR_ROWS, ClinicPathwaySummary, RecurringStaffingSummary, PairedPaymentSummary, PatientTaskLedger, PolicyContext, armLabels, hasCoveredPhysicianOversight, marginLabel } from '../components/StudyStaffing'
import '../styles/integrationStudy.css'
import rooms from '../assets/simulation/physician-pharmacy-rooms.png'
import patientSprite from '../assets/simulation/synthetic-patient.png'
import '../styles/recruitmentSimulation.css'

const phaseLabels = inputs => [inputs.comparisonMode === 'delivery' ? 'Shared patient' : 'Recruitment', 'Onboarding', 'RPM delivery', 'Deprescribing', 'Separate budgets']
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
const money = value => known(value) ? value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }) : 'Not estimated'
const yesNo = value => value ? 'Yes' : 'No'
const percent = value => known(value) ? `${number(value * 100)}%` : 'Not estimated'

function patientStatus(patient, inputs) {
  if (inputs.comparisonMode === 'delivery') return patient.existingRpm ? 'Existing · both programs' : 'New start · both programs'
  return patient.additionalInitiation ? 'Added recruitment start' : patient.baseline.participating ? 'Usual-program RPM' : 'No RPM start'
}

function phaseContent(patient, arm, phase, inputs) {
  const row = patient[arm]
  const direct = inputs.comparisonMode === 'delivery'
  const pharmacy = arm === 'integrated'
  const schedule = getRpmPaymentSchedule(inputs, arm)
  const labels = armLabels(inputs)
  if (phase === 0) return { title: direct ? 'One patient, evaluated in both programs' : 'Recruitment pathway', note: direct ? 'No referral rate changes whether this patient enters the common cohort. Both programs reuse the same service-calendar and qualification draws.' : 'This secondary scenario allows pharmacist recruitment to change participation; it is separate from the matched delivery analysis.', fields: [['Identifier', patient.id], ['Already receiving RPM', yesNo(patient.existingRpm)], ['Participates in this program', yesNo(row.participating)], ...(direct ? [['Common start month', patient.existingRpm ? '1' : String(inputs.startMonth)]] : [['Physician referral', yesNo(patient.physician.referred)], ['Pharmacist offer', yesNo(patient.pharmacist.offered)]])] }
  if (phase === 1) return { title: row.newInitiation ? 'One new episode, one onboarding' : row.participating ? 'Existing participant: no repeat setup' : 'No onboarding in this program', note: 'Each program uses only its own staff onboarding tasks. Device/vendor charges occur once per unique new start. Staff labor is separate from the assumed vendor package.', fields: [['New RPM start', yesNo(row.newInitiation)], ['Staff onboarding cost', money((row.costBreakdown.onboarding || 0) + (row.costBreakdown.supportOnboarding || 0) + (row.costBreakdown.nurseOnboarding || 0) + (row.costBreakdown.assistantOnboarding || 0))], ['Vendor/device cost', money(row.costBreakdown.devices)], ['Qualifying setup', yesNo(row.qualifiedSetups)]] }
  if (phase === 2) return { title: pharmacy && (direct || inputs.staffingMode === 'integrated-team') ? 'Pharmacist team delivers the RPM service' : 'Physician-led team delivers the RPM service', note: pharmacy && (direct || inputs.staffingMode === 'integrated-team') ? hasCoveredPhysicianOversight(inputs) ? 'Existing clinic resources are assumed to cover physician supervision. Its time remains in this patient’s workload, with $0 additional budget charge. The physician-led delivery budget is absent. Oversight still occurs and does not add billable management minutes.' : 'The physician-led clinical-delivery, nurse and assistant budgets are absent. Only the pharmacist team’s tasks and separate physician supervision are charged. Supervision does not add billable management minutes.' : 'The physician program pays for the specified physician, nurse and medical-assistant tasks. No pharmacist or technician service cost is assigned to this arm.', fields: [['Active patient-months', number(row.activeMonths)], ['Qualifying recurring months', number(row.qualifiedMonths)], ['Clinical minutes / active month', number(schedule.qualifyingClinicalMinutes)], ...STUDY_HOUR_ROWS.map(([key, label]) => [label, number(row[key])])] }
  if (phase === 3) return { title: inputs.clinicalMode === 'unestimated' ? 'Clinical advantage not assumed' : inputs.clinicalMode === 'none' ? 'Explicit zero-clinical-effect scenario' : 'Separate medication-review scenario', note: inputs.clinicalMode === 'minor' ? 'MINOR transfers 45-day patient-level proportions: 11/161 usual review and 31/161 after completed pharmacist review. Both trial arms had monitoring. Annual medicine savings are not established by these results.' : 'Synthetic outcomes follow the selected clinical assumptions. Medication offsets do not enter clinic RPM collections. No clinical equivalence or superiority is established by this financial model.', fields: [['Completed additional pharmacist review', pharmacy ? yesNo(row.reviews ?? patient.pharmacist.reviewCompleted) : 'No added pharmacist review'], ['Patients with modeled deprescribing', number(row.clinical.actions)], ['Medication cost offset · outside clinic margin', money(row.drugSavings)]] }
  return { title: `${labels[pharmacy ? 1 : 0]}: this patient’s budget`, note: 'Collections minus this program’s own variable costs. Fixed program overhead appears once in the full-cohort result, not in every patient record. Staff cost differences value resources and do not automatically reduce cash payroll.', fields: [['Recurring collections', money(row.monthlyRevenue)], ['Setup collections', money(row.setupRevenue)], ['Total collections', money(row.revenue)], ['Own variable program costs', money(row.programCost)], [`${marginLabel(inputs, arm)} before fixed costs`, money(row.operatingMargin)]] }
}

function PatientProgram({ patient, arm, phase, inputs }) {
  const pharmacy = arm === 'integrated'
  const content = phaseContent(patient, arm, phase, inputs)
  const label = armLabels(inputs)[pharmacy ? 1 : 0]
  return <article className={`sim-room ${pharmacy ? 'sim-room-pharmacy' : ''}`}>
    <header className="sim-room-heading"><div><span className="sim-eyebrow">{pharmacy ? 'PROGRAM B · OWN BUDGET' : 'PROGRAM A · OWN BUDGET'}</span><h2>{label}</h2></div><span className="sim-code">{patient.id}</span></header>
    <div className="sim-scene" style={{ backgroundImage: `url(${rooms})` }} aria-hidden="true"><div key={`${patient.id}-${arm}`} className={`sim-character ${phase > 0 ? 'sim-at-encounter' : ''}`}><span>{patient.id}</span><img src={patientSprite} alt="" /></div><span className="sim-scene-caption">{phaseLabels(inputs)[phase]} · {patientStatus(patient, inputs)}</span></div>
    <section className="sim-phase-content" aria-label={`${label}: ${phaseLabels(inputs)[phase]}`}><h3>{content.title}</h3><p>{content.note}</p>{phase === 3 && inputs.clinicalMode === 'minor' && <p><a className="sim-text-link" href="https://www.sciencedirect.com/science/article/pii/S0149291823002035" target="_blank" rel="noreferrer">MINOR trial and its limits ↗</a></p>}<dl className="sim-phase-fields">{content.fields.map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl></section>
  </article>
}

function FinancialResultsTable({ run, inputs }) {
  const labels = armLabels(inputs)
  const rows = [...STUDY_HOUR_ROWS.map(([key, label]) => [key, label, number]), ['activeMonths', 'Active patient-months', number], ['qualifiedMonths', 'Qualifying recurring months', number], ['monthlyRevenue', 'Recurring RPM collections', money], ['setupRevenue', 'One-time setup collections', money], ['revenue', 'Total RPM collections', money], ['programCost', 'Own program costs, including overhead', money], ['operatingMargin', 'Operating margin under selected cost allocation', money]]
  return <div className="sim-results sim-receipt-results"><h3>Two complete program budgets</h3><div className="sim-table-wrap"><table><caption className="sr-only">Full-cohort financial results for both programs</caption><thead><tr><th scope="col">Measure</th>{labels.map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{rows.map(([key, label, format]) => <tr key={key}><th scope="row">{label}</th>{['baseline', 'integrated'].map(arm => <td key={arm}>{format(run.actual[arm][key])}</td>)}</tr>)}</tbody></table></div>
    <details className="sim-cost-details"><summary>Inspect each program’s separate spending</summary><div className="sim-table-wrap"><table><thead><tr><th scope="col">Cost</th>{labels.map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{STUDY_COST_LABELS.map(([key, label]) => <tr key={key}><th scope="row">{label}</th>{['baseline', 'integrated'].map(arm => <td key={arm}>{money(run.actual[arm].costBreakdown[key])}</td>)}</tr>)}</tbody></table></div></details>
  </div>
}

function IntegrationPlayback({ inputs, run, applyInputs, setNotice, notice, sensitivityConfig, setSensitivityConfig }) {
  const [playback, dispatch] = useReducer(playbackReducer, initialPlayback)
  const [speed, setSpeed] = useState('1')
  const [inspectId, setInspectId] = useState('')
  const { processed, cursor, playing, inspection } = playback
  const phase = inspection === null ? playback.phase : LAST_PHASE
  const selectedIndex = inspection ?? cursor
  const patient = run.patients[selectedIndex]
  const complete = processed === inputs.N
  const direct = inputs.comparisonMode === 'delivery'
  const labels = armLabels(inputs)
  const phases = phaseLabels(inputs)
  const queueStart = Math.min(Math.max(0, selectedIndex - 3), Math.max(0, inputs.N - 8))
  const scenarios = useMemo(() => getIntegrationScenarios(inputs), [inputs])
  const visibleSummary = useMemo(() => run.patients.slice(0, processed).reduce((sum, p) => ({ participantsA: sum.participantsA + Number(p.baseline.participating), participantsB: sum.participantsB + Number(p.integrated.participating), monthsA: sum.monthsA + p.baseline.activeMonths, monthsB: sum.monthsB + p.integrated.activeMonths }), { participantsA: 0, participantsB: 0, monthsA: 0, monthsB: 0 }), [run, processed])
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
    if (index < 0 || index >= processed) { setNotice('Enter a processed patient ID, such as S0001.'); return }
    dispatch({ type: 'inspect', index }); setNotice(`Inspecting ${run.patients[index].id}; cohort totals are unchanged.`)
  }
  const newSeed = () => { applyInputs({ ...inputs, seed: (inputs.seed + 1) >>> 0 }); setNotice('New paired cohort generated with the next seed. Both pages share this run.') }
  return <div className="recruitment-sim"><div className="sim-shell">
    <header className="sim-title-row"><div><span className="sim-eyebrow">PATIENT-LEVEL MICROSIMULATION · PAIRED PROGRAMS</span><h1>One patient.<br /><span>Two ways to deliver RPM.</span></h1><p>Watch the same synthetic person receive physician-led and pharmacist-led care, with separate task records and budgets.</p></div><Link to="/calculator" className="sim-text-link">Shared calculator & assumptions ↗</Link></header>
    <div className="sim-study-note"><strong>Synthetic model · no collected patient data.</strong> {direct ? 'The primary comparison holds the cohort, service calendar and qualification draws constant. Pharmacist-delivered care replaces physician-led delivery; its budget does not inherit the original team’s labor.' : 'Secondary recruitment scenario: additional pharmacist outreach can change enrollment. Interpret it separately from the direct delivery comparison.'}<span className="sim-applied-context">{number(inputs.N)} {direct ? 'common cohort patients' : 'eligible members'} · {percent(inputs.existingRpmShare)} existing RPM · new starts in month {inputs.startMonth} · one-year budget</span><span className="sim-applied-context">Clinical outcomes: {inputs.clinicalMode} · source transfer and workload assumptions remain uncertain.</span></div>
    <ClinicPathwaySummary inputs={inputs} />
    <section className="sim-card sim-study-evidence"><label htmlFor="sim-study-scenario">Load a shared study scenario</label><select id="sim-study-scenario" value="" onChange={event => { const scenario = scenarios.find(s => s.id === event.target.value); if (scenario) { applyInputs(scenario.inputs); setNotice(`${scenario.name} applied to both pages.`) } }}><option value="" disabled>Choose a delivery or secondary scenario…</option>{scenarios.map(s => <option value={s.id} key={s.id}>{s.name}</option>)}</select><p className="sim-footnote">The primary scenario compares each program’s own financial feasibility. Nurse-supported physician delivery, 9:1 and 60:40 technician/pharmacist recurring-time allocations are sensitivity scenarios, not validated RPM staffing standards. Staffing presets preserve other applied inputs and can be combined; the combined nurse-supported + 60:40 option applies both teams at once. Onboarding and separate reviews are outside the 60:40 split.</p></section>
    <details className="sim-finance-assumptions"><summary>Applied staffing, billing and evidence</summary><RecurringStaffingSummary inputs={inputs} /><PairedPaymentSummary inputs={inputs} /><p className="sim-finance-assumption-note">Applied planning assumptions: {percent(inputs.qualificationShare)} qualifying active months, {percent(inputs.setupQualificationShare)} qualifying new setups and {percent(inputs.collectionShare)} collection realization. These are not empirical Medicare rates. Technology costs are {money(inputs.deviceCost)}/new start and {money(inputs.monthlyTechnologyCost)}/active month. The $90/$12 package is a business-plan assumption, not a verified vendor quote.</p><PolicyContext /><details className="sim-finance-sources"><summary>Financial sources and limits</summary><ul>{FINANCIAL_EVIDENCE.map(source => <li key={source.id}>{source.url ? <a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a> : <strong>{source.title}</strong>}<p>{source.description}</p></li>)}</ul></details></details>
    <section className="sim-toolbar" aria-label="Simulation playback"><div className="sim-control-buttons"><button className="sim-button sim-button-primary" onClick={() => dispatch({ type: playing ? 'pause' : 'play', N: inputs.N })}>{playing ? 'Ⅱ Pause' : complete ? '↻ Replay all' : '▶ Play simulation'}</button><button className="sim-button" disabled={complete && inspection === null} onClick={() => { dispatch({ type: 'pause' }); dispatch({ type: 'advance', N: inputs.N }) }}>Next step →</button><button className="sim-button" disabled={complete} onClick={() => dispatch({ type: 'finish', N: inputs.N })}>Finish run</button><button className="sim-button sim-button-quiet" onClick={() => dispatch({ type: 'reset' })}>Rewind</button><button className="sim-button sim-button-quiet" onClick={newSeed}>New seed</button><label className="sim-speed">Speed <select value={speed} onChange={event => setSpeed(event.target.value)}><option value="1">1×</option><option value="2">2×</option><option value="4">4×</option></select></label></div><div className="sim-progress-heading"><span><strong>{number(processed)}</strong> / {number(inputs.N)} paired patients processed</span><span>Seed <strong>{inputs.seed}</strong></span></div><progress value={processed} max={inputs.N} aria-label="Patients processed" /><p className="sim-playback-note">Playback shows model steps, not elapsed clinical months. Each patient enters totals once, after both financial results are shown.</p></section>
    <div className="sim-workspace"><section className="sim-theater" aria-label="Paired RPM delivery journeys">
      <div className="sr-only" role="status" aria-live={playing ? 'off' : 'polite'}>{patient.id}. {phases[phase]}. {processed} of {inputs.N} paired patients processed.</div>
      <div className="sim-step-bar sim-journey-steps"><span>{inspection !== null ? 'INSPECTING' : 'PATIENT'} {patient.id}</span><ol>{phases.map((label, index) => <li key={label} className={index === phase ? 'sim-active-step' : ''} aria-current={index === phase ? 'step' : undefined}><b>{index + 1}</b><span>{label}</span></li>)}</ol></div>
      {inspection !== null && <div className="sim-inspection-note">Completed patient; no duplicate counting. <button onClick={() => dispatch({ type: 'return' })}>Return to playback →</button></div>}
      <PatientProgram patient={patient} arm="baseline" phase={phase} inputs={inputs} />
      <div className="sim-paired-divider">SAME PATIENT ID · SEPARATE PROGRAM BUDGET</div>
      <PatientProgram patient={patient} arm="integrated" phase={phase} inputs={inputs} />
      {(phase === LAST_PHASE || inspection !== null) && <PatientTaskLedger patient={patient} inputs={inputs} />}
    </section><aside className="sim-cohort-panel" aria-label="Synthetic cohort register"><div className="sim-panel-heading"><span className="sim-eyebrow">SYNTHETIC COHORT</span><h2>Patient register</h2><p>Each ID follows both delivery programs.</p></div><div className="sim-register-header sim-integration-register"><span>Patient</span><span>Service pathway</span></div><ol className="sim-register sim-integration-register-list">{run.patients.slice(queueStart, queueStart + 8).map((p, offset) => { const index = queueStart + offset; const done = index < processed; return <li key={p.id}><button className={selectedIndex === index ? 'sim-selected-patient' : ''} disabled={!done} onClick={() => dispatch({ type: 'inspect', index })} aria-label={`Inspect ${p.id}${done ? '' : ', pending'}`}><code>{p.id}</code><span>{done ? patientStatus(p, inputs) : 'Pending'}</span></button></li> })}</ol><p className="sim-register-help">Select a completed ID to inspect its two task ledgers. Inspection does not add another patient.</p><form className="sim-inspect-form" onSubmit={inspectPatient}><label htmlFor="inspect-patient">Find a completed patient</label><div><input id="inspect-patient" placeholder="e.g. S0001" value={inspectId} onChange={event => setInspectId(event.target.value)} /><button className="sim-button" disabled={!processed}>View</button></div></form><div className="sim-running-counts"><span className="sim-eyebrow">{complete ? 'COMPLETE PAIRED COHORT' : 'PROCESSED PATIENTS ONLY'}</span><div><span>Program A participants</span><strong>{number(visibleSummary.participantsA)}</strong></div><div><span>Program B participants</span><strong>{number(visibleSummary.participantsB)}</strong></div><div><span>Active months · A / B</span><strong>{number(visibleSummary.monthsA)} / {number(visibleSummary.monthsB)}</strong></div><small>{direct ? 'Matched participation and service calendars isolate delivery costs.' : 'This secondary recruitment scenario can change participation.'} Fixed costs enter the complete cohort budget once.</small></div></aside></div>
    <div role="status" className={`sim-status ${notice ? '' : 'sim-status-empty'}`}>{notice || 'Both pages share the same applied inputs and paired synthetic cohort.'}</div>
    <section className="sim-card sim-integration-results" aria-labelledby="sim-results-heading"><div className="sim-section-heading"><div><span className="sim-eyebrow">FINANCIAL FEASIBILITY · EACH COMPLETE PROGRAM</span><h2 id="sim-results-heading">Full-cohort results</h2><p>{complete ? `${number(inputs.N)} synthetic patients · seed ${inputs.seed}` : 'Finish the run to reveal complete budgets, including overhead.'}</p></div><Link to="/calculator" className="sim-button sim-button-primary">Open calculator →</Link></div>
      {complete ? <><div className="sim-paired-finances">{['baseline', 'integrated'].map((arm, index) => <div key={arm} className="sim-financial-result"><span>{labels[index]} · {marginLabel(inputs, arm)}</span><strong>{money(run.actual[arm].operatingMargin)}</strong><p>{money(run.actual[arm].revenue)} collections − {money(run.actual[arm].programCost)} program costs.{arm === 'integrated' && hasCoveredPhysicianOversight(inputs) && ' Additional supervision cost is excluded under the existing-resources assumption.'}</p></div>)}</div><FinancialResultsTable run={run} inputs={inputs} /><div className="sim-switch-summary"><h3>Secondary: financial impact of switching</h3><p>Margin difference under selected cost allocation: <strong>{money(run.actual.delta.operatingMargin)}</strong>. Physician hours released: <strong>{number(run.actual.baseline.physicianHours - run.actual.integrated.physicianHours)}</strong>. Released salaried time is capacity, not automatic cash savings; no new-visit revenue is assigned.</p></div><dl className="sim-outcome-summary">{['baseline', 'integrated'].map((arm, index) => <div key={arm}><dt>{labels[index]} · {inputs.clinicalMode === 'minor' ? '45-day deprescribing outcomes' : 'modeled medication reductions'}</dt><dd>{number(run.actual[arm].clinical.actions)}</dd></div>)}</dl></> : <p className="sim-incomplete-result">The calculator provides analytic expectations at any time. This playback reveals one seeded realization as patients are processed.</p>}
      <p className="sim-footnote">The model covers one budget year. The existing-resources supervision scenario excludes its additional budget charge while retaining oversight hours; existing staff still use resources and can have opportunity cost. Medication offsets are excluded from clinic margin. MINOR’s 45-day endpoint does not establish annual drug savings. Changing the seed illustrates random simulation variation, not clinical evidence or parameter uncertainty.</p>
    </section>
    <details className="sim-card sim-sensitivity-panel"><summary>Sensitivity &amp; break-even · analytic expected values</summary><p className="sim-footnote">Explore which assumptions drive the complete program budgets at any point in playback. These analyses use analytic expected values from the same applied scenario, not partial playback totals or confidence intervals from synthetic patients. The controls and applied ranges are shared with the calculator.</p><StudySensitivity inputs={inputs} config={sensitivityConfig} onConfigChange={setSensitivityConfig} onApplyInputs={next => { applyInputs(next); setNotice('Sensitivity cell applied to both pages. Playback restarts and sensitivity ranges reset for the new scenario.') }} onNotice={setNotice} /></details>
    <section className="sim-card sim-shared-model"><div><span className="sim-eyebrow">REPRODUCIBLE STUDY SCENARIO</span><h2>Inspect the assumptions behind every patient</h2><p>Both delivery arms use the same seed and source inputs. The task ledger makes transferred clinical work, support and separate supervision visible. Save JSON from the calculator to reproduce all patient-level calculations.</p></div><div className="sim-shared-links"><Link to="/calculator" className="sim-button">Inputs, citations & exports →</Link><Link to="/integration-demo" className="sim-text-link">Explore the care workflow ↗</Link></div></section>
  </div></div>
}

export default function RecruitmentSimulation() {
  const study = useIntegrationStudy()
  return <IntegrationPlayback key={JSON.stringify(study.inputs)} {...study} />
}
