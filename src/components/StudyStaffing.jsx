import { getRpmPaymentSchedule, getStaffingEvidence } from '../lib/integrationStudy'

const number = value => typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('en-US', { maximumFractionDigits: 2 }) : 'Not estimated'
const money = value => typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }) : 'Not estimated'
const roleNames = { physician: 'Physician', nurse: 'Registered nurse', medicalAssistant: 'Medical assistant', pharmacist: 'Pharmacist', technician: 'Pharmacy technician' }
export const armLabels = inputs => inputs.comparisonMode === 'delivery' ? ['Physician-delivered RPM', 'Pharmacist-delivered RPM'] : ['Usual referral program', 'Pharmacist recruitment scenario']
export const hasCoveredPhysicianOversight = inputs => inputs.physicianOversightCostMode === 'existing-resources' && (inputs.comparisonMode === 'delivery' || inputs.staffingMode === 'integrated-team')
export const marginLabel = (inputs, arm) => arm === 'integrated' && hasCoveredPhysicianOversight(inputs) ? 'Budget margin · existing oversight covered' : 'Allocated operating margin'

export const STUDY_COST_LABELS = [
  ['physicianMonitoring', 'Physician RPM clinical delivery'], ['physicianOversight', 'Separate physician supervision for pharmacist delivery'],
  ['nurseMonitoring', 'Nurse monitoring / follow-up'], ['assistantMonitoring', 'Medical-assistant coordination'],
  ['pharmacistMonitoring', 'Pharmacist RPM clinical delivery'], ['technicalSupport', 'Pharmacy-technician RPM support'],
  ['nurseOnboarding', 'Nurse onboarding'], ['assistantOnboarding', 'Medical-assistant onboarding'],
  ['onboarding', 'Pharmacist onboarding'], ['supportOnboarding', 'Pharmacy-technician onboarding'],
  ['physicianReferrals', 'Physician referral work · secondary recruitment analysis'],
  ['reviews', 'Additional medication review / intake'], ['offers', 'Pharmacist recruitment · secondary analysis'],
  ['supportOffers', 'Technician recruitment · secondary analysis'],
  ['devices', 'Vendor/device package · across new starts'], ['software', 'RPM technology bundle · across active months'],
  ['connectivity', 'Additional connectivity'], ['platformBase', 'Platform subscription'],
  ['otherFixed', 'Program overhead'], ['addedFixed', 'Pharmacist delivery transition / additional overhead'],
]
export const STUDY_HOUR_ROWS = [
  ['physicianHours', 'Physician hours, all tasks'], ['nurseHours', 'Nurse hours, all tasks'],
  ['assistantHours', 'Medical-assistant hours, all tasks'], ['pharmacistHours', 'Pharmacist hours, all tasks'],
  ['technicianHours', 'Pharmacy-technician hours, all tasks'],
]

export function recurringStaffing(inputs, integrated = false) {
  const team = integrated && (inputs.comparisonMode === 'delivery' || inputs.staffingMode === 'integrated-team')
  return [
    { role: 'Physician RPM delivery', minutes: team ? 0 : inputs.monitorPhysicianMinutes, wage: inputs.physicianWage },
    { role: 'Separate physician supervision', minutes: team ? inputs.physicianOversightMinutes : 0, wage: inputs.physicianWage, covered: team && hasCoveredPhysicianOversight(inputs) },
    { role: 'Registered nurse', minutes: team ? 0 : inputs.monitorNurseMinutes, wage: inputs.nurseWage },
    { role: 'Medical assistant', minutes: team ? 0 : inputs.monitorAssistantMinutes, wage: inputs.assistantWage },
    { role: 'Pharmacist', minutes: team ? inputs.monitorPharmacistMinutes : 0, wage: inputs.pharmacistWage },
    { role: 'Pharmacy technician', minutes: team ? inputs.monitorSupportMinutes : 0, wage: inputs.supportWage },
  ]
}

function StaffingWorkload({ inputs, integrated = false }) {
  const colors = ['#4163ba', '#8e6aa7', '#338f91', '#ae7931', '#286caa', '#739b31']
  const rows = recurringStaffing(inputs, integrated).map((row, i) => ({ ...row, color: colors[i] }))
    .filter(row => row.role !== 'Separate physician supervision' && row.minutes > 0)
  const totalMinutes = rows.reduce((sum, row) => sum + row.minutes, 0)
  return <div className="study-workload">
    <p><strong>{number(totalMinutes)} paid service minutes</strong> / active patient-month</p>
    <div className="study-workload-bar" aria-hidden="true">{rows.map(row => <span key={row.role} style={{ width: `${row.minutes / totalMinutes * 100}%`, backgroundColor: row.color }} />)}</div>
    <ul className="study-workload-legend">{rows.map(row => <li key={row.role}><span className="study-workload-key" style={{ backgroundColor: row.color }} aria-hidden="true" />{row.role}: <strong>{number(row.minutes)} min</strong></li>)}</ul>
    <p className="study-workload-limit">Recurring service time only; onboarding, separate reviews and physician supervision are outside this mix.</p>
  </div>
}

export function ClinicPathwaySummary({ inputs }) {
  const direct = inputs.comparisonMode === 'delivery'
  const labels = armLabels(inputs)
  const staffingEvidence = getStaffingEvidence(inputs)
  return <section className="study-pathway-summary" aria-label="Who delivers care in each pathway">
    <div><span className="study-eyebrow">PROGRAM A · OWN STAFFING BUDGET</span><h3>{labels[0]}</h3><p>Physician clinical delivery with the specified nurse and medical-assistant support. No pharmacist or pharmacy-technician labor is assigned to this program.</p><StaffingWorkload inputs={inputs} /></div>
    <div><span className="study-eyebrow">PROGRAM B · OWN STAFFING BUDGET</span><h3>{labels[1]}</h3><p>{direct || inputs.staffingMode === 'integrated-team' ? 'Pharmacist clinical delivery with technician support replaces the physician-led delivery team. Physician supervision is a separate editable resource; the original physician, nurse and assistant service budget is not carried over.' : 'Secondary recruitment analysis: the usual clinic team continues while pharmacist recruitment and medication review are added.'}</p><StaffingWorkload inputs={inputs} integrated /></div>
    <p className="study-pathway-note">{direct ? 'Both programs serve the same patients on the same service calendar. Different enrollment is excluded from the primary comparison. Deprescribing is an optional secondary outcome.' : 'This is a separate recruitment question and may change enrollment as well as spending.'} Task durations and transfers to this RPM setting remain assumptions unless a source observation is explicitly identified. Published wages do not validate the workload.</p>
    {staffingEvidence.length > 0 && <aside className="study-staffing-evidence" aria-label="Applied staffing sensitivity evidence"><span className="study-eyebrow">APPLIED STAFFING SENSITIVITIES · SOURCE LIMITS</span>{staffingEvidence.map(evidence => <div key={evidence.id}><h4>{evidence.title}</h4><p>{evidence.description}</p>{evidence.sourceUrls.length > 0 && <p className="study-staffing-citations">{evidence.sourceUrls.map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer">Source {index + 1} ↗</a>)}</p>}</div>)}</aside>}
    {hasCoveredPhysicianOversight(inputs) && <p className="study-pathway-note"><strong>$0 additional physician supervision cost · assumption.</strong> Existing clinic resources cover oversight. The entered physician supervision time remains in the workload, but no additional supervision charge is allocated to the pharmacist program. Required oversight continues and existing resources can have opportunity cost. This budget sensitivity is not a fully allocated economic-cost comparison or an observed saving; no other overhead is reduced and no extra visit revenue is added.</p>}
  </section>
}

export function PolicyContext() {
  return <div className="study-explanation"><strong>Policy scenario · proposal as of October 26, 2026</strong>CMS proposes requiring RPM clinical staff to be employed by the billing practice from January 1, 2027, if finalized. This is not a finalized blanket vendor ban. Both modeled teams are clinic-employed; technology, devices and connectivity may still be purchased from vendors. The pharmacist program retains an eligible billing practitioner and required supervision. Payment calculations use 2026 benchmarks, not finalized 2027 rates. <a href="https://www.cms.gov/newsroom/fact-sheets/calendar-year-cy-2027-medicare-physician-fee-schedule-proposed-rule" target="_blank" rel="noreferrer">CMS proposal ↗</a> · <a href="https://www.cms.gov/files/document/mln901705-telehealth-remote-monitoring.pdf" target="_blank" rel="noreferrer">Current billing guidance ↗</a></div>
}

export function RecurringStaffingSummary({ inputs }) {
  const baseline = recurringStaffing(inputs)
  const integrated = recurringStaffing(inputs, true)
  const labels = armLabels(inputs)
  const total = rows => rows.reduce((sum, row) => sum + (row.covered ? 0 : row.minutes * row.wage / 60), 0)
  return <div className="study-team-summary"><p className="study-eyebrow">Separate staffing budgets · per active patient-month</p>
    <div className="study-table-wrap"><table className="study-table"><thead><tr><th scope="col">Task / professional</th><th scope="col">{labels[0]}</th><th scope="col">{labels[1]}</th><th scope="col">Hourly employer cost</th></tr></thead><tbody>
      {baseline.map((row, i) => <tr key={row.role}><th scope="row">{row.role}</th><td>{number(row.minutes)} min</td><td>{number(integrated[i].minutes)} min{integrated[i].covered && <small><br />Existing resources · $0 additional charge</small>}</td><td>{money(row.wage)}</td></tr>)}
      <tr><th scope="row">Recurring labor charged to program</th><td>{money(total(baseline))}</td><td>{money(total(integrated))}</td><td>Minutes × wage ÷ 60; covered oversight excluded</td></tr>
    </tbody></table></div>
    <p>{hasCoveredPhysicianOversight(inputs) ? 'The existing-resources assumption excludes only the additional supervision charge. Supervision minutes and the physician wage remain unchanged; this does not mean no oversight or no resource use.' : 'Supervision is costed separately.'} Supervision is excluded from recurring clinical billing minutes. Qualifying nurse/technician time is a subset of paid work. Logistics, onboarding and separate medication reviews do not enter the management-time threshold.</p>
    <p>These are allocated labor costs. Released physician time represents capacity; unchanged salaries do not automatically become cash savings. The 9:1 preset is an assumed technician-to-pharmacist recurring-time allocation. The 60:40 technician/pharmacist sensitivity transfers an approximate task-time split from a non-RPM study into an assumed 30-minute RPM month. Neither represents a validated RPM staffing standard, a headcount ratio or the split of all annual work.</p>
  </div>
}

export function PairedPaymentSummary({ inputs }) {
  const schedules = ['baseline', 'integrated'].map(arm => getRpmPaymentSchedule(inputs, arm))
  const labels = armLabels(inputs)
  return <div className="study-table-wrap"><table className="study-table"><thead><tr><th scope="col">Payment basis</th>{labels.map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>
    <tr><th scope="row">Qualifying clinical minutes / active month</th>{schedules.map((s, i) => <td key={i}>{number(s.qualifyingClinicalMinutes)}</td>)}</tr>
    <tr><th scope="row">Management code</th>{schedules.map((s, i) => <td key={i}>{s.mode === 'medicare2026' ? `${s.managementCode || 'None'}${s.additionalUnits ? ` + ${s.additionalUnits} × 99458` : ''}` : s.mode === 'none' ? 'No reimbursement' : 'Custom benchmark'}</td>)}</tr>
    <tr><th scope="row">Allowed recurring amount / qualifying month</th>{schedules.map((s, i) => <td key={i}>{money(s.monthlyBenchmark)}</td>)}</tr>
    <tr><th scope="row">Expected collections / active month</th>{schedules.map((s, i) => <td key={i}>{money(s.monthlyBenchmark * inputs.qualificationShare * inputs.collectionShare)}</td>)}</tr>
    <tr><th scope="row">Setup allowance / qualifying new start</th>{schedules.map((s, i) => <td key={i}>{money(s.setupFee)}</td>)}</tr>
  </tbody></table></div>
}

export function PatientTaskLedger({ patient, inputs }) {
  const labels = inputs ? armLabels(inputs) : ['Physician-delivered RPM', 'Pharmacist-delivered RPM']
  return <details className="sim-cost-details sim-patient-ledger"><summary>Inspect {patient.id}: separate staff tasks and costs</summary>
    {['baseline', 'integrated'].map((arm, index) => <div key={arm}><h4>{labels[index]}</h4><div className="sim-table-wrap"><table><thead><tr><th scope="col">Professional</th><th scope="col">Task</th><th scope="col">Minutes in budget year</th><th scope="col">Program cost</th></tr></thead><tbody>{(patient[arm].taskRecords || []).filter(task => task.minutes > 0).map((task, i) => <tr key={`${task.role}-${task.task}-${i}`}><th scope="row">{roleNames[task.role] || task.role}</th><td>{task.task}{task.costBasis === 'existing-clinic-resources' && <small><br />Covered by existing clinic resources; $0 additional allocation.</small>}</td><td>{number(task.minutes)}</td><td>{money(task.cost)}</td></tr>)}{!(patient[arm].taskRecords || []).some(task => task.minutes > 0) && <tr><td colSpan="4">No staff time for this patient in this program.</td></tr>}</tbody></table></div><p>Collections: {money(patient[arm].revenue)} · Variable costs allocated to program: {money(patient[arm].programCost)} · Margin before fixed costs: {money(patient[arm].operatingMargin)}</p></div>)}
    <p className="sim-footnote">All tasks and costs are simulated. Vendor charges appear in variable costs but are not staff minutes. Program fixed costs are included only in the full-cohort results.</p>
  </details>
}
