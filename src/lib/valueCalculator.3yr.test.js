import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateProjection, MODES } from './valueCalculator.js'
import { getBaseInputs } from '../data/calculatorDefaults.js'
const near = (a, b) => assert.ok(Number.isFinite(a) && Math.abs(a - b) < 1e-7, a + ' != ' + b)
const base = { ...getBaseInputs(), lives: 1000, eligibleShare: .1, completionRate: .5,
  pimsPerPatient: 2, incrementalDetection: .5, implementationRate: .4, substitution: .2,
  costPerStopped: 1000, substituteDrugCost: 500, minutesPerReview: 24, hourlyWage: 50,
  platformCost: 800, setupCost: 200, timingFactor: .5, restartRate: .2,
  memberTurnover: .1, opportunityDecline: .1, rpmEligibleShare: .1,
  rpmEnrollment: .2, rpmDropoutRate: 0, rpmDurationMonths: 6 }

test('three-year medication cohorts match a separate hand-worked example', () => {
  const r = calculateProjection(base, MODES.DEPRESCRIBING)
  const [a, b, c] = r.years
  near(a.newStops, 20); near(b.newStops, 18); near(c.newStops, 16.2)
  near(a.stoppedMedicationYears, 10); near(b.stoppedMedicationYears, 23.4); near(c.stoppedMedicationYears, 31.428)
  near(b.survivingStops, 14.4); near(c.survivingStops, 23.328)
  near(r.cumulative.programCost, 5600); near(r.cumulative.avoidedDrug, 58345.2)
  near(r.cumulative.netImpact, -52745.2); near(r.cumulative.netPMPM, -52745.2 / 36000)
  assert.deepEqual(r.years.map(y => y.setupCost), [200, 0, 0])
})
test('graduated and retained RPM participants are not enrolled again', () => {
  const r = calculateProjection(base, MODES.RPM)
  near(r.years[0].newRpmPatients, 20); near(r.years[1].newRpmPatients, 16.4); near(r.years[2].newRpmPatients, 13.808)
  near(r.years[0].rpmPatientMonths, 120); near(r.years[1].rpmPatientMonths, 98.4); near(r.years[2].rpmPatientMonths, 82.848)
  near(r.cumulative.rpmPatientMonths, 301.248)
})
test('late RPM cohorts carry into the next year until episode completion', () => {
  const r = calculateProjection({ ...base, timingFactor: .25, rpmDurationMonths: 12 }, MODES.RPM)
  near(r.years[0].rpmPatientMonths, 60)
  // 20 prior starts * 90% retained * 9 months + 16.4 new starts * 3 months.
  near(r.years[1].rpmPatientMonths, 211.2)
  near(r.years[2].rpmPatientMonths, 174.264)
})
test('full turnover removes prior cohorts and replenishes eligible members', () => {
  const r = calculateProjection({ ...base, memberTurnover: 1, rpmDurationMonths: 24 })
  for (const y of r.years) { near(y.survivingStops, 0); near(y.newRpmPatients, 20); near(y.rpmPatientMonths, 120) }
})
test('full uptake and no turnover cannot repeatedly enroll the same eligible pool', () => {
  const r = calculateProjection({ ...base, rpmEnrollment: 1, memberTurnover: 0, rpmDurationMonths: 3 }, MODES.RPM)
  assert.deepEqual(r.years.map(y => y.newRpmPatients), [100, 0, 0])
  assert.deepEqual(r.years.map(y => y.rpmPatientMonths), [300, 0, 0])
})
test('no restart or turnover preserves stops; full restart removes prior savings', () => {
  const full = calculateProjection({ ...base, restartRate: 1 }, MODES.DEPRESCRIBING)
  for (const y of full.years) near(y.survivingStops, 0)
  const keep = calculateProjection({ ...base, restartRate: 0, memberTurnover: 0, opportunityDecline: 1 }, MODES.DEPRESCRIBING)
  assert.deepEqual(keep.years.map(y => y.newStops), [20, 0, 0])
  assert.deepEqual(keep.years.map(y => y.stoppedMedicationYears), [10, 20, 20])
})
test('default scenarios produce finite additive budgets for each service combination', () => {
  for (const mode of Object.values(MODES)) {
    const r = calculateProjection(getBaseInputs(), mode)
    assert.equal(r.isComplete, true)
    for (const y of r.years) {
      near(y.netImpact, y.programCost - y.avoidedDrug - y.avoidedCV)
      near(y.totalStaffHours, y.pharmacistHours + y.supportHours)
    }
    near(r.cumulative.netImpact, r.years.reduce((sum, y) => sum + y.netImpact, 0))
  }
})
