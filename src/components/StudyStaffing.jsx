import { getRpmPaymentSchedule } from '../lib/integrationStudy'

const number = value => typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('en-US', { maximumFractionDigits: 2 }) : 'Not estimated'
const roleNames = { physician: 'Physician', nurse: 'Registered nurse', medicalAssistant: 'Medical assistant', pharmacist: 'Pharmacist', technician: 'Pharmacy technician' }
const money = value => typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }) : 'Not estimated'

export const STUDY_COST_LABELS = [
  ['physicianReferrals', 'Physician referral work'],
  ['physicianMonitoring', 'Physician clinical review / treatment decisions'],
  ['nurseOnboarding', 'Nurse onboarding'], ['assistantOnboarding', 'Medical-assistant onboarding'],
  ['nurseMonitoring', 'Nurse monitoring / follow-up'], ['assistantMonitoring', 'Medical-assistant RPM coordination'],
  ['reviews', 'Added pharmacist intakes / medication reviews'], ['offers', 'Added pharmacist recruitment work'],
  ['supportOffers', 'Pharmacy-technician recruitment assistance'],
  ['onboarding', 'Optional pharmacist onboarding'], ['supportOnboarding', 'Optional pharmacy-technician onboarding'],
  ['pharmacistMonitoring', 'Optional pharmacist RPM monitoring'], ['technicalSupport', 'Optional pharmacy-technician RPM service'],
  ['devices', 'Vendor/device package · total across new starts'], ['software', 'RPM technology bundle · total across active months'],
  ['connectivity', 'Additional connectivity'], ['platformBase', 'Shared platform subscription'],
  ['otherFixed', 'Other program overhead'], ['addedFixed', 'Added integration overhead'],
]

export const STUDY_HOUR_ROWS = [
  ['physicianHours', 'Physician hours, all tasks'], ['nurseHours', 'Nurse hours, all tasks'],
  ['assistantHours', 'Medical-assistant hours, all tasks'], ['pharmacistHours', 'Pharmacist hours, all tasks'],
  ['technicianHours', 'Pharmacy-technician hours, all tasks'],
]

export function recurringStaffing(inputs, integrated = false) {
  const team = integrated && inputs.staffingMode === 'integrated-team'
  return [
    { role: 'Physician', minutes: inputs.monitorPhysicianMinutes, wage: inputs.physicianWage },
    { role: 'Nurse', minutes: team ? 0 : inputs.monitorNurseMinutes, wage: inputs.nurseWage },
    { role: 'Medical assistant', minutes: team ? 0 : inputs.monitorAssistantMinutes, wage: inputs.assistantWage },
    { role: 'Pharmacist', minutes: team ? inputs.monitorPharmacistMinutes : 0, wage: inputs.pharmacistWage },
    { role: 'Pharmacy technician', minutes: team ? inputs.monitorSupportMinutes : 0, wage: inputs.supportWage },
  ]
}

export function ClinicPathwaySummary({ inputs }) {
  const team = inputs.staffingMode === 'integrated-team'
  return <section className="study-pathway-summary" aria-label="Who delivers care in each pathway">
    <div><span className="study-eyebrow">CURRENT PROGRAM</span><h3>Physician-led RPM</h3><p>Physician referrals and clinical decisions, nurse monitoring, and medical-assistant coordination. No pharmacist or pharmacy technician participates in this baseline.</p></div>
    <div><span className="study-eyebrow">WITH PHARMACIST INTEGRATION</span><h3>{team ? 'Added MTM + optional staffing change' : 'Same clinic team + added MTM'}</h3><p>{team ? 'Physician clinical review continues. Pharmacist/technician RPM tasks replace nurse/assistant tasks, alongside added pharmacist recruitment and medication review. This scenario combines recruitment with a staffing change.' : 'The same physician, nurse, and medical-assistant service continues. Pharmacist recruitment and medication review are added; pharmacy-technician assistance is costed only in this pathway.'}</p></div>
    <p className="study-pathway-note">{team ? 'The 9:1 ratio refers only to technician-to-pharmacist task minutes at the reference settings. Physician work and added medication reviews are separate.' : 'The main comparison isolates adding pharmacist services. Additional RPM participants still generate physician, nurse, assistant, and vendor costs.'} Staffing minutes are investigator assumptions, not measured average workloads.</p>
  </section>
}

export function RecurringStaffingSummary({ inputs }) {
  const baseline = recurringStaffing(inputs)
  const integrated = recurringStaffing(inputs, true)
  const total = rows => rows.reduce((sum, row) => sum + row.minutes * row.wage / 60, 0)
  return <div className="study-team-summary">
    <p className="study-eyebrow">Recurring service · per active patient-month</p>
    <div className="study-table-wrap"><table className="study-table"><thead><tr><th scope="col">Professional</th><th scope="col">Physician-led baseline</th><th scope="col">With pharmacist integration</th><th scope="col">Hourly employer cost</th></tr></thead><tbody>
      {baseline.map((row, i) => <tr key={row.role}><th scope="row">{row.role}</th><td>{number(row.minutes)} min</td><td>{number(integrated[i].minutes)} min</td><td>{money(row.wage)}</td></tr>)}
      <tr><th scope="row">Total recurring labor cost</th><td>{money(total(baseline))}</td><td>{money(total(integrated))}</td><td>Minutes × wage ÷ 60</td></tr>
    </tbody></table></div>
    <p>Physician minutes represent clinical review and treatment decisions, including clinical oversight; administrative supervision is excluded from qualifying management time. Nurse qualifying time is a subset of total nurse time. Medical-assistant coordination is excluded from the management-time threshold. Onboarding, referral work, recruitment, and added pharmacist review are accounted for separately.</p>
    <p>These are valued resources, not a prediction that salaried payroll immediately changes. Published wage benchmarks do not establish the time each task takes or the clinical eligibility of staff work.</p>
  </div>
}

export function PairedPaymentSummary({ inputs }) {
  const schedules = ['baseline', 'integrated'].map(arm => getRpmPaymentSchedule(inputs, arm))
  return <div className="study-table-wrap"><table className="study-table"><thead><tr><th scope="col">Payment basis</th><th scope="col">Physician-led baseline</th><th scope="col">With pharmacist integration</th></tr></thead><tbody>
    <tr><th scope="row">Qualifying clinical minutes/month</th>{schedules.map((s, i) => <td key={i}>{number(s.qualifyingClinicalMinutes)}</td>)}</tr>
    <tr><th scope="row">Management code</th>{schedules.map((s, i) => <td key={i}>{s.mode === 'medicare2026' ? `${s.managementCode || 'None'}${s.additionalUnits ? ` + ${s.additionalUnits} × 99458` : ''}` : s.mode === 'none' ? 'No reimbursement' : 'Custom benchmark'}</td>)}</tr>
    <tr><th scope="row">Allowed recurring amount / qualifying month</th>{schedules.map((s, i) => <td key={i}>{money(s.monthlyBenchmark)}</td>)}</tr>
    <tr><th scope="row">Expected collections / active month</th>{schedules.map((s, i) => <td key={i}>{money(s.monthlyBenchmark * inputs.qualificationShare * inputs.collectionShare)}</td>)}</tr>
    <tr><th scope="row">Setup allowance / qualifying new start</th>{schedules.map((s, i) => <td key={i}>{money(s.setupFee)}</td>)}</tr>
  </tbody></table></div>
}

export function PatientTaskLedger({ patient }) {
  return <details className="sim-cost-details sim-patient-ledger"><summary>Inspect {patient.id}: staff tasks and costs in both pathways</summary>
    {['baseline', 'integrated'].map(arm => <div key={arm}><h4>{arm === 'baseline' ? 'Physician-led baseline' : 'With pharmacist integration'}</h4><div className="sim-table-wrap"><table><thead><tr><th scope="col">Professional</th><th scope="col">Task</th><th scope="col">Minutes in budget year</th><th scope="col">Cost</th></tr></thead><tbody>{(patient[arm].taskRecords || []).filter(task => task.minutes > 0).map((task, i) => <tr key={`${task.role}-${task.task}-${i}`}><th scope="row">{roleNames[task.role] || task.role}</th><td>{task.task}</td><td>{number(task.minutes)}</td><td>{money(task.cost)}</td></tr>)}{!(patient[arm].taskRecords || []).some(task => task.minutes > 0) && <tr><td colSpan="4">No staff time for this patient in this pathway.</td></tr>}</tbody></table></div><p>Collections: {money(patient[arm].revenue)} · Total variable costs: {money(patient[arm].programCost)} · Contribution before fixed costs: {money(patient[arm].operatingMargin)}</p></div>)}
    <p className="sim-footnote">Task times and costs are generated by the applied assumptions. Vendor charges appear in total variable costs but are not staff minutes. No task is a recorded clinical encounter.</p>
  </details>
}
