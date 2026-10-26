import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_INTEGRATION_INPUTS as defaults, simulateIntegrationStudy, expectedIntegrationStudy, validateIntegrationInputs, createIntegrationExport, verifyIntegrationExport, integrationExportCsv, getIntegrationScenarios, findOfferThreshold } from './integrationStudy.js'
const p = overrides => ({ ...defaults, ...overrides })
const near = (actual, expected, tolerance = 1e-7) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`)
const zeroCosts = { pharmacistWage: 0, supportWage: 0, physicianReferralCost: 0, deviceCost: 0, monthlyTechnologyCost: 0, fixedCost: 0, addedFixedCost: 0 }

test('both channels preserve physician starts and deduplicate identical uptake', () => {
  const run = simulateIntegrationStudy(p({ N: 20, existingRpmShare: 0, r: 1, qA: 1, f: 1, c: 1, o: 1, qB: 1 }))
  assert.equal(run.actual.baseline.newInitiations, 20)
  assert.equal(run.actual.integrated.newInitiations, 20)
  assert.equal(run.actual.integrated.duplicateOffers, 20)
  assert.equal(run.actual.delta.newInitiations, 0)
  assert.ok(run.patients.every(x => x.physician.initiated && !x.additionalInitiation))
})
test('analytic union uses common uptake draws and conditional recontact, not summed marginal starts', () => {
  const e = expectedIntegrationStudy(p({ N: 100, existingRpmShare: 0, r: .5, qA: .5, f: 1, c: 1, o: 1, qB: .5, recontactUptake: null }))
  near(e.baseline.newInitiations, 25); near(e.integrated.newInitiations, 50)
  near(e.integrated.offers, 75); near(e.integrated.duplicateOffers, 25)
  const retry = expectedIntegrationStudy(p({ N: 100, existingRpmShare: 0, r: .5, qA: .5, f: 1, c: 1, o: 1, qB: .5, recontactUptake: .4 }))
  near(retry.integrated.newInitiations, 60); near(retry.integrated.offers, 100)
})
test('failed referrals, offers and reviews cost work; one onboarding/device per unique start', () => {
  const e = expectedIntegrationStudy(p({ N: 10, existingRpmShare: 0, r: 0, f: 1, c: 1, o: 1, qB: 0, ...zeroCosts, pharmacistWage: 60, reviewMinutes: 10, offerMinutes: 5 }))
  near(e.integrated.programCost, 150); near(e.integrated.newInitiations, 0)
  const x = expectedIntegrationStudy(p({ N: 1, existingRpmShare: 0, r: 1, qA: 1, f: 1, c: 1, o: 1, qB: 1, ...zeroCosts, deviceCost: 100 }))
  near(x.baseline.programCost, 100); near(x.integrated.programCost, 100)
})
test('late starts only incur remaining service months; qualification affects revenue not service costs', () => {
  const e = expectedIntegrationStudy(p({ N: 10, existingRpmShare: 0, r: 0, f: 1, c: 1, o: 1, qB: 1, startMonth: 10, monthlyRetention: 1, ...zeroCosts, monthlyTechnologyCost: 2, qualificationShare: .5, monthlyRevenueBenchmark: 20, collectionShare: .8, externalPayerShare: .5 }))
  near(e.integrated.activeMonths, 30); near(e.integrated.qualifiedMonths, 15)
  near(e.integrated.programCost, 60); near(e.integrated.revenue, 120); near(e.delta.operatingMargin, 60)
  const noRev = expectedIntegrationStudy(p({ N: 1, existingRpmShare: 1, ...zeroCosts, monthlyTechnologyCost: 2, monthlyRetention: 1, qualificationShare: 0 }))
  near(noRev.baseline.activeMonths, 12); near(noRev.baseline.programCost, 24); near(noRev.baseline.revenue, 0)
})
test('existing RPM receives added review benefit without new referrals, onboarding or devices', () => {
  const e = expectedIntegrationStudy(p({ N: 10, existingRpmShare: 1, f: 1, c: 1, monthlyRetention: 1, clinicalMode: 'illustrative', lowBpShare: 1, actionBaseline: 0, actionIntegrated: 1, persistence12: 1, startMonth: 7, drugCostPerMonth: 10, ...zeroCosts }))
  near(e.integrated.newInitiations, 0); near(e.integrated.offers, 0); near(e.integrated.reviews, 10)
  near(e.delta.clinical.actions, 10); near(e.delta.clinical.medicationMonths, 60); near(e.delta.clinical.sustainedAt12Months, 10); near(e.delta.drugSavings, 600)
  near(e.delta.netFinancialBenefit, 600)
  const clinic = expectedIntegrationStudy({ ...p({ N: 10, existingRpmShare: 1, f: 1, c: 1, monthlyRetention: 1, clinicalMode: 'illustrative', lowBpShare: 1, actionBaseline: 0, actionIntegrated: 1, persistence12: 1, drugCostPerMonth: 10, ...zeroCosts }), perspective: 'clinic' })
  near(clinic.delta.netFinancialBenefit, 0); near(clinic.delta.drugSavings, 600)
})
test('patient persistence uses 12 future months while budget counts only available medication months', () => {
  const e = expectedIntegrationStudy(p({ N: 1, existingRpmShare: 1, f: 1, c: 1, monthlyRetention: 1, clinicalMode: 'illustrative', lowBpShare: 1, actionBaseline: 0, actionIntegrated: 1, persistence12: .5 ** 12, startMonth: 11 }))
  near(e.integrated.clinical.medicationMonths, 1.5)
  near(e.integrated.clinical.sustainedAt12Months, .5 ** 12)
})
test('retained medication savings are independent of RPM payer mix and excluded from clinic margin', () => {
  const parameters = p({ N: 1, existingRpmShare: 1, f: 1, c: 1, monthlyRetention: 1, clinicalMode: 'illustrative', lowBpShare: 1, actionBaseline: 0, actionIntegrated: 1, persistence12: 1, startMonth: 12, drugCostPerMonth: 100, retainedDrugSavingsShare: .25, externalPayerShare: 1, qualificationShare: 0, ...zeroCosts })
  for (const result of [expectedIntegrationStudy(parameters), simulateIntegrationStudy(parameters).actual]) {
    near(result.delta.drugSavings, 100)
    near(result.delta.netFinancialBenefit, 25)
  }
  near(expectedIntegrationStudy({ ...parameters, externalPayerShare: 0 }).delta.netFinancialBenefit, 25)
  near(expectedIntegrationStudy({ ...parameters, retainedDrugSavingsShare: 0 }).delta.netFinancialBenefit, 0)
  near(expectedIntegrationStudy({ ...parameters, perspective: 'clinic' }).delta.netFinancialBenefit, 0)
})
test('a December starter has one budget medicine-month and separate full 12-month persistence', () => {
  const run = simulateIntegrationStudy(p({ N: 1, existingRpmShare: 0, r: 0, f: 1, c: 1, o: 1, qB: 1, startMonth: 12, monthlyRetention: 1, clinicalMode: 'illustrative', lowBpShare: 1, actionBaseline: 0, actionIntegrated: 1, persistence12: 1, drugCostPerMonth: 10 }))
  for (const result of [run.expected, run.actual]) {
    near(result.integrated.activeMonths, 1)
    near(result.integrated.clinical.actions, 1)
    near(result.integrated.clinical.medicationMonths, 1)
    near(result.integrated.clinical.sustainedAt12Months, 1)
    near(result.integrated.drugSavings, 10)
  }
})
test('existing patients must remain active at the planned assessment month', () => {
  const parameters = p({ N: 4, existingRpmShare: 1, f: 1, c: 1, monthlyRetention: 0, startMonth: 2, clinicalMode: 'illustrative', lowBpShare: 1, actionBaseline: 0, actionIntegrated: 1, persistence12: 1 })
  const run = simulateIntegrationStudy(parameters)
  near(run.expected.integrated.clinical.actions, 0)
  assert.equal(run.actual.integrated.clinical.actions, 0)
  near(run.expected.integrated.reviews, 4)
  const firstMonth = simulateIntegrationStudy({ ...parameters, startMonth: 1 })
  near(firstMonth.expected.integrated.clinical.actions, 4)
  assert.equal(firstMonth.actual.integrated.clinical.actions, 4)
})
test('missing clinical effects are null, explicit none remains zero and retains review costs', () => {
  const missing = expectedIntegrationStudy(p({ clinicalMode: 'illustrative', persistence12: null }))
  assert.equal(missing.delta.netFinancialBenefit, null); assert.equal(missing.integrated.clinical.actions, null)
  assert.ok(Number.isFinite(missing.delta.operatingMargin))
  const none = expectedIntegrationStudy(p({ clinicalMode: 'none', persistence12: null }))
  assert.equal(none.delta.drugSavings, 0); assert.ok(none.integrated.reviews > 0); assert.ok(none.integrated.programCost > 0)
})
test('fixed program costs count once per scenario and integration adds its fixed cost once', () => {
  const e = expectedIntegrationStudy(p({ ...zeroCosts, fixedCost: 100, addedFixedCost: 25 }))
  near(e.baseline.programCost, 100); near(e.integrated.programCost, 125); near(e.delta.netFinancialBenefit, -25)
})
test('seed replay and recruitment conservation hold; probability boundaries yield exact expected counts', () => {
  const run = simulateIntegrationStudy()
  assert.deepEqual(simulateIntegrationStudy(), run)
  assert.ok(run.patients.every(x => !x.baseline.participating || x.integrated.participating))
  assert.equal(run.actual.integrated.newInitiations - run.actual.baseline.newInitiations, run.patients.filter(x => x.additionalInitiation).length)
  const exact = simulateIntegrationStudy(p({ N: 3, existingRpmShare: 0, r: 0, f: 1, c: 1, o: 1, qB: 1, monthlyRetention: 1, qualificationShare: 1 }))
  for (const k of ['newInitiations', 'activeMonths', 'qualifiedMonths', 'programCost']) near(exact.actual.integrated[k], exact.expected.integrated[k])
})
test('repeated seeded cohorts approach analytic recruitment, service and clinical expectations', () => {
  const parameters = p({ N: 250, clinicalMode: 'illustrative', recontactUptake: .25, externalPayerShare: .6 })
  const expected = expectedIntegrationStudy(parameters)
  const paths = [['integrated', 'newInitiations'], ['integrated', 'activeMonths'], ['integrated', 'revenue'], ['delta', 'programCost'], ['delta', 'netFinancialBenefit']]
  const values = paths.map(() => [])
  for (let seed = 0; seed < 80; seed++) {
    const actual = simulateIntegrationStudy({ ...parameters, seed }).actual
    paths.forEach(([arm, metric], i) => values[i].push(actual[arm][metric]))
  }
  paths.forEach(([arm, metric], i) => {
    const mean = values[i].reduce((a, b) => a + b, 0) / values[i].length
    const variance = values[i].reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values[i].length - 1)
    near(mean, expected[arm][metric], 6 * Math.sqrt(variance / values[i].length) + 1e-7)
  })
})
test('invalid, missing and unknown inputs are rejected, including invalid clinical values', () => {
  for (const invalid of [null, {}, p({ N: 0 }), p({ N: 10001 }), p({ r: NaN }), p({ o: 1.1 }), p({ startMonth: 13 }), p({ seed: -1 }), p({ perspective: 'other' }), p({ clinicalMode: 'other' }), p({ persistence12: '0.5' }), p({ typo: 2 })]) { assert.ok(Object.keys(validateIntegrationInputs(invalid)).length); assert.throws(() => simulateIntegrationStudy(invalid)) }
})
test('financial threshold reports already covered, attainable, missing, and unattainable scenarios', () => {
  assert.equal(findOfferThreshold(p({ ...zeroCosts })).rate, 0)
  assert.equal(findOfferThreshold(p({ ...zeroCosts, addedFixedCost: 1, externalPayerShare: 0 })).status, 'unattainable')
  assert.equal(findOfferThreshold(p({ clinicalMode: 'unestimated' })).status, 'unestimated')
  const base = p({ ...zeroCosts, N: 10, existingRpmShare: 0, r: 0, f: 1, c: 1, qB: 1, monthlyRetention: 1, qualificationShare: 1, monthlyRevenueBenchmark: 10, collectionShare: 1, externalPayerShare: 1, addedFixedCost: 300 })
  near(findOfferThreshold(base).rate, .5, 1e-6)
})
test('exports include exact assumptions and reject altered results, patients, inputs, or metadata', () => {
  const bundle = createIntegrationExport(simulateIntegrationStudy(p({ N: 20 })))
  assert.deepEqual(verifyIntegrationExport(JSON.parse(JSON.stringify(bundle))), bundle)
  assert.equal(bundle.metadata.priceYear, 2026)
  assert.equal(bundle.metadata.currency, 'USD')
  assert.match(integrationExportCsv(bundle), /expected/)
  for (const mutate of [b => { b.inputs.seed++ }, b => { b.expected.delta.programCost++ }, b => { b.patients[0].id = 'other' }, b => { b.metadata.assumptions = [] }, b => { b.extra = 1 }]) { const b = structuredClone(bundle); mutate(b); assert.throws(() => verifyIntegrationExport(b)) }
  assert.equal(getIntegrationScenarios().find(x => x.id === 'conservative').inputs.clinicalMode, 'none')
})
