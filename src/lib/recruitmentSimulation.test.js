import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_RECRUITMENT_INPUTS as defaults, RECRUITMENT_MODEL_METADATA, simulateRecruitment, summarizeRecruitment, expectedRecruitment, validateRecruitmentInputs, createRecruitmentExport, verifyRecruitmentExport } from './recruitmentSimulation.js'

const near = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`)
const inputs = overrides => ({ ...defaults, ...overrides })

test('analytic expectations reproduce the independently worked one-pager examples', () => {
  const full = expectedRecruitment(inputs({ f: 1 }))
  near(full.physician.initiated, 62.54)
  near(full.pharmacist.initiated, 222.6)
  near(full.difference.initiated, 160.06)
  near(full.thresholds.offerForParity, 0.14047619047619048)
  near(full.thresholds.offerForDoubling, 0.28095238095238095)
  const quarter = expectedRecruitment(inputs({ f: .25 }))
  near(quarter.pharmacist.initiated, 55.65)
  near(quarter.difference.initiated, -6.89)
  assert.equal(quarter.thresholds.doublingFeasible, false)
  const none = expectedRecruitment(inputs({ f: 0, r: 0 }))
  assert.equal(none.thresholds.offerForParity, null)
  assert.equal(none.relativeInitiationYield, null)
})

test('all-zero and all-one gates give exact outcomes, including the maximum cohort', () => {
  const all = simulateRecruitment(inputs({ N: 10000, r: 1, f: 1, c: 1, o: 1, qA: 1, qB: 1 }))
  assert.equal(all.summary.physician.initiated, 10000)
  assert.equal(all.summary.pharmacist.initiated, 10000)
  assert.equal(all.summary.paired.bothInitiated, 10000)
  assert.equal(all.patients[0].id, 'S0001')
  assert.equal(all.patients.at(-1).id, 'S10000')
  const none = simulateRecruitment(inputs({ N: 1, r: 0, f: 0 }))
  assert.equal(none.summary.paired.neitherInitiated, 1)
  assert.equal(none.patients[0].physician.reasonForNoReferral, 'not-referred')
  assert.equal(none.patients[0].pharmacist.reasonForNoReferral, 'outside-review-population')
})

test('each MTM gate blocks every downstream stage and records the correct reason', () => {
  const cases = [
    [{ f: 0 }, 'outside-review-population'],
    [{ c: 0 }, 'review-not-completed'],
    [{ o: 0 }, 'rpm-not-offered']
  ]
  for (const [overrides, reason] of cases) {
    const result = simulateRecruitment(inputs({ N: 25, f: 1, c: 1, o: 1, qB: 1, ...overrides }))
    assert.equal(result.summary.pharmacist.initiated, 0)
    assert.ok(result.patients.every(patient => !patient.pharmacist.referred && patient.pharmacist.reasonForNoReferral === reason))
  }
  const noUptake = simulateRecruitment(inputs({ r: 1, f: 1, c: 1, o: 1, qA: 0, qB: 0 }))
  assert.equal(noUptake.summary.physician.referred, defaults.N)
  assert.equal(noUptake.summary.pharmacist.offered, defaults.N)
  assert.equal(noUptake.summary.paired.neitherInitiated, defaults.N)
})

test('same seed reproduces paired records without mutating inputs; seed changes affect draws', () => {
  const parameters = inputs({ seed: 0 })
  const snapshot = structuredClone(parameters)
  const first = simulateRecruitment(parameters)
  assert.deepEqual(first, simulateRecruitment(parameters))
  assert.deepEqual(parameters, snapshot)
  assert.notDeepEqual(first.patients, simulateRecruitment(inputs({ seed: 1 })).patients)
  assert.deepEqual(summarizeRecruitment(first.patients), first.summary)
})

test('common initiation draws preserve equal uptake and monotone paired uptake choices', () => {
  const equal = simulateRecruitment(inputs({ r: 1, f: 1, c: 1, o: 1 }))
  assert.ok(equal.patients.every(patient => patient.physician.initiated === patient.pharmacist.initiated))
  const ordered = simulateRecruitment(inputs({ r: 1, f: 1, c: 1, o: 1, qA: .2, qB: .8 }))
  assert.ok(ordered.patients.every(patient => !patient.physician.initiated || patient.pharmacist.initiated))
  const first = simulateRecruitment()
  const changedPhysicianGate = simulateRecruitment(inputs({ r: 0 }))
  assert.deepEqual(first.patients.map(p => p.pharmacist), changedPhysicianGate.patients.map(p => p.pharmacist))
  assert.deepEqual(first.patients.slice(0, 10), simulateRecruitment(inputs({ N: 10 })).patients)
})

test('observed pathway counts conserve the cohort and respect all conditional denominators', () => {
  const { patients, summary: s } = simulateRecruitment()
  const a = s.physician
  const b = s.pharmacist
  assert.equal(a.notReferred + a.referredNotInitiated + a.initiated, s.N)
  assert.equal(b.outsideReviewPopulation + b.reviewNotCompleted + b.notOfferedAfterReview + b.referredNotInitiated + b.initiated, s.N)
  assert.equal(Object.values(s.paired).reduce((sum, value) => sum + value, 0), s.N)
  assert.equal(s.paired.pharmacistOnly - s.paired.physicianOnly, s.difference.initiated)
  assert.ok(patients.every(p => (!p.physician.initiated || p.physician.referred) && (!p.pharmacist.initiated || p.pharmacist.offered)))
})

test('invalid and unknown inputs cannot silently become simulation parameters', () => {
  assert.deepEqual(validateRecruitmentInputs(defaults), {})
  for (const invalid of [null, [], {}, inputs({ N: 0 }), inputs({ N: 10001 }), inputs({ N: 2.5 }), inputs({ seed: -1 }), inputs({ seed: 4294967296 }), inputs({ seed: .5 }), inputs({ r: NaN }), inputs({ c: Infinity }), inputs({ o: -0.1 }), inputs({ qA: 1.01 }), inputs({ f: '' }), inputs({ qB: '0.53' }), inputs({ typo: .2 })]) {
    assert.ok(Object.keys(validateRecruitmentInputs(invalid)).length > 0)
    assert.throws(() => simulateRecruitment(invalid), RangeError)
  }
  assert.doesNotThrow(() => simulateRecruitment(inputs({ seed: 4294967295 })))
  const impossible = simulateRecruitment(inputs({ N: 1, r: 0 })).patients
  impossible[0].physician.initiated = true
  assert.throws(() => summarizeRecruitment(impossible), /recruitment gates/)
})

test('repeated seeds approach analytic mean counts without treating synthetic size as evidence', () => {
  const repetitions = 100
  const totals = { referral: 0, reviewPopulation: 0, reviewCompleted: 0, offered: 0, initiationA: 0, initiationB: 0 }
  for (let seed = 0; seed < repetitions; seed++) {
    const s = simulateRecruitment(inputs({ seed })).summary
    totals.referral += s.physician.referred
    totals.reviewPopulation += s.pharmacist.inReviewPopulation
    totals.reviewCompleted += s.pharmacist.reviewCompleted
    totals.offered += s.pharmacist.offered
    totals.initiationA += s.physician.initiated
    totals.initiationB += s.pharmacist.initiated
  }
  const probabilities = { referral: .118, reviewPopulation: .5, reviewCompleted: .42, offered: .21, initiationA: .06254, initiationB: .1113 }
  for (const [key, probability] of Object.entries(probabilities)) {
    const tolerance = 6 * Math.sqrt(defaults.N * probability * (1 - probability) / repetitions)
    near(totals[key] / repetitions, defaults.N * probability, tolerance)
  }
})

test('JSON exports round-trip complete inputs, model assumptions, and patient-level results', () => {
  const run = simulateRecruitment()
  const bundle = createRecruitmentExport(run)
  const parsed = JSON.parse(JSON.stringify(bundle))
  assert.deepEqual(verifyRecruitmentExport(parsed), bundle)
  assert.deepEqual(bundle.inputs, defaults)
  assert.equal(bundle.modelVersion, RECRUITMENT_MODEL_METADATA.version)
  assert.match(bundle.metadata.endpoint, /at least one transmitted/)
  assert.match(bundle.metadata.randomization.coupling, /shared/)
  const missingInputs = structuredClone(run)
  delete missingInputs.inputs
  assert.throws(() => createRecruitmentExport(missingInputs), RangeError)
  for (const mutate of [b => { b.inputs.seed++ }, b => { b.summary.physician.initiated++ }, b => { b.patients[0].id = 'changed' }, b => { b.metadata.assumptions = [] }, b => { b.modelVersion = '0.0.0' }, b => { b.extra = true }]) {
    const altered = structuredClone(bundle)
    mutate(altered)
    assert.throws(() => verifyRecruitmentExport(altered))
  }
  run.patients[0].physician.initiated = !run.patients[0].physician.initiated
  assert.throws(() => createRecruitmentExport(run), /replay/)
})
