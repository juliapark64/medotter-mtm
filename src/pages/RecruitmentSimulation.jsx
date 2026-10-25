import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { DEFAULT_RECRUITMENT_INPUTS, simulateRecruitment, summarizeRecruitment, validateRecruitmentInputs, createRecruitmentExport, verifyRecruitmentExport } from '../lib/recruitmentSimulation'
import rooms from '../assets/simulation/physician-pharmacy-rooms.png'
import patientSprite from '../assets/simulation/synthetic-patient.png'
import '../styles/recruitmentSimulation.css'

const FIELDS = [
  { key: 'N', label: 'Eligible cohort', unit: 'patients', min: 1, max: 10000, note: 'Common synthetic population for both pathways. Investigator choice.' },
  { key: 'r', label: 'Physician referral', unit: '%', note: 'Of all eligible patients. 11.8% source benchmark; annual use is assumed.' },
  { key: 'f', label: 'MTM review population', unit: '%', note: 'Of all eligible patients. 50% is an investigator assumption.' },
  { key: 'c', label: 'Review completion', unit: '%', note: 'Of the MTM review population. 84% is transferred from PQA.' },
  { key: 'o', label: 'RPM offered after review', unit: '%', note: 'Of completed reviews. 50% is an investigator assumption.' },
  { key: 'qA', label: 'Uptake after physician referral', unit: '%', note: 'First BP transmission among referrals. 53% is a transferred reference.' },
  { key: 'qB', label: 'Uptake after pharmacist offer', unit: '%', note: 'First BP transmission among offers. Equal 53% uptake is assumed.' },
  { key: 'seed', label: 'Random seed', unit: 'seed', min: 0, max: 4294967295, note: 'Same inputs and seed reproduce the exact synthetic records.' },
]
const toDraft = inputs => Object.fromEntries(FIELDS.map(({ key, unit }) => [key, String(unit === '%' ? Number((inputs[key] * 100).toPrecision(12)) : inputs[key])]))
const fromDraft = draft => Object.fromEntries(FIELDS.map(({ key, unit }) => [key, draft[key].trim() === '' ? NaN : unit === '%' ? Number((Number(draft[key]) / 100).toPrecision(12)) : Number(draft[key])]))
const initialPlayback = { cursor: 0, phase: 0, processed: 0, playing: false, inspection: null }
function playbackReducer(state, action) {
  switch (action.type) {
    case 'reset': return { ...initialPlayback }
    case 'play': return state.processed === action.N ? { ...initialPlayback, playing: true } : { ...state, inspection: null, playing: true }
    case 'pause': return { ...state, playing: false }
    case 'inspect': return { ...state, playing: false, inspection: action.index }
    case 'return': return { ...state, inspection: null }
    case 'finish': return { ...state, cursor: action.N - 1, phase: 2, processed: action.N, inspection: null, playing: false }
    case 'advance': {
      if (state.inspection !== null) return { ...state, inspection: null }
      if (state.phase < 2) {
        const phase = state.phase + 1
        return { ...state, phase, processed: phase === 2 ? Math.max(state.processed, state.cursor + 1) : state.processed, playing: phase === 2 && state.cursor === action.N - 1 ? false : state.playing }
      }
      return state.cursor < action.N - 1 ? { ...state, cursor: state.cursor + 1, phase: 0 } : { ...state, playing: false }
    }
    default: return state
  }
}
const number = value => value.toLocaleString('en-US', { maximumFractionDigits: 2 })
const signed = value => `${value > 0 ? '+' : ''}${number(value)}`
const phaseLabels = ['Enter pathway', 'Referral decision', 'RPM initiation result']

function referralDetail(patient, pharmacy) {
  if (!pharmacy) return patient.physician.referred ? 'Physician referral made' : 'No referral this year'
  const b = patient.pharmacist
  if (!b.inReviewPopulation) return 'Outside the MTM review population'
  if (!b.reviewCompleted) return 'Medication review not completed'
  return b.offered ? 'Review completed · RPM offered' : 'Review completed · RPM not offered'
}

function Room({ patient, pharmacy, phase }) {
  const result = pharmacy ? patient.pharmacist : patient.physician
  const encounter = !pharmacy || result.reviewCompleted
  const moved = phase > 0 && encounter
  return (
    <article className={`sim-room ${pharmacy ? 'sim-room-pharmacy' : ''}`}>
      <header className="sim-room-heading">
        <div><span className="sim-eyebrow">{pharmacy ? 'PATHWAY B · PHARMACY' : 'PATHWAY A · CLINIC'}</span><h2>{pharmacy ? 'Pharmacist referral' : 'Physician referral'}</h2></div>
        <span className="sim-code">{patient.id}</span>
      </header>
      <div className="sim-scene" style={{ backgroundImage: `url(${rooms})` }} aria-hidden="true">
        <div className={`sim-character ${moved ? 'sim-at-encounter' : ''}`} key={patient.id}>
          <span>{patient.id}</span><img src={patientSprite} alt="" />
        </div>
        <span className="sim-scene-caption">{phase === 0 ? 'Synthetic patient enters this pathway' : referralDetail(patient, pharmacy)}</span>
      </div>
      <div className="sim-decision-row">
        <div><span className="sim-small-label">{pharmacy ? 'Pharmacist referral / RPM offer' : 'Physician referral'}</span><strong className={phase > 0 && result.referred ? 'sim-positive' : ''}>{phase === 0 ? 'Awaiting decision' : result.referred ? 'Yes' : 'No'}</strong><small>{phase === 0 ? 'Recruitment decision not yet revealed' : referralDetail(patient, pharmacy)}</small></div>
        <div><span className="sim-small-label">RPM initiation</span><strong className={phase === 2 && result.initiated ? 'sim-positive' : ''}>{phase < 2 ? 'Pending' : result.initiated ? 'Yes · first BP sent' : 'No initiation'}</strong><small>{phase < 2 ? 'Result revealed at the next step' : result.initiated ? 'At least one BP reading transmitted' : result.referred ? 'Referred / offered, but no first transmission' : 'Referral gate not reached'}</small></div>
      </div>
    </article>
  )
}

function saveFile(filename, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function RecruitmentSimulation() {
  const [run, setRun] = useState(() => simulateRecruitment())
  const [draft, setDraft] = useState(() => toDraft(DEFAULT_RECRUITMENT_INPUTS))
  const [errors, setErrors] = useState({})
  const [playback, dispatch] = useReducer(playbackReducer, initialPlayback)
  const [speed, setSpeed] = useState('1')
  const [notice, setNotice] = useState('')
  const [inspectId, setInspectId] = useState('')
  const fileInput = useRef(null)
  const { processed, cursor, playing, inspection } = playback
  const phase = inspection === null ? playback.phase : 2
  const selectedIndex = inspection ?? cursor
  const patient = run.patients[selectedIndex]
  const complete = processed === run.inputs.N
  const progress = processed / run.inputs.N * 100
  const changed = JSON.stringify(draft) !== JSON.stringify(toDraft(run.inputs))
  const visibleSummary = useMemo(() => processed ? summarizeRecruitment(run.patients.slice(0, processed)) : null, [run, processed])
  const queueStart = Math.min(Math.max(0, selectedIndex - 3), Math.max(0, run.inputs.N - 8))

  useEffect(() => {
    if (!playing) return undefined
    const timer = setTimeout(() => dispatch({ type: 'advance', N: run.inputs.N }), 1500 / Number(speed))
    return () => clearTimeout(timer)
  }, [playing, cursor, playback.phase, speed, run.inputs.N])
  useEffect(() => {
    const pauseIfHidden = () => { if (document.hidden) dispatch({ type: 'pause' }) }
    document.addEventListener('visibilitychange', pauseIfHidden)
    return () => document.removeEventListener('visibilitychange', pauseIfHidden)
  }, [])

  const loadRun = next => {
    setRun(next)
    setDraft(toDraft(next.inputs))
    setErrors({})
    setInspectId('')
    dispatch({ type: 'reset' })
  }
  const applyInputs = event => {
    event.preventDefault()
    const inputs = fromDraft(draft)
    const validation = validateRecruitmentInputs(inputs)
    setErrors(validation)
    if (Object.keys(validation).length) { setNotice('Check the highlighted inputs. The current run has not changed.'); return }
    loadRun(simulateRecruitment(inputs))
    setNotice('New cohort generated. Play or step through the two pathways.')
  }
  const exportJson = () => {
    try {
      const bundle = createRecruitmentExport(run)
      saveFile(`rpm-recruitment-seed-${run.inputs.seed}.json`, JSON.stringify(bundle, null, 2), 'application/json')
      setNotice('JSON exported with all patient records, inputs, seed, model version, and sources.')
    } catch (error) { setNotice(`Export failed: ${error.message}`) }
  }
  const exportCsv = () => {
    createRecruitmentExport(run)
    const header = 'patient_id,physician_referred,physician_initiated,mtm_population,review_completed,rpm_offered,pharmacist_initiated,pharmacist_no_referral_reason'
    const rows = run.patients.map(p => [p.id, p.physician.referred, p.physician.initiated, p.pharmacist.inReviewPopulation, p.pharmacist.reviewCompleted, p.pharmacist.offered, p.pharmacist.initiated, p.pharmacist.reasonForNoReferral ?? ''].join(','))
    saveFile(`rpm-recruitment-seed-${run.inputs.seed}.csv`, [header, ...rows].join('\n'), 'text/csv;charset=utf-8')
    setNotice('Patient CSV exported. Keep the JSON export with it to preserve the model assumptions.')
  }
  const importJson = async event => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    dispatch({ type: 'pause' })
    try {
      if (file.size > 16 * 1024 * 1024) throw new Error('File exceeds the 16 MB limit.')
      const bundle = verifyRecruitmentExport(JSON.parse(await file.text()))
      loadRun(simulateRecruitment(bundle.inputs))
      setNotice('Verified JSON run loaded. Playback starts at the first patient with identical outcomes.')
    } catch (error) { setNotice(`Could not load this run: ${error.message}`) }
  }
  const inspectPatient = event => {
    event.preventDefault()
    const index = /^S?\d+$/i.test(inspectId.trim()) ? Number(inspectId.trim().replace(/^S/i, '')) - 1 : -1
    if (index < 0 || index >= processed) { setNotice('Enter an ID from the patients already processed, such as S0001.'); return }
    dispatch({ type: 'inspect', index })
    setNotice(`Inspecting ${run.patients[index].id}. The cohort counts are unchanged.`)
  }

  return (
    <div className="recruitment-sim">
      <div className="sim-shell">
        <header className="sim-title-row">
          <div><span className="sim-eyebrow">STUDY EXPLORER · RECRUITMENT MICROSIMULATION</span><h1>Two pathways. <span>One synthetic cohort.</span></h1><p>Follow each patient from a referral opportunity to their first transmitted blood pressure reading.</p></div>
          <Link to="/integration-demo" className="sim-text-link">Explore the care workflow ↗</Link>
        </header>
        <div className="sim-study-note"><strong>Study prototype · no collected patient data.</strong> The rooms illustrate alternative pathways for the same patient ID. Inputs combine transferred literature benchmarks and investigator assumptions. RPM initiation here means a first BP transmission, not administrative enrollment.</div>

        <section className="sim-toolbar" aria-label="Simulation playback">
          <div className="sim-control-buttons">
            <button className="sim-button sim-button-primary" onClick={() => dispatch({ type: playing ? 'pause' : 'play', N: run.inputs.N })}>{playing ? 'Ⅱ Pause' : complete ? '↻ Replay all' : '▶ Play simulation'}</button>
            <button className="sim-button" disabled={complete && inspection === null} onClick={() => { dispatch({ type: 'pause' }); dispatch({ type: 'advance', N: run.inputs.N }) }}>Next step →</button>
            <button className="sim-button" disabled={complete} onClick={() => dispatch({ type: 'finish', N: run.inputs.N })}>Finish run</button>
            <button className="sim-button sim-button-quiet" onClick={() => dispatch({ type: 'reset' })}>Rewind</button>
            <label className="sim-speed">Speed <select value={speed} onChange={event => setSpeed(event.target.value)}><option value="1">1×</option><option value="2">2×</option><option value="4">4×</option></select></label>
          </div>
          <div className="sim-progress-heading"><span><strong>{number(processed)}</strong> / {number(run.inputs.N)} patients processed</span><span>Seed <strong>{run.inputs.seed}</strong></span></div>
          <progress value={processed} max={run.inputs.N} aria-label="Patients processed">{number(progress)}%</progress>
          <p className="sim-playback-note">Playback shows model steps, not elapsed clinical time. Both pathways finish together for each patient.</p>
        </section>

        <div className="sim-workspace">
          <section className="sim-theater" aria-label="Paired patient pathways">
            <div className="sr-only" role="status" aria-live={playing ? 'off' : 'polite'} aria-atomic="true">{patient.id}. {phaseLabels[phase]}. {phase > 0 ? `Physician pathway: ${referralDetail(patient, false)}. Pharmacist pathway: ${referralDetail(patient, true)}.` : ''} {phase === 2 ? `RPM initiation: physician ${patient.physician.initiated ? 'yes' : 'no'}; pharmacist ${patient.pharmacist.initiated ? 'yes' : 'no'}.` : ''} {processed} of {run.inputs.N} patients processed.{complete ? ` Run complete. Total initiations: physician ${run.summary.physician.initiated}; pharmacist ${run.summary.pharmacist.initiated}.` : ''}</div>
            <div className="sim-step-bar"><span>{inspection !== null ? `INSPECTING ${patient.id}` : `PATIENT ${patient.id}`}</span><ol>{phaseLabels.map((label, index) => <li key={label} className={index === phase ? 'sim-active-step' : ''}><b>{index + 1}</b><span>{label}</span></li>)}</ol></div>
            {inspection !== null && <div className="sim-inspection-note">Completed patient · counts are unchanged. <button onClick={() => dispatch({ type: 'return' })}>Return to playback →</button></div>}
            <Room patient={patient} phase={phase} />
            <div className="sim-paired-divider"><span>Same ID · alternative scenario</span></div>
            <Room patient={patient} pharmacy phase={phase} />
          </section>

          <aside className="sim-cohort-panel" aria-label="Synthetic patient cohort">
            <div className="sim-panel-heading"><span className="sim-eyebrow">SYNTHETIC COHORT</span><h2>Patient register</h2><p>Track IDs through both pathways.</p></div>
            <div className="sim-register-header"><span>Patient</span><span>Physician</span><span>Pharmacist</span></div>
            <ol className="sim-register">{run.patients.slice(queueStart, queueStart + 8).map((p, offset) => {
              const index = queueStart + offset
              const done = index < processed
              return <li key={p.id}><button className={selectedIndex === index ? 'sim-selected-patient' : ''} disabled={!done} onClick={() => dispatch({ type: 'inspect', index })} aria-label={`Inspect ${p.id}${done ? `, physician ${p.physician.initiated ? 'initiated' : 'no initiation'}, pharmacist ${p.pharmacist.initiated ? 'initiated' : 'no initiation'}` : ', pending'}`}><code>{p.id}</code><span className={done && p.physician.initiated ? 'sim-register-yes' : ''}>{done ? p.physician.initiated ? 'RPM' : 'No RPM' : '—'}</span><span className={done && p.pharmacist.initiated ? 'sim-register-yes' : ''}>{done ? p.pharmacist.initiated ? 'RPM' : 'No RPM' : '—'}</span></button></li>
            })}</ol>
            <p className="sim-register-help">RPM = first BP transmitted. Select a completed ID to inspect its decisions.</p>
            <form className="sim-inspect-form" onSubmit={inspectPatient}><label htmlFor="inspect-patient">Find a completed patient</label><div><input id="inspect-patient" placeholder="e.g. S0001" value={inspectId} onChange={event => setInspectId(event.target.value)} /><button className="sim-button" disabled={!processed}>View</button></div></form>
            <div className="sim-running-counts"><span className="sim-eyebrow">{complete ? 'COMPLETE RUN' : 'RPM STARTS SO FAR'}</span><div><span>Physician pathway</span><strong>{visibleSummary?.physician.initiated ?? 0}</strong></div><div><span>Pharmacist pathway</span><strong>{visibleSummary?.pharmacist.initiated ?? 0}</strong></div><div><span>Difference (B − A)</span><strong>{signed(visibleSummary?.difference.initiated ?? 0)}</strong></div><small>{complete ? 'One synthetic realization, not an observed study effect.' : 'Only processed patients are counted. Finish the run for full-cohort results.'}</small></div>
          </aside>
        </div>

        <div role="status" className={`sim-status ${notice ? '' : 'sim-status-empty'}`}>{notice || 'Ready to explore the study model.'}</div>

        <section className="sim-results sim-card" aria-labelledby="sim-results-heading">
          <div className="sim-section-heading"><div><span className="sim-eyebrow">MODEL OUTPUTS</span><h2 id="sim-results-heading">Recruitment results</h2><p>{complete ? `Completed synthetic cohort · ${number(run.inputs.N)} eligible patients · seed ${run.inputs.seed}` : 'Full-cohort equation benchmarks are available now. Finish playback to reveal the complete simulated run.'}</p></div><div className="sim-export-buttons"><button className="sim-button" disabled={!complete} onClick={exportJson}>Export JSON run</button><button className="sim-button" disabled={!complete} onClick={exportCsv}>Patient CSV</button><button className="sim-button" onClick={() => fileInput.current?.click()}>Load JSON run</button><input ref={fileInput} type="file" accept=".json,application/json" className="sr-only" aria-label="Load exported simulation JSON" onChange={importJson} /></div></div>
          <div className="sim-table-wrap"><table><caption className="sr-only">Full-cohort simulated counts and analytic expectations for the current applied inputs</caption><thead><tr><th>Recruitment endpoint</th><th>Physician pathway A</th><th>Pharmacist pathway B</th></tr></thead><tbody>
            <tr><th>Referral / RPM offer · simulated</th><td>{complete ? number(run.summary.physician.referred) : 'Awaiting full run'}</td><td>{complete ? number(run.summary.pharmacist.offered) : 'Awaiting full run'}</td></tr>
            <tr className="sim-key-result"><th>RPM initiations · simulated</th><td>{complete ? number(run.summary.physician.initiated) : 'Awaiting full run'}</td><td>{complete ? number(run.summary.pharmacist.initiated) : 'Awaiting full run'}</td></tr>
            <tr><th>Initiations per 1,000 eligible · simulated</th><td>{complete ? number(run.summary.physician.initiatedPer1000) : '—'}</td><td>{complete ? number(run.summary.pharmacist.initiatedPer1000) : '—'}</td></tr>
            <tr><th>Expected initiations · equation</th><td>{number(run.expected.physician.initiated)}</td><td>{number(run.expected.pharmacist.initiated)}</td></tr>
            <tr><th>Equation</th><td><code>N × r × qA</code></td><td><code>N × f × c × o × qB</code></td></tr>
          </tbody></table></div>
          {complete && <div className="sim-result-detail"><strong>{signed(run.summary.difference.initiated)} RPM initiations (B − A)</strong><span>Pharmacist pathway: {number(run.summary.pharmacist.inReviewPopulation)} in the review population → {number(run.summary.pharmacist.reviewCompleted)} completed reviews → {number(run.summary.pharmacist.offered)} RPM offers → {number(run.summary.pharmacist.initiated)} first BP transmissions.</span></div>}
          <p className="sim-footnote">Integer counts vary across seeds; equation values are expected counts under the same assumptions. Seed variation is not parameter uncertainty or a confidence interval. This model does not estimate blood pressure reduction, deprescribing, costs, or savings.</p>
        </section>

        <section className="sim-card" aria-labelledby="sim-assumptions-heading">
          <div className="sim-section-heading"><div><span className="sim-eyebrow">SCENARIO DESIGN</span><h2 id="sim-assumptions-heading">Change the assumptions</h2><p>The starting values are study planning inputs, not estimates from your own patient data.</p></div><span className={`sim-draft-badge ${changed ? 'sim-draft-changed' : ''}`}>{changed ? 'Unapplied changes' : 'Applied to this run'}</span></div>
          <form onSubmit={applyInputs} noValidate><div className="sim-input-grid">{FIELDS.map(({ key, label, unit, note, min, max }) => <div className="sim-field" key={key}><label htmlFor={`sim-${key}`}>{label} <code>{key}</code></label><div className="sim-input-wrap"><input id={`sim-${key}`} type="number" min={min ?? 0} max={max ?? 100} step={unit === '%' ? 'any' : '1'} value={draft[key]} onChange={event => setDraft({ ...draft, [key]: event.target.value })} aria-invalid={Boolean(errors[key])} aria-describedby={`sim-${key}-note${errors[key] ? ` sim-${key}-error` : ''}`} /><span>{unit}</span></div><small id={`sim-${key}-note`}>{note}</small>{errors[key] && <span id={`sim-${key}-error`} className="sim-input-error">{unit === '%' ? 'Enter a percentage from 0 to 100.' : errors[key]}</span>}</div>)}</div><div className="sim-input-actions"><button className="sim-button sim-button-primary" type="submit">Apply inputs & restart</button><button className="sim-button" type="button" onClick={() => { loadRun(simulateRecruitment({ ...run.inputs, seed: (run.inputs.seed + 1) >>> 0 })); setNotice('New seed applied to the current run inputs. Playback has restarted.') }}>New seed, same inputs</button><button className="sim-button sim-button-quiet" type="button" onClick={() => { loadRun(simulateRecruitment()); setNotice('Study planning defaults restored.') }}>Restore defaults</button></div><p className="sim-footnote">Applying inputs restarts the cohort. Playback speed and inspection never change a patient's modeled result. New seed uses the applied inputs, not pending edits.</p></form>
        </section>

        <section className="sim-methods sim-card" aria-labelledby="sim-methods-heading"><div className="sim-section-heading"><div><span className="sim-eyebrow">EVIDENCE & INTERPRETATION</span><h2 id="sim-methods-heading">What is evidence, and what is assumed?</h2></div></div><div className="sim-evidence-grid">
          <article><span className="sim-evidence-tag">Transferred benchmark</span><h3>Physician referral · 11.8%</h3><p>The source reports a mean physician-level referral rate across October 2020–October 2022. Treating 11.8% as a patient-level annual probability in this model is an investigator assumption.</p><a href="https://www.jmir.org/2025/1/e64933/" target="_blank" rel="noreferrer">UCSD referral study ↗</a></article>
          <article><span className="sim-evidence-tag">Transferred benchmark</span><h3>MTM review completion · 84%</h3><p>The MA-PD CMR completion reference concerns a defined MTM program population. We apply it only after the assumed share entering the review population, not to every RPM-eligible patient.</p><a href="https://www.pqa.org/wp-content/uploads/2025/10/PQA-QuIRC-MTM-Report.pdf" target="_blank" rel="noreferrer">PQA report, page 4 ↗</a></article>
          <article><span className="sim-evidence-tag">Transfer + equality assumption</span><h3>First BP transmission · 53%</h3><p>The UCSD manuscript describes uptake after referral as at least one transmission. Applying it to both pathways and to this recruitment year is assumed; equal uptake is not an observed MTM finding.</p><a href="https://pages.ucsd.edu/~yfadlon/pdfs/Digital_Health.pdf" target="_blank" rel="noreferrer">UCSD manuscript, §6.2 ↗</a></article>
        </div><details><summary>Model structure and reproducibility</summary><p>Each synthetic patient has five seeded random draws: physician referral, entry to the MTM review population, review completion, RPM offer, and initiation. The initiation draw is shared across the two alternative pathways as a variance-reduction assumption. Other stage draws are independent. Each stage has one opportunity; the rooms do not impose a clinical visit schedule.</p><p>The common cohort is RPM-eligible by construction. No real patient profiles, demographics, risk heterogeneity, repeat outreach, or staffing constraints have been measured or fitted. The 50% MTM population share, 50% RPM offer rate, cohort size, and seed are investigator choices. A larger synthetic cohort does not strengthen the underlying evidence.</p><p>Export JSON preserves all inputs, patient records, model version, source notes, and expected results. Loading a JSON run verifies exact reproduction before showing it. Patient CSV is a companion table; retain its JSON for the scenario assumptions.</p><a href="https://github.com/juliapark64/medotter-mtm/blob/main/docs/recruitment-microsimulation.md" target="_blank" rel="noreferrer">Read model methods and replay instructions ↗</a></details></section>
      </div>
    </div>
  )
}
