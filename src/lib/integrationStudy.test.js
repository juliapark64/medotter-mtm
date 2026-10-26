import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_INTEGRATION_INPUTS as defaults, simulateIntegrationStudy, expectedIntegrationStudy, validateIntegrationInputs, createIntegrationExport, verifyIntegrationExport, integrationExportCsv, getIntegrationScenarios, findOfferThreshold, getRpmPaymentSchedule } from './integrationStudy.js'
const p = overrides => ({ ...defaults, ...overrides })
const near = (actual, expected, tolerance = 1e-7) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`)
const zeroCosts = { pharmacistWage: 0, supportWage: 0, physicianReferralCost: 0, deviceCost: 0, monthlyTechnologyCost: 0, monthlyConnectivityCost: 0, monthlyPlatformBaseCost: 0, fixedCost: 0, addedFixedCost: 0 }

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
  const e = expectedIntegrationStudy(p({ N: 10, existingRpmShare: 0, r: 0, f: 1, c: 1, o: 1, qB: 1, startMonth: 10, monthlyRetention: 1, ...zeroCosts, monthlyTechnologyCost: 2, qualificationShare: .5, reimbursementMode: 'custom', monthlyRevenueBenchmark: 20, setupQualificationShare: 0, collectionShare: .8, externalPayerShare: .5 }))
  near(e.integrated.activeMonths, 30); near(e.integrated.qualifiedMonths, 15)
  near(e.integrated.programCost, 60); near(e.integrated.revenue, 120); near(e.delta.operatingMargin, 60)
  const noRev = expectedIntegrationStudy(p({ N: 1, existingRpmShare: 1, ...zeroCosts, monthlyTechnologyCost: 2, monthlyRetention: 1, qualificationShare: 0 }))
  near(noRev.baseline.activeMonths, 12); near(noRev.baseline.programCost, 24); near(noRev.baseline.revenue, 0)
})
test('existing RPM receives added review benefit without new referrals, onboarding or devices', () => {
  const e = expectedIntegrationStudy(p({ N: 10, existingRpmShare: 1, f: 1, c: 1, monthlyRetention: 1, clinicalMode: 'illustrative', lowBpShare: 1, actionBaseline: 0, actionIntegrated: 1, persistence12: 1, startMonth: 7, drugCostPerMonth: 10, retainedDrugSavingsShare: 1, ...zeroCosts }))
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
  const e = expectedIntegrationStudy(p({ ...zeroCosts, fixedCost: 100, addedFixedCost: 25, clinicalMode: 'none', reimbursementMode: 'none' }))
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
  assert.equal(findOfferThreshold(p({ ...zeroCosts, addedFixedCost: 1, externalPayerShare: 0, clinicalMode: 'none' })).status, 'unattainable')
  assert.equal(findOfferThreshold(p({ clinicalMode: 'unestimated' })).status, 'unestimated')
  const base = p({ ...zeroCosts, N: 10, existingRpmShare: 0, r: 0, f: 1, c: 1, qB: 1, monthlyRetention: 1, qualificationShare: 1, reimbursementMode: 'custom', monthlyRevenueBenchmark: 10, setupQualificationShare: 0, collectionShare: 1, externalPayerShare: 1, addedFixedCost: 300, clinicalMode: 'none' })
  near(findOfferThreshold(base).rate, .5, 1e-6)
})
test('exports include exact assumptions and reject altered results, patients, inputs, or metadata', () => {
  const bundle = createIntegrationExport(simulateIntegrationStudy(p({ N: 20 })))
  assert.deepEqual(verifyIntegrationExport(JSON.parse(JSON.stringify(bundle))), bundle)
  assert.equal(bundle.metadata.priceYear, 2026)
  assert.equal(bundle.metadata.currency, 'USD')
  assert.equal(bundle.modelVersion, '2.0.0')
  assert.equal(bundle.schemaVersion, 2)
  assert.match(integrationExportCsv(bundle), /expected/)
  for (const mutate of [b => { b.inputs.seed++ }, b => { b.expected.delta.programCost++ }, b => { b.patients[0].id = 'other' }, b => { b.metadata.assumptions = [] }, b => { b.extra = 1 }]) { const b = structuredClone(bundle); mutate(b); assert.throws(() => verifyIntegrationExport(b)) }
  assert.equal(getIntegrationScenarios().find(x => x.id === 'conservative').inputs.clinicalMode, 'none')
})

test('Medicare clinical-time boundaries select alternatives and only full add-on intervals', () => {
  const cases = [[0, null, 0, 0], [9.99, null, 0, 0], [10, '99470', 26.05, 0], [19.99, '99470', 26.05, 0], [20, '99457', 51.77, 0], [39.99, '99457', 51.77, 0], [40, '99457', 93.19, 1], [59.99, '99457', 93.19, 1], [60, '99457', 134.61, 2], [240, '99457', 134.61, 2]]
  for (const [minutes, code, managementFee, additionalUnits] of cases) {
    const schedule = getRpmPaymentSchedule(p({ monitorPharmacistMinutes: minutes }))
    assert.equal(schedule.managementCode, code); assert.equal(schedule.additionalUnits, additionalUnits)
    near(schedule.managementFee, managementFee); near(schedule.deviceFee, 52.11)
    near(schedule.monthlyBenchmark, 52.11 + managementFee); near(schedule.setupFee, 21.71)
  }
})
test('nonclinical support, onboarding and medication review time never earn clinical management codes', () => {
  const schedule = getRpmPaymentSchedule(p({ monitorPharmacistMinutes: 0, monitorSupportMinutes: 240, onboardingMinutes: 240, reviewMinutes: 240 }))
  assert.equal(schedule.managementCode, null); near(schedule.managementFee, 0); near(schedule.monthlyBenchmark, 52.11)
  const low = getRpmPaymentSchedule(p({ reimbursementMode: 'custom', monthlyRevenueBenchmark: 37, customSetupRevenueBenchmark: 8, monitorPharmacistMinutes: 0 }))
  const high = getRpmPaymentSchedule(p({ reimbursementMode: 'custom', monthlyRevenueBenchmark: 37, customSetupRevenueBenchmark: 8, monitorPharmacistMinutes: 240 }))
  near(low.monthlyBenchmark, 37); near(high.monthlyBenchmark, 37); near(high.setupFee, 8)
  assert.equal(high.managementCode, null)
})
test('one setup per unique new start despite duplicate offers; existing patients have none', () => {
  const parameters = p({ N: 1, existingRpmShare: 0, r: 1, qA: 1, f: 1, c: 1, o: 1, qB: 1, startMonth: 12, monthlyRetention: 1, setupQualificationShare: 1, qualificationShare: 1, reimbursementMode: 'custom', monthlyRevenueBenchmark: 20, customSetupRevenueBenchmark: 5, collectionShare: .8, externalPayerShare: .5 })
  for (const result of [expectedIntegrationStudy(parameters), simulateIntegrationStudy(parameters).actual]) {
    near(result.integrated.duplicateOffers, 1)
    for (const arm of [result.baseline, result.integrated]) {
      near(arm.newInitiations, 1); near(arm.qualifiedSetups, 1); near(arm.monthlyRevenue, 8); near(arm.setupRevenue, 2); near(arm.revenue, 10)
    }
    near(result.delta.setupRevenue, 0)
  }
  const existing = simulateIntegrationStudy({ ...parameters, existingRpmShare: 1 })
  for (const result of [existing.expected, existing.actual]) for (const arm of [result.baseline, result.integrated]) { near(arm.qualifiedSetups, 0); near(arm.setupRevenue, 0); near(arm.costBreakdown.devices, 0) }
  const failed = simulateIntegrationStudy({ ...parameters, qA: 0, qB: 0 })
  for (const result of [failed.expected, failed.actual]) { near(result.integrated.qualifiedSetups, 0); near(result.integrated.setupRevenue, 0) }
})
test('setup and recurring qualification are independent and all revenue exclusions retain costs', () => {
  const parameters = p({ N: 2, existingRpmShare: 0, r: 0, f: 1, c: 1, o: 1, qB: 1, startMonth: 12, qualificationShare: 0, setupQualificationShare: 1, collectionShare: 1, externalPayerShare: 1 })
  const setupOnly = expectedIntegrationStudy(parameters)
  near(setupOnly.integrated.monthlyRevenue, 0); near(setupOnly.integrated.setupRevenue, 43.42)
  const monthlyOnly = expectedIntegrationStudy({ ...parameters, qualificationShare: 1, setupQualificationShare: 0 })
  near(monthlyOnly.integrated.setupRevenue, 0); near(monthlyOnly.integrated.monthlyRevenue, 207.76)
  for (const exclusion of [{ reimbursementMode: 'none' }, { externalPayerShare: 0 }, { collectionShare: 0 }]) {
    const result = expectedIntegrationStudy({ ...parameters, ...exclusion })
    near(result.integrated.revenue, 0); near(result.integrated.setupRevenue, 0); near(result.integrated.monthlyRevenue, 0)
    near(result.integrated.programCost, setupOnly.integrated.programCost)
  }
})
test('cost components reconcile to hand calculation and platform licenses count once, without double loading', () => {
  const parameters = p({ N: 1, existingRpmShare: 0, r: 0, f: 1, c: 1, o: 1, qB: 1, startMonth: 12, clinicalMode: 'none', ...zeroCosts, pharmacistWage: 60, supportWage: 30, reviewMinutes: 12, offerMinutes: 6, onboardingMinutes: 18, monitorPharmacistMinutes: 30, monitorSupportMinutes: 12, deviceCost: 9, monthlyTechnologyCost: 4, monthlyConnectivityCost: 3, monthlyPlatformBaseCost: 7, platformProviderCount: 2, fixedCost: 11, addedFixedCost: 13 })
  const expectedCosts = { reviews: 12, offers: 6, onboarding: 18, pharmacistMonitoring: 30, technicalSupport: 6, physicianReferrals: 0, devices: 9, software: 4, connectivity: 3, platformBase: 168, otherFixed: 11, addedFixed: 13 }
  const run = simulateIntegrationStudy(parameters)
  for (const result of [run.expected, run.actual]) {
    assert.deepEqual(result.integrated.costBreakdown, expectedCosts)
    near(result.integrated.variableCost, 88); near(result.integrated.programCost, 280); near(result.baseline.programCost, 179); near(result.delta.programCost, 101)
    near(result.delta.costBreakdown.platformBase, 0)
    near(result.integrated.pharmacistHours * 60, 66)
    for (const arm of [result.baseline, result.integrated, result.delta]) near(Object.values(arm.costBreakdown).reduce((sum, value) => sum + value, 0), arm.programCost)
  }
  near(run.patients[0].integrated.programCost, 88); near(run.patients[0].integrated.costBreakdown.platformBase, 0)
})
test('version 1 pathway and clinical draws stay identical when setup qualification is added', () => {
  const run = simulateIntegrationStudy()
  // Recorded from version 1 at seed 2027, N=1000 and the same illustrative clinical inputs.
  assert.equal(run.actual.integrated.newInitiations, 141); assert.equal(run.actual.integrated.activeMonths, 1276)
  assert.deepEqual(run.actual.baseline.clinical, { actions: 3, sustainedAt12Months: 3, medicationMonths: 18 })
  assert.deepEqual(run.actual.integrated.clinical, { actions: 9, sustainedAt12Months: 5, medicationMonths: 44 })
  assert.equal(run.actual.integrated.qualifiedSetups, 91)
  const extract = result => result.patients.map(x => [x.id, x.existingRpm, x.physician, x.pharmacist, x.baseline.activeMonths, x.integrated.activeMonths, x.integrated.qualifiedMonths, x.baseline.clinical, x.integrated.clinical])
  assert.deepEqual(extract(run), extract(simulateIntegrationStudy(p({ setupQualificationShare: 0 }))))
  assert.deepEqual(extract(run), extract(simulateIntegrationStudy(p({ setupQualificationShare: 1 }))))
  for (const patient of run.patients) if (patient.baseline.newInitiation) assert.equal(patient.baseline.qualifiedSetups, patient.integrated.qualifiedSetups)
})
test('source benchmarks and default financial scenarios reproduce independently reviewed projections', () => {
  near(defaults.pharmacistWage, 67.75 * 49.93 / 35.13); near(defaults.supportWage, 22.41 * 49.93 / 35.13)
  const expected = expectedIntegrationStudy()
  near(expected.delta.monthlyRevenue, 17418.25949878102); near(expected.delta.setupRevenue, 637.7606681355)
  near(expected.delta.programCost, 52124.72780670952); near(expected.delta.netFinancialBenefit, -33833.78864614892)
  near(expectedIntegrationStudy(p({ externalPayerShare: 1 })).delta.netFinancialBenefit, -15777.768479232469)
  const ten = getIntegrationScenarios().find(s => s.id === 'evidence-10-mixed')
  near(getRpmPaymentSchedule(ten.inputs).monthlyBenchmark, 78.16)
  const nyu = getIntegrationScenarios().find(s => s.id === 'nyu-workload')
  near(nyu.inputs.monitorPharmacistMinutes, 58 + 1 / 3); assert.equal(getRpmPaymentSchedule(nyu.inputs).additionalUnits, 1)
})
test('version 2 exports retain fee and provenance details and reject old or altered accounting', () => {
  const bundle = createIntegrationExport(simulateIntegrationStudy(p({ N: 20 })))
  assert.ok(bundle.metadata.financialEvidence.every(source => source.url && source.accessedAt === '2026-10-25'))
  near(bundle.metadata.medicare2026Fees.additional99458, 41.42)
  assert.match(integrationExportCsv(bundle), /cost_breakdown_json/)
  assert.match(integrationExportCsv(bundle), /qualifiedSetups/)
  assert.throws(() => verifyIntegrationExport({ ...bundle, schemaVersion: 1, modelVersion: '1.0.0' }), /Version 1.*cannot be replayed/)
  for (const mutate of [b => { b.actual.integrated.setupRevenue++ }, b => { b.expected.integrated.costBreakdown.platformBase++ }, b => { b.metadata.medicare2026Fees.setup99453++ }]) {
    const changed = structuredClone(bundle); mutate(changed); assert.throws(() => verifyIntegrationExport(changed), /exact replay/)
  }
  for (const overrides of [{ reimbursementMode: 'other' }, { setupQualificationShare: 1.01 }, { platformProviderCount: .5 }, { monthlyConnectivityCost: -1 }, { customSetupRevenueBenchmark: Infinity }]) assert.throws(() => simulateIntegrationStudy(p(overrides)), RangeError)
})
