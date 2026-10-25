import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateValue, calculateProjection, validateInputs, MODES, retainedMonths } from './valueCalculator.js'
import { getBaseInputs } from '../data/calculatorDefaults.js'

export const roundInputs = {
  ...getBaseInputs(), lives: 1000, eligibleShare: .1, completionRate: .5,
  pimsPerPatient: 2, incrementalDetection: .5, implementationRate: .4,
  substitution: .2, costPerStopped: 1000, substituteDrugCost: 500,
  minutesPerReview: 24, hourlyWage: 50, supportHourlyWage: 20,
  rpmEligibleShare: .1, rpmEnrollment: .2, rpmMinutesPerMonth: 10,
  supportMinutesPerMonth: 15, onboardingPharmacistMinutes: 6, onboardingSupportMinutes: 9,
  monthlyFee: 10, deviceCost: 50, platformCost: 800, setupCost: 200,
  timingFactor: .5, rpmDurationMonths: 6, rpmDropoutRate: 0,
  sbpReduction: 5, rrPer5: .2, eventRate: .1, costPerEvent: 10000,
  restartRate: .2, memberTurnover: .1, opportunityDecline: .1
}
export function near(actual, expected) { assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) < 1e-7, actual + ' != ' + expected) }

test('independently hand-calculated deprescribing budget includes replacement costs', () => {
  const r = calculateValue(roundInputs, MODES.DEPRESCRIBING)
  assert.equal(r.isComplete, true)
  near(r.reviews, 50); near(r.newStops, 20); near(r.stoppedMedicationYears, 10)
  near(r.grossAvoidedDrug, 10000); near(r.replacementDrugCost, 1000); near(r.avoidedDrug, 9000)
  near(r.pharmacistHours, 20); near(r.supportHours, 0); near(r.programCost, 2000); near(r.netImpact, -7000)
})
test('hand-calculated RPM microcosts keep staff, device and connectivity separate', () => {
  const r = calculateValue(roundInputs, MODES.RPM)
  near(r.newRpmPatients, 20); near(r.rpmPatientMonths, 120)
  near(r.pharmacistHours, 22); near(r.supportHours, 33)
  near(r.pharmacistLaborCost, 1100); near(r.supportLaborCost, 660)
  near(r.deviceCost, 1000); near(r.connectivityCost, 1200)
  near(r.programCost, 4960); near(r.avoidedEvents, .2); near(r.avoidedCV, 2000); near(r.netImpact, 2960)
})
test('combined services share fixed costs once without adding clinical synergy', () => {
  const d = calculateValue(roundInputs, MODES.DEPRESCRIBING)
  const r = calculateValue(roundInputs, MODES.RPM)
  const c = calculateValue(roundInputs, MODES.COMBINED)
  near(c.programCost, d.programCost + r.programCost - 1000)
  near(c.avoidedDrug, d.avoidedDrug); near(c.avoidedCV, r.avoidedCV)
  near(c.netImpact, -5040); near(c.netPMPM, -.42)
})
test('price year is a label and never silently inflates prices', () => {
  const a = calculateValue(roundInputs)
  const b = calculateValue({ ...roundInputs, priceYear: 2030 })
  near(a.netImpact, b.netImpact); assert.equal(b.priceYear, 2030)
})
test('all timing factors yield the same first year in one- and three-year engines', () => {
  for (const timingFactor of [0, .25, .5, 1]) for (const mode of Object.values(MODES)) {
    const p = { ...roundInputs, timingFactor, rpmDropoutRate: .15, rpmDurationMonths: 12 }
    assert.deepEqual(calculateProjection(p, mode, 1).years[0], calculateProjection(p, mode, 3).years[0])
  }
})
test('no starts at zero exposure; fixed costs remain explicit', () => {
  const r = calculateValue({ ...roundInputs, timingFactor: 0 })
  near(r.newStops, 0); near(r.reviews, 0); near(r.newRpmPatients, 0); near(r.totalOffsets, 0); near(r.programCost, 1000)
})
test('RPM cohort is independent of MTM eligibility', () => {
  const a = calculateValue(roundInputs, MODES.RPM)
  const b = calculateValue({ ...roundInputs, eligibleShare: .9 }, MODES.RPM)
  near(a.rpmPatientMonths, b.rpmPatientMonths)
})
test('substitution can increase medication costs without hiding discontinuations', () => {
  const r = calculateValue({ ...roundInputs, substitution: 1, substituteDrugCost: 2000 }, MODES.DEPRESCRIBING)
  near(r.newStops, 20); near(r.avoidedDrug, -10000)
})
test('risk reduction compounds and remains bounded; zero BP benefit gives no CV offset', () => {
  near(calculateValue({ ...roundInputs, sbpReduction: 10 }).riskReduction, .36)
  near(calculateValue({ ...roundInputs, sbpReduction: 0, rrPer5: 1 }).avoidedCV, 0)
  near(calculateValue({ ...roundInputs, costPerEvent: 0 }).avoidedCV, 0)
})
test('dropout integration has correct zero and full-dropout limits', () => {
  near(retainedMonths(0, 6, 0), 6)
  near(retainedMonths(0, 6, 1), 0)
  // A 75% annual dropout leaves exp(-ln(4)/2)=1/2 at six months.
  near(retainedMonths(0, 6, .75), 6 / Math.log(4))
  near(retainedMonths(6, 12, .75), 3 / Math.log(4))
  const r = calculateValue({ ...roundInputs, rpmDropoutRate: 1 }, MODES.RPM)
  near(r.rpmPatientMonths, 0); near(r.deviceCost, 1000); near(r.avoidedCV, 0)
})
test('invalid inputs cannot silently produce numbers or exports', () => {
  for (const [key, value] of [['lives', 0], ['lives', -1], ['lives', 1.5], ['implementationRate', 1.1], ['rpmEnrollment', -.1], ['monthlyFee', Infinity], ['hourlyWage', NaN], ['priceYear', 2026.5], ['deviceCost', true], ['rpmDurationMonths', 0], ['restartRate', ' '], ['memberTurnover', null]]) {
    const r = calculateProjection({ ...roundInputs, [key]: value })
    assert.equal(r.isComplete, false, key)
    assert.ok(r.errors[key], key)
    assert.equal(r.cumulative, null)
  }
  assert.ok(validateInputs(roundInputs, 'unsupported').mode)
  assert.ok(validateInputs(roundInputs, MODES.COMBINED, 2).horizon)
  assert.equal(calculateValue({ ...roundInputs, lives: 1e308, pimsPerPatient: 1e308 }).isComplete, false)
})
test('inactive services do not require their assumptions; raw inputs are not mutated', () => {
  const p = { ...roundInputs, monthlyFee: null, rpmDurationMonths: null }
  const before = JSON.stringify(p)
  assert.equal(calculateProjection(p, MODES.DEPRESCRIBING).isComplete, true)
  assert.equal(calculateProjection(p, MODES.RPM).isComplete, false)
  assert.equal(JSON.stringify(p), before)
})
