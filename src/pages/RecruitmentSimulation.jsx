import { useEffect, useMemo, useReducer, useState } from 'react'
import { Link } from 'react-router-dom'
import { useIntegrationStudy } from '../context/IntegrationStudyContext'
import rooms from '../assets/simulation/physician-pharmacy-rooms.png'
import patientSprite from '../assets/simulation/synthetic-patient.png'
import '../styles/recruitmentSimulation.css'

const phaseLabels = ['MTM review', 'RPM offer & start', 'Monitoring', 'Medication reduction', 'Financial result']
const LAST_PHASE = phaseLabels.length - 1
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

function rpmStatus(patient) {
  if (patient.existingRpm) return 'Existing RPM continues'
  if (patient.baseline.newInitiation) return 'Starts through usual care'
  if (patient.additionalInitiation) return 'Additional start through MTM'
  return 'No RPM initiation'
}

function reviewStatus(patient) {
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

function phaseContent(patient, phase, perspective, clinicalMode) {
  const a = patient.baseline
  const b = patient.integrated
  switch (phase) {
    case 0: return {
      title: reviewStatus(patient),
      note: 'The modeled MTM review can support recruitment or medication assessment for someone already receiving RPM.',
      fields: [
        ['In the review population', yesNo(patient.pharmacist.inReviewPopulation)],
        ['Review completed', yesNo(patient.pharmacist.reviewCompleted)],
      ],
    }
    case 1: return {
      title: rpmStatus(patient),
      note: 'A new start requires a first transmitted BP reading. A referral or an offer alone does not count as initiation.',
      fields: [
        ['Pharmacist RPM offer', offerStatus(patient)],
        ['Additional RPM start', yesNo(patient.additionalInitiation)],
      ],
    }
    case 2: return {
      title: b.participating ? 'Monitoring contributes service months' : 'No RPM service in this realization',
      note: 'These are modeled service-month totals for the budget year. Playback speed does not represent a clinical calendar.',
      fields: [
        ['Current program · active months', number(a.activeMonths)],
        ['With MTM integration · active months', number(b.activeMonths)],
        ['Added service months', signed(b.activeMonths - a.activeMonths)],
        ['With MTM · reimbursement-qualified months', number(b.qualifiedMonths)],
      ],
    }
    case 3: return {
      title: clinicalMode === 'none' ? 'Medication benefits excluded in this scenario' : known(b.clinical.actions) ? 'Medication reductions under the applied assumptions' : 'Medication reduction is not yet estimated',
      note: clinicalMode === 'none'
        ? 'This conservative scenario explicitly sets medication reductions and drug savings to zero in both programs. This is a modeling assumption, not a finding about deprescribing effectiveness.'
        : known(b.clinical.actions)
        ? 'Synthetic medication events use the applied scenario assumptions. Persistence is assessed 12 months after reduction and can extend beyond the first-year budget.'
        : 'The clinical inputs are unspecified. This patient is not assigned an invented reduction or an observed clinical benefit.',
      fields: [
        ['With MTM · active at the modeled assessment', yesNo(b.activeAtAssessment)],
        ['Current program · medication reductions', number(a.clinical.actions)],
        ['With MTM · medication reductions', number(b.clinical.actions)],
        ['With MTM · maintained 12 months after reduction', number(b.clinical.sustainedAt12Months)],
        ['With MTM · reduced-medication months in budget year', number(b.clinical.medicationMonths)],
      ],
    }
    default: return {
      title: 'This patient’s incremental financial contribution',
      note: `With MTM integration minus the current program. These patient-level amounts exclude fixed cohort costs. ${perspective === 'clinic' ? 'Medication savings are shown separately and are not retained as clinic revenue.' : 'Net benefit includes retained medication savings when they are estimable.'}`,
      fields: [
        ['Additional program cost', money(b.programCost - a.programCost)],
        ['Additional external revenue', money(b.revenue - a.revenue)],
        ['Medication cost offset · before retained share', money(difference(b.drugSavings, a.drugSavings))],
        ['Operating contribution · before medication savings', money(b.operatingMargin - a.operatingMargin)],
        ['Net financial contribution', money(difference(b.netFinancialBenefit, a.netFinancialBenefit))],
      ],
    }
  }
}

function UsualCareContext({ patient }) {
  return (
    <section className="sim-usual-care" aria-label="Current-program context for the selected patient">
      <div className="sim-context-scene" style={{ backgroundImage: `url(${rooms})` }} aria-hidden="true">
        <img src={patientSprite} alt="" /><span>{patient.id}</span>
      </div>
      <div className="sim-context-copy">
        <span className="sim-eyebrow">CURRENT PROGRAM · CONTINUES WITH INTEGRATION</span>
        <h2>Physician referral remains part of usual care</h2>
        <dl>
          <div><dt>RPM at baseline</dt><dd>{yesNo(patient.existingRpm)}</dd></div>
          <div><dt>Usual physician referral</dt><dd>{yesNo(patient.physician.referred)}</dd></div>
          <div><dt>RPM under current care</dt><dd>{yesNo(patient.baseline.participating)}</dd></div>
        </dl>
      </div>
    </section>
  )
}

function IntegrationJourney({ patient, phase, perspective, clinicalMode }) {
  const content = phaseContent(patient, phase, perspective, clinicalMode)
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
        <span className="sim-scene-caption">{phaseLabels[phase]} · {phase === 0 ? reviewStatus(patient) : phase === 1 ? rpmStatus(patient) : phase === 2 ? `${number(patient.integrated.activeMonths)} active service months` : phase === 3 ? 'Scenario-based medication assessment' : 'Incremental financial result'}</span>
      </div>
      <section className="sim-phase-content" aria-labelledby="sim-phase-title">
        <span className="sim-eyebrow">STEP {phase + 1} OF {phaseLabels.length}</span>
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
  const selectedContent = phaseContent(patient, phase, inputs.perspective, inputs.clinicalMode)

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
          <div><span className="sim-eyebrow">STUDY EXPLORER · PATIENT-LEVEL MICROSIMULATION</span><h1>Pharmacist integration <span>in action.</span></h1><p>Follow the added MTM work from recruitment and monitoring to medication reductions and its financial contribution.</p></div>
          <Link to="/calculator" className="sim-text-link">Shared assumptions & calculator ↗</Link>
        </header>
        <div className="sim-study-note"><strong>Synthetic study model · no collected patient data.</strong> The current program continues. Each record compares current care with adding pharmacist involvement; the rooms illustrate one integrated workflow. Clinical and financial results depend on the shared assumptions.<span className="sim-applied-context">Applied perspective: {inputs.perspective === 'clinic' ? 'clinic' : 'consolidated integrated system'} · Deprescribing: {inputs.clinicalMode === 'none' ? 'zero clinical effects assumed' : inputs.clinicalMode === 'unestimated' ? 'not estimated' : 'illustrative assumptions'}</span></div>

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
            <div className="sr-only" role="status" aria-live={playing ? 'off' : 'polite'} aria-atomic="true">{patient.id}. {phaseLabels[phase]}. {selectedContent.title}. {selectedContent.fields.map(([label, value]) => `${label}: ${value}.`).join(' ')} {processed} of {inputs.N} patients processed.{complete ? ` Run complete. Additional RPM starts: ${run.actual.delta.newInitiations}.` : ''}</div>
            <div className="sim-step-bar sim-journey-steps"><span>{inspection !== null ? `INSPECTING ${patient.id}` : `PATIENT ${patient.id}`}</span><ol>{phaseLabels.map((label, index) => <li key={label} className={index === phase ? 'sim-active-step' : ''} aria-current={index === phase ? 'step' : undefined}><b>{index + 1}</b><span>{label}</span></li>)}</ol></div>
            {inspection !== null && <div className="sim-inspection-note">Completed patient · counts are unchanged. <button type="button" onClick={() => dispatch({ type: 'return' })}>Return to playback →</button></div>}
            <UsualCareContext patient={patient} />
            <IntegrationJourney patient={patient} phase={phase} perspective={inputs.perspective} clinicalMode={inputs.clinicalMode} />
            {inspection !== null && <section className="sim-inspection-summary" aria-label="Completed patient journey"><h3>Journey for {patient.id}</h3><dl><div><dt>Review</dt><dd>{reviewStatus(patient)}</dd></div><div><dt>RPM</dt><dd>{rpmStatus(patient)}</dd></div><div><dt>Monitoring</dt><dd>{number(patient.integrated.activeMonths)} active service months with integration</dd></div><div><dt>Medication reductions</dt><dd>{number(patient.baseline.clinical.actions)} current program → {number(patient.integrated.clinical.actions)} with integration</dd></div></dl></section>}
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
            <div className="sim-running-counts"><span className="sim-eyebrow">{complete ? 'COMPLETE RUN · INCREMENTAL COUNTS' : 'PROCESSED PATIENTS ONLY'}</span><div><span>Additional RPM starts</span><strong>{number(visibleSummary.addedStarts)}</strong></div><div><span>Additional service months</span><strong>{signed(visibleSummary.addedMonths)}</strong></div><div><span>Additional medication reductions</span><strong className={!known(visibleSummary.addedReductions) ? 'sim-not-estimated' : ''}>{processed ? signed(visibleSummary.addedReductions) : '—'}</strong></div><small>{complete ? 'One synthetic realization. Additional outcomes are relative to the continuing current program.' : 'These are partial counts, not full-cohort annual rates. Financial totals include fixed costs only in the completed run.'}</small></div>
          </aside>
        </div>

        <div role="status" className={`sim-status ${notice ? '' : 'sim-status-empty'}`}>{notice || 'The calculator and this simulation share the same applied inputs and synthetic cohort.'}</div>

        <section className="sim-card sim-integration-results" aria-labelledby="sim-results-heading">
          <div className="sim-section-heading"><div><span className="sim-eyebrow">ADDED VALUE OF PHARMACIST INTEGRATION</span><h2 id="sim-results-heading">The full-cohort result</h2><p>{complete ? `${number(inputs.N)} eligible members · one synthetic realization · seed ${inputs.seed}` : 'Finish the run to reveal the complete synthetic result, including fixed program costs.'}</p></div><Link to="/calculator" className="sim-button sim-button-primary">Open financial calculator →</Link></div>
          {complete ? <>
            <div className="sim-financial-result"><span>Incremental annual net financial benefit per 1,000 eligible members</span><strong>{money(run.actual.delta.netBenefitPer1000)}</strong><p>{known(run.actual.delta.netFinancialBenefit) ? `Cohort total: ${money(run.actual.delta.netFinancialBenefit)} for ${number(inputs.N)} eligible members. Positive means additional modeled benefit; negative means additional net spending.` : 'Clinical inputs remain unspecified. Program costs and operating margin are still available in the calculator.'}</p></div>
            <dl className="sim-outcome-summary"><div><dt>Additional RPM starts</dt><dd>{number(run.actual.delta.newInitiations)}</dd></div><div><dt>Additional service months</dt><dd>{signed(run.actual.delta.activeMonths)}</dd></div><div><dt>Additional reductions maintained 12 months after reduction</dt><dd>{signed(run.actual.delta.clinical.sustainedAt12Months)}</dd></div><div><dt>Incremental operating margin · before medication savings</dt><dd>{money(run.actual.delta.operatingMargin)}</dd></div></dl>
          </> : <p className="sim-incomplete-result">Patient outcomes appear as the simulation progresses. The calculator provides the expected cohort results and the same applied assumptions at any time.</p>}
          <p className="sim-footnote">The annual financial result uses the modeled budget year. Twelve-month medication persistence can extend beyond that year. A synthetic realization is not an observed treatment effect, and changing the seed does not measure parameter uncertainty.</p>
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
