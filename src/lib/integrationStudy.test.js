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
  const e = expectedIntegrationStudy(p({ N: 10, existingRpmShare: 0, r: 0, f: 1, c: 1, o: 1, qB: 1, startMonth: 10, monthlyRetention: 1, ...zeroCosts, monthlyTechnologyCost: 2, qualificationShare: .5, reimbursementMode: 'custom', monthlyRevenueBenchmark: 20, setupQualificationShare: 0, collectionShare: .8 }))
  near(e.integrated.activeMonths, 30); near(e.integrated.qualifiedMonths, 15)
  near(e.integrated.programCost, 60); near(e.integrated.revenue, 240); near(e.delta.operatingMargin, 180)
  const noRev = expectedIntegrationStudy(p({ N: 1, existingRpmShare: 1, ...zeroCosts, monthlyTechnologyCost: 2, monthlyRetention: 1, qualificationShare: 0 }))
  near(noRev.baseline.activeMonths, 12); near(noRev.baseline.programCost, 24); near(noRev.baseline.revenue, 0)
})
test('existing RPM receives added review benefit without new referrals, onboarding or devices', () => {
  const e = expectedIntegrationStudy(p({ N: 10, existingRpmShare: 1, f: 1, c: 1, monthlyRetention: 1, clinicalMode: 'illustrative', lowBpShare: 1, actionBaseline: 0, actionIntegrated: 1, persistence12: 1, startMonth: 7, drugCostPerMonth: 10, ...zeroCosts }))
  near(e.integrated.newInitiations, 0); near(e.integrated.offers, 0); near(e.integrated.reviews, 10)
  near(e.delta.clinical.actions, 10); near(e.delta.clinical.medicationMonths, 60); near(e.delta.clinical.sustainedAt12Months, 10); near(e.delta.drugSavings, 600)
  near(e.delta.netFinancialBenefit, 0)
  const clinic = expectedIntegrationStudy({ ...p({ N: 10, existingRpmShare: 1, f: 1, c: 1, monthlyRetention: 1, clinicalMode: 'illustrative', lowBpShare: 1, actionBaseline: 0, actionIntegrated: 1, persistence12: 1, drugCostPerMonth: 10, ...zeroCosts }), perspective: 'clinic' })
  near(clinic.delta.netFinancialBenefit, 0); near(clinic.delta.drugSavings, 600)
})
test('patient persistence uses 12 future months while budget counts only available medication months', () => {
  const e = expectedIntegrationStudy(p({ N: 1, existingRpmShare: 1, f: 1, c: 1, monthlyRetention: 1, clinicalMode: 'illustrative', lowBpShare: 1, actionBaseline: 0, actionIntegrated: 1, persistence12: .5 ** 12, startMonth: 11 }))
  near(e.integrated.clinical.medicationMonths, 1.5)
  near(e.integrated.clinical.sustainedAt12Months, .5 ** 12)
})
test('medication offsets remain separate from clinic surplus in expected and seeded accounting', () => {
  const parameters = p({ N: 1, existingRpmShare: 1, f: 1, c: 1, monthlyRetention: 1, clinicalMode: 'illustrative', lowBpShare: 1, actionBaseline: 0, actionIntegrated: 1, persistence12: 1, startMonth: 12, drugCostPerMonth: 100, qualificationShare: 0, ...zeroCosts })
  for (const result of [expectedIntegrationStudy(parameters), simulateIntegrationStudy(parameters).actual]) {
    near(result.delta.drugSavings, 100)
    near(result.delta.netFinancialBenefit, 0)
    near(result.delta.netFinancialBenefit, result.delta.operatingMargin)
  }
  near(expectedIntegrationStudy({ ...parameters, drugCostPerMonth: 10000 }).delta.netFinancialBenefit, 0)
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
  near(missing.delta.netFinancialBenefit, missing.delta.operatingMargin); assert.equal(missing.integrated.clinical.actions, null)
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
  const parameters = p({ N: 250, clinicalMode: 'illustrative', recontactUptake: .25 })
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
  for (const invalid of [null, {}, p({ N: 0 }), p({ N: 10001 }), p({ r: NaN }), p({ o: 1.1 }), p({ startMonth: 13 }), p({ seed: -1 }), p({ perspective: 'other' }), p({ perspective: 'consolidated' }), p({ externalPayerShare: .5 }), p({ retainedDrugSavingsShare: .5 }), p({ clinicalMode: 'other' }), p({ persistence12: '0.5' }), p({ typo: 2 })]) { assert.ok(Object.keys(validateIntegrationInputs(invalid)).length); assert.throws(() => simulateIntegrationStudy(invalid)) }
})
test('financial threshold reports covered, attainable and unattainable cases even without clinical estimates', () => {
  assert.equal(findOfferThreshold(p({ ...zeroCosts })).rate, 0)
  assert.equal(findOfferThreshold(p({ ...zeroCosts, addedFixedCost: 1, reimbursementMode: 'none', clinicalMode: 'none' })).status, 'unattainable')
  assert.deepEqual(findOfferThreshold(p({ clinicalMode: 'unestimated' })), findOfferThreshold())
  const base = p({ ...zeroCosts, N: 10, existingRpmShare: 0, r: 0, f: 1, c: 1, qB: 1, monthlyRetention: 1, qualificationShare: 1, reimbursementMode: 'custom', monthlyRevenueBenchmark: 10, setupQualificationShare: 0, collectionShare: 1, addedFixedCost: 300, clinicalMode: 'none' })
  near(findOfferThreshold(base).rate, .5, 1e-6)
})
test('exports include exact assumptions and reject altered results, patients, inputs, or metadata', () => {
  const bundle = createIntegrationExport(simulateIntegrationStudy(p({ N: 20 })))
  assert.deepEqual(verifyIntegrationExport(JSON.parse(JSON.stringify(bundle))), bundle)
  assert.equal(bundle.metadata.priceYear, 2026)
  assert.equal(bundle.metadata.currency, 'USD')
  assert.equal(bundle.modelVersion, '5.0.0')
  assert.equal(bundle.schemaVersion, 5)
  assert.match(integrationExportCsv(bundle), /expected/)
  for (const mutate of [b => { b.inputs.seed++ }, b => { b.expected.delta.programCost++ }, b => { b.patients[0].id = 'other' }, b => { b.metadata.assumptions = [] }, b => { b.extra = 1 }]) { const b = structuredClone(bundle); mutate(b); assert.throws(() => verifyIntegrationExport(b)) }
  assert.equal(getIntegrationScenarios().find(x => x.id === 'conservative').inputs.clinicalMode, 'none')
})

test('Medicare clinical-time boundaries select alternatives and only full add-on intervals', () => {
  const cases = [[0, null, 0, 0], [9.99, null, 0, 0], [10, '99470', 26.05, 0], [19.99, '99470', 26.05, 0], [20, '99457', 51.77, 0], [39.99, '99457', 51.77, 0], [40, '99457', 93.19, 1], [59.99, '99457', 93.19, 1], [60, '99457', 134.61, 2], [240, '99457', 134.61, 2]]
  for (const [minutes, code, managementFee, additionalUnits] of cases) {
    const schedule = getRpmPaymentSchedule(p({ monitorPharmacistMinutes: minutes, qualifiedSupportMinutes: 0 }))
    assert.equal(schedule.managementCode, code); assert.equal(schedule.additionalUnits, additionalUnits)
    near(schedule.managementFee, managementFee); near(schedule.deviceFee, 52.11)
    near(schedule.monthlyBenchmark, 52.11 + managementFee); near(schedule.setupFee, 21.71)
  }
})
test('nonclinical support, onboarding and medication review time never earn clinical management codes', () => {
  const schedule = getRpmPaymentSchedule(p({ monitorPharmacistMinutes: 0, monitorSupportMinutes: 240, qualifiedSupportMinutes: 0, onboardingMinutes: 240, onboardingSupportMinutes: 240, offerMinutes: 120, offerSupportMinutes: 120, reviewMinutes: 240 }))
  assert.equal(schedule.managementCode, null); near(schedule.managementFee, 0); near(schedule.monthlyBenchmark, 52.11)
  const low = getRpmPaymentSchedule(p({ reimbursementMode: 'custom', monthlyRevenueBenchmark: 37, customSetupRevenueBenchmark: 8, monitorPharmacistMinutes: 0 }))
  const high = getRpmPaymentSchedule(p({ reimbursementMode: 'custom', monthlyRevenueBenchmark: 37, customSetupRevenueBenchmark: 8, monitorPharmacistMinutes: 240 }))
  near(low.monthlyBenchmark, 37); near(high.monthlyBenchmark, 37); near(high.setupFee, 8)
  assert.equal(high.managementCode, null)
})
test('one setup per unique new start despite duplicate offers; existing patients have none', () => {
  const parameters = p({ N: 1, existingRpmShare: 0, r: 1, qA: 1, f: 1, c: 1, o: 1, qB: 1, startMonth: 12, monthlyRetention: 1, setupQualificationShare: 1, qualificationShare: 1, reimbursementMode: 'custom', monthlyRevenueBenchmark: 20, customSetupRevenueBenchmark: 5, collectionShare: .8 })
  for (const result of [expectedIntegrationStudy(parameters), simulateIntegrationStudy(parameters).actual]) {
    near(result.integrated.duplicateOffers, 1)
    for (const arm of [result.baseline, result.integrated]) {
      near(arm.newInitiations, 1); near(arm.qualifiedSetups, 1); near(arm.monthlyRevenue, 16); near(arm.setupRevenue, 4); near(arm.revenue, 20)
    }
    near(result.delta.setupRevenue, 0)
  }
  const existing = simulateIntegrationStudy({ ...parameters, existingRpmShare: 1 })
  for (const result of [existing.expected, existing.actual]) for (const arm of [result.baseline, result.integrated]) { near(arm.qualifiedSetups, 0); near(arm.setupRevenue, 0); near(arm.costBreakdown.devices, 0) }
  const failed = simulateIntegrationStudy({ ...parameters, qA: 0, qB: 0 })
  for (const result of [failed.expected, failed.actual]) { near(result.integrated.qualifiedSetups, 0); near(result.integrated.setupRevenue, 0) }
})
test('setup and recurring qualification are independent and all revenue exclusions retain costs', () => {
  const parameters = p({ N: 2, existingRpmShare: 0, r: 0, f: 1, c: 1, o: 1, qB: 1, startMonth: 12, qualificationShare: 0, setupQualificationShare: 1, collectionShare: 1 })
  const setupOnly = expectedIntegrationStudy(parameters)
  near(setupOnly.integrated.monthlyRevenue, 0); near(setupOnly.integrated.setupRevenue, 43.42)
  const monthlyOnly = expectedIntegrationStudy({ ...parameters, qualificationShare: 1, setupQualificationShare: 0 })
  near(monthlyOnly.integrated.setupRevenue, 0); near(monthlyOnly.integrated.monthlyRevenue, 207.76)
  for (const exclusion of [{ reimbursementMode: 'none' }, { collectionShare: 0 }]) {
    const result = expectedIntegrationStudy({ ...parameters, ...exclusion })
    near(result.integrated.revenue, 0); near(result.integrated.setupRevenue, 0); near(result.integrated.monthlyRevenue, 0)
    near(result.integrated.programCost, setupOnly.integrated.programCost)
  }
})
test('cost components reconcile to hand calculation and platform licenses count once, without double loading', () => {
  const parameters = p({ N: 1, existingRpmShare: 0, r: 0, f: 1, c: 1, o: 1, qB: 1, startMonth: 12, clinicalMode: 'none', ...zeroCosts, pharmacistWage: 60, supportWage: 30, reviewMinutes: 12, offerMinutes: 6, offerSupportMinutes: 0, onboardingMinutes: 18, onboardingSupportMinutes: 0, monitorPharmacistMinutes: 30, monitorSupportMinutes: 12, qualifiedSupportMinutes: 0, deviceCost: 9, monthlyTechnologyCost: 4, monthlyConnectivityCost: 3, monthlyPlatformBaseCost: 7, platformProviderCount: 2, fixedCost: 11, addedFixedCost: 13 })
  const expectedCosts = { reviews: 12, offers: 6, supportOffers: 0, onboarding: 18, supportOnboarding: 0, pharmacistMonitoring: 30, technicalSupport: 6, physicianReferrals: 0, devices: 9, software: 4, connectivity: 3, platformBase: 168, otherFixed: 11, addedFixed: 13 }
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
test('pharmacist-heavy preset retains workload costs and uses Original Medicare clinic collections', () => {
  const prior = getIntegrationScenarios().find(s => s.id === 'evidence-20').inputs
  near(prior.pharmacistWage, 67.75 * 49.93 / 35.13); near(prior.supportWage, 22.41 * 49.93 / 35.13)
  assert.equal(prior.offerSupportMinutes, 0); assert.equal(prior.onboardingSupportMinutes, 0); assert.equal(prior.qualifiedSupportMinutes, 0)
  const expected = expectedIntegrationStudy(prior)
  near(expected.delta.monthlyRevenue, 34836.51899756204); near(expected.delta.setupRevenue, 1275.521336271)
  near(expected.delta.programCost, 52124.72780670952); near(expected.delta.netFinancialBenefit, -16012.687472876414)
  near(simulateIntegrationStudy(prior).actual.delta.netFinancialBenefit, -15767.15221467885)
  const ten = getIntegrationScenarios().find(s => s.id === 'evidence-10')
  near(getRpmPaymentSchedule(ten.inputs).monthlyBenchmark, 78.16)
  const nyu = getIntegrationScenarios().find(s => s.id === 'nyu-workload')
  near(nyu.inputs.monitorPharmacistMinutes, 58 + 1 / 3); assert.equal(getRpmPaymentSchedule(nyu.inputs).additionalUnits, 1)
})
test('version 5 exports retain provenance, clinic boundary and reject old or altered accounting', () => {
  const bundle = createIntegrationExport(simulateIntegrationStudy(p({ N: 20 })))
  assert.ok(bundle.metadata.financialEvidence.every(source => (source.url || source.reference) && source.accessedAt === '2026-10-25'))
  const allocation = bundle.metadata.financialEvidence.find(source => source.id === 'rpm-task-allocation')
  assert.equal(allocation.url, null); assert.match(allocation.reference, /RPM etc!B30:B31/)
  assert.match(allocation.description, /not staff headcount or all program work/)
  for (const wage of ['pharmacistWage', 'supportWage']) {
    assert.equal(bundle.metadata.evidence[wage].sourceNotes, null)
    assert.ok(bundle.metadata.evidence[wage].sources.includes('https://www.bls.gov/news.release/ocwage.t01.htm'))
    assert.ok(bundle.metadata.evidence[wage].sources.includes('https://www.bls.gov/news.release/ecec.t04.htm'))
  }
  assert.doesNotMatch(JSON.stringify(bundle.metadata), /Pro exp!|\$55|\$24 base/)
  near(bundle.metadata.medicare2026Fees.additional99458, 41.42)
  assert.match(integrationExportCsv(bundle), /cost_breakdown_json/)
  assert.match(integrationExportCsv(bundle), /qualifiedSetups/)
  assert.throws(() => verifyIntegrationExport({ ...bundle, schemaVersion: 1, modelVersion: '1.0.0' }), /Version 1.*cannot be replayed/)
  assert.throws(() => verifyIntegrationExport({ ...bundle, schemaVersion: 2, modelVersion: '2.0.0' }), /Version 2.*cannot be replayed/)
  assert.throws(() => verifyIntegrationExport({ ...bundle, modelVersion: '3.0.0' }), /Version 3\.0\.0.*cannot be replayed/)
  assert.throws(() => verifyIntegrationExport({ ...bundle, schemaVersion: 3, modelVersion: '3.1.0' }), /Version 3\.1\.0.*cannot be replayed.*financial boundary/)
  for (const mutate of [b => { b.actual.integrated.setupRevenue++ }, b => { b.expected.integrated.costBreakdown.platformBase++ }, b => { b.metadata.medicare2026Fees.setup99453++ }]) {
    const changed = structuredClone(bundle); mutate(changed); assert.throws(() => verifyIntegrationExport(changed), /exact replay/)
  }
  for (const overrides of [{ reimbursementMode: 'other' }, { setupQualificationShare: 1.01 }, { platformProviderCount: .5 }, { monthlyConnectivityCost: -1 }, { customSetupRevenueBenchmark: Infinity }]) assert.throws(() => simulateIntegrationStudy(p(overrides)), RangeError)
})

test('team defaults reallocate the same total workflow and retain pharmacist medication review', () => {
  near(defaults.pharmacistWage, 67.75 * 49.93 / 35.13); near(defaults.supportWage, 22.41 * 49.93 / 35.13)
  near(defaults.monitorPharmacistMinutes + defaults.monitorSupportMinutes, 30)
  near(defaults.offerMinutes + defaults.offerSupportMinutes, 5)
  near(defaults.onboardingMinutes + defaults.onboardingSupportMinutes, 20)
  near(defaults.monitorPharmacistMinutes / 30, .1); near(defaults.monitorSupportMinutes / 30, .9)
  near(defaults.offerSupportMinutes / defaults.offerMinutes, 9)
  near(defaults.onboardingSupportMinutes / defaults.onboardingMinutes, 9)
  near(defaults.monitorSupportMinutes - defaults.qualifiedSupportMinutes, 10)
  const prior = getIntegrationScenarios().find(s => s.id === 'evidence-20').inputs
  assert.equal(defaults.reviewMinutes, prior.reviewMinutes)
  const current = expectedIntegrationStudy()
  assert.ok(current.integrated.supportHours / current.integrated.pharmacistHours < 9, 'Pharmacist-only medication review makes the whole-program ratio different from the RPM task ratio.')
  const teamPreset = getIntegrationScenarios().find(s => s.id === 'team-90-10')
  assert.equal(teamPreset.name, '90% technician / 10% pharmacist RPM task allocation')
  assert.deepEqual(teamPreset.inputs, defaults)
  const former = expectedIntegrationStudy(prior)
  near(current.delta.pharmacistHours + current.delta.supportHours, former.delta.pharmacistHours + former.delta.supportHours)
  near(current.delta.reviews, former.delta.reviews); near(current.delta.newInitiations, former.delta.newInitiations)
  near(current.delta.revenue, former.delta.revenue)
  assert.ok(current.delta.programCost < former.delta.programCost)
})

test('only eligible support subset contributes clinical billing time without adding labor cost', () => {
  const team = p({ monitorPharmacistMinutes: 3, monitorSupportMinutes: 27, qualifiedSupportMinutes: 17 })
  const eligible = expectedIntegrationStudy(team)
  const excluded = expectedIntegrationStudy({ ...team, qualifiedSupportMinutes: 0 })
  const payment = getRpmPaymentSchedule(team)
  near(payment.qualifyingClinicalMinutes, 20); assert.equal(payment.managementCode, '99457'); near(payment.monthlyBenchmark, 103.88)
  const noClinicalSupport = getRpmPaymentSchedule({ ...team, qualifiedSupportMinutes: 0 })
  near(noClinicalSupport.qualifyingClinicalMinutes, 3); assert.equal(noClinicalSupport.managementCode, null); near(noClinicalSupport.monthlyBenchmark, 52.11)
  for (const arm of ['baseline', 'integrated', 'delta']) {
    near(eligible[arm].programCost, excluded[arm].programCost)
    near(eligible[arm].pharmacistHours, excluded[arm].pharmacistHours)
    near(eligible[arm].supportHours, excluded[arm].supportHours)
    assert.deepEqual(eligible[arm].costBreakdown, excluded[arm].costBreakdown)
  }
  assert.ok(validateIntegrationInputs({ ...team, qualifiedSupportMinutes: 28 }).qualifiedSupportMinutes)
  assert.throws(() => simulateIntegrationStudy({ ...team, qualifiedSupportMinutes: 28 }), /subset/)
  assert.equal(getRpmPaymentSchedule({ ...team, monitorSupportMinutes: 7, qualifiedSupportMinutes: 7 }).managementCode, '99470')
  assert.equal(getRpmPaymentSchedule({ ...team, monitorSupportMinutes: 37, qualifiedSupportMinutes: 37 }).additionalUnits, 1)
})

test('delegated outreach and onboarding costs occur once and reconcile with total role hours', () => {
  const parameters = p({ N: 1, existingRpmShare: 0, r: 1, qA: 1, f: 1, c: 1, o: 1, qB: 1, startMonth: 12, monthlyRetention: 1, ...zeroCosts, pharmacistWage: 60, supportWage: 30 })
  const run = simulateIntegrationStudy(parameters)
  for (const result of [run.expected, run.actual]) {
    near(result.integrated.duplicateOffers, 1)
    for (const arm of [result.baseline, result.integrated]) {
      near(arm.costBreakdown.onboarding, 2); near(arm.costBreakdown.supportOnboarding, 9)
      near(arm.costBreakdown.pharmacistMonitoring, 3); near(arm.costBreakdown.technicalSupport, 13.5)
      near(arm.programCost, arm.pharmacistHours * 60 + arm.supportHours * 30)
      near(Object.values(arm.costBreakdown).reduce((sum, value) => sum + value, 0), arm.programCost)
    }
    near(result.integrated.costBreakdown.reviews, 10)
    near(result.integrated.costBreakdown.offers, .5); near(result.integrated.costBreakdown.supportOffers, 2.25)
    near(result.integrated.supportHours * 60, 49.5)
    near(result.delta.costBreakdown.supportOnboarding, 0)
  }
  const existing = expectedIntegrationStudy({ ...parameters, existingRpmShare: 1 })
  near(existing.integrated.costBreakdown.onboarding, 0); near(existing.integrated.costBreakdown.supportOnboarding, 0)
  near(existing.integrated.costBreakdown.offers, 0); near(existing.integrated.costBreakdown.supportOffers, 0)
  const failed = expectedIntegrationStudy({ ...parameters, r: 0, qB: 0 })
  near(failed.integrated.costBreakdown.supportOffers, 2.25); near(failed.integrated.costBreakdown.supportOnboarding, 0)
})

test('task allocation changes finances but preserves paired patient draws and clinical outcomes', () => {
  const team = simulateIntegrationStudy()
  const prior = simulateIntegrationStudy(getIntegrationScenarios().find(s => s.id === 'evidence-20').inputs)
  const paths = run => run.patients.map(patient => [patient.id, patient.existingRpm, patient.physician, patient.pharmacist, patient.additionalInitiation, ...['baseline', 'integrated'].map(arm => [patient[arm].activeMonths, patient[arm].qualifiedMonths, patient[arm].qualifiedSetups, patient[arm].clinical])])
  assert.deepEqual(paths(team), paths(prior))
  assert.equal(team.actual.delta.newInitiations, 85)
  assert.deepEqual(team.actual.delta.clinical, { actions: 6, sustainedAt12Months: 2, medicationMonths: 26 })
})

test('confirmed vendor package replaces component charges without duplicating devices or connectivity', () => {
  near(defaults.deviceCost, 90); near(defaults.monthlyTechnologyCost, 12)
  near(defaults.monthlyConnectivityCost, 0); near(defaults.monthlyPlatformBaseCost, 0)
  const inputs = p({ N: 1, existingRpmShare: 0, r: 1, qA: 1, f: 1, c: 1, o: 1, qB: 1, startMonth: 12, monthlyRetention: 1, ...zeroCosts, deviceCost: defaults.deviceCost, monthlyTechnologyCost: defaults.monthlyTechnologyCost })
  const run = simulateIntegrationStudy(inputs)
  for (const result of [run.expected, run.actual]) for (const arm of [result.baseline, result.integrated]) {
    near(arm.costBreakdown.devices, 90); near(arm.costBreakdown.software, 12)
    near(arm.costBreakdown.connectivity, 0); near(arm.costBreakdown.platformBase, 0)
    near(arm.programCost, 102)
  }
  const existing = expectedIntegrationStudy({ ...inputs, existingRpmShare: 1 })
  near(existing.baseline.costBreakdown.devices, 0); near(existing.baseline.programCost, 144)
  const component = getIntegrationScenarios().find(s => s.id === 'team-published-vendor-costs').inputs
  near(component.deviceCost, 99.95); near(component.monthlyTechnologyCost, 15)
  near(component.monthlyConnectivityCost, 5); near(component.monthlyPlatformBaseCost, 299)
  near(component.pharmacistWage, defaults.pharmacistWage); near(component.supportWage, defaults.supportWage)
  assert.equal(component.qualifiedSupportMinutes, 17)
})


test('Original Medicare clinic defaults apply qualification and all-in collections without a payer reduction', () => {
  assert.equal(defaults.perspective, 'clinic')
  assert.equal('externalPayerShare' in defaults, false)
  assert.equal('retainedDrugSavingsShare' in defaults, false)
  near(defaults.qualificationShare, .7); near(defaults.setupQualificationShare, .7); near(defaults.collectionShare, .9)
  const run = simulateIntegrationStudy()
  const schedule = getRpmPaymentSchedule()
  near(schedule.monthlyBenchmark, 103.88)
  near(schedule.monthlyBenchmark * defaults.qualificationShare * defaults.collectionShare, 65.4444)
  near(schedule.setupFee * defaults.setupQualificationShare * defaults.collectionShare, 13.6773)
  for (const basis of [run.expected, run.actual]) for (const arm of [basis.baseline, basis.integrated, basis.delta]) {
    near(arm.monthlyRevenue, arm.qualifiedMonths * 103.88 * .9)
    near(arm.setupRevenue, arm.qualifiedSetups * 21.71 * .9)
    near(arm.netFinancialBenefit, arm.revenue - arm.programCost)
  }
  near(run.expected.delta.revenue, 36112.04033383303)
  near(run.expected.delta.programCost, 34505.64023729472)
  near(run.expected.delta.netFinancialBenefit, 1606.4000965382656)
  near(run.actual.delta.netFinancialBenefit, 171.6763556314654)
  for (const scenario of getIntegrationScenarios()) {
    assert.equal(scenario.inputs.perspective, 'clinic')
    assert.equal('externalPayerShare' in scenario.inputs, false)
    assert.equal('retainedDrugSavingsShare' in scenario.inputs, false)
    assert.doesNotMatch(scenario.name, /external receipts|external reimbursement/i)
    assert.deepEqual(validateIntegrationInputs(scenario.inputs), {})
  }
  assert.equal(getIntegrationScenarios().filter(s => s.inputs.reimbursementMode === 'none').length, 1)
})

test('unknown clinical outcomes never suppress clinic surplus in patient histories or summaries', () => {
  const reference = simulateIntegrationStudy()
  for (const overrides of [{ clinicalMode: 'unestimated' }, { persistence12: null }]) {
    const run = simulateIntegrationStudy(p(overrides))
    for (const key of ['expected', 'actual']) for (const arm of ['baseline', 'integrated', 'delta']) {
      assert.equal(run[key][arm].drugSavings, null)
      assert.equal(run[key][arm].clinical.actions, null)
      near(run[key][arm].netFinancialBenefit, reference[key][arm].netFinancialBenefit)
      near(run[key][arm].operatingMargin, reference[key][arm].operatingMargin)
    }
    run.patients.forEach((patient, i) => {
      for (const arm of ['baseline', 'integrated']) {
        assert.equal(patient[arm].drugSavings, null)
        near(patient[arm].netFinancialBenefit, reference.patients[i][arm].netFinancialBenefit)
      }
    })
    assert.deepEqual(verifyIntegrationExport(createIntegrationExport(run)).inputs, run.inputs)
  }
})

test('HealthPartners stages use their study denominators without legacy review/offer multipliers', () => {
  const hp = p({ N: 1000, recruitmentMode: 'healthpartners', existingRpmShare: 0, r: 0, f: .5, c: 0, o: 0, qB: 0, clinicalMode: 'none' })
  const e = expectedIntegrationStudy(hp)
  near(e.integrated.outreachContacts, 500)
  near(e.integrated.intakeAttendees, 500 * 385 / 1423)
  near(e.integrated.reviews, e.integrated.intakeAttendees)
  near(e.integrated.offers, e.integrated.intakeAttendees)
  near(e.integrated.newInitiations, 500 * 385 / 1423 * .8)
  assert.deepEqual(expectedIntegrationStudy({ ...hp, c: 1, o: 1, qB: 1, reviewMinutes: 240 }), e)
})

test('HealthPartners costs every targeted outreach and every attended intake, including nonactivators', () => {
  const hp = p({ N: 10, recruitmentMode: 'healthpartners', existingRpmShare: 0, r: 0, f: 1, intakeAttendance: .5, activationAfterIntake: 0, intakeMinutes: 60, ...zeroCosts, pharmacistWage: 60, supportWage: 30, offerMinutes: 1, offerSupportMinutes: 4, reviewMinutes: 240, clinicalMode: 'none' })
  const e = expectedIntegrationStudy(hp)
  near(e.integrated.newInitiations, 0); near(e.integrated.reviews, 5)
  near(e.integrated.costBreakdown.reviews, 300)
  near(e.integrated.costBreakdown.offers, 10); near(e.integrated.costBreakdown.supportOffers, 20)
  near(e.integrated.programCost, 330)
  near(e.integrated.pharmacistHours * 60, 310)
  near(e.integrated.supportHours * 60, 40)
  const noAttendees = expectedIntegrationStudy({ ...hp, intakeAttendance: 0 })
  near(noAttendees.integrated.programCost, 30)
})

test('HealthPartners additional starts include intake education once and preserve usual onboarding', () => {
  const hp = p({ N: 1, recruitmentMode: 'healthpartners', existingRpmShare: 0, r: 0, f: 1, intakeAttendance: 1, activationAfterIntake: 1, intakeMinutes: 60, monthlyRetention: 1, startMonth: 12, setupQualificationShare: 1, ...zeroCosts, pharmacistWage: 60, supportWage: 30, deviceCost: 90 })
  for (const result of [expectedIntegrationStudy(hp), simulateIntegrationStudy(hp).actual]) {
    near(result.integrated.costBreakdown.reviews, 60)
    near(result.integrated.costBreakdown.onboarding, 0); near(result.integrated.costBreakdown.supportOnboarding, 0)
    near(result.integrated.costBreakdown.devices, 90); near(result.integrated.qualifiedSetups, 1)
    near(result.integrated.programCost, result.integrated.pharmacistHours * 60 + result.integrated.supportHours * 30 + 90)
  }
  const duplicate = simulateIntegrationStudy({ ...hp, r: 1, qA: 1 })
  for (const result of [duplicate.expected, duplicate.actual]) {
    near(result.delta.newInitiations, 0); near(result.integrated.duplicateOffers, 1)
    near(result.baseline.costBreakdown.onboarding, 2); near(result.integrated.costBreakdown.onboarding, 2)
    near(result.baseline.costBreakdown.supportOnboarding, 9); near(result.integrated.costBreakdown.supportOnboarding, 9)
    near(result.delta.setupRevenue, 0); near(result.delta.costBreakdown.devices, 0)
  }
})

test('MINOR reports patient-level 45-day outcomes without low-BP multiplication or assumed annual savings', () => {
  const minor = p({ N: 161, existingRpmShare: 1, monthlyRetention: 1, f: 1, c: 1, clinicalMode: 'minor', minorEligibleShare: 1, minorExtrapolation: 'off', lowBpShare: 0, actionBaseline: null, actionIntegrated: null, persistence12: null, drugCostPerMonth: null })
  const e = expectedIntegrationStudy(minor)
  near(e.baseline.clinical.actions, 11); near(e.integrated.clinical.actions, 31); near(e.delta.clinical.actions, 20)
  assert.deepEqual(expectedIntegrationStudy({ ...minor, lowBpShare: 1 }), e)
  for (const result of [e, simulateIntegrationStudy(minor).actual]) for (const arm of ['baseline', 'integrated', 'delta']) {
    assert.equal(result[arm].clinical.sustainedAt12Months, null)
    assert.equal(result[arm].clinical.medicationMonths, null)
    assert.equal(result[arm].drugSavings, null)
    assert.ok(Number.isFinite(result[arm].netFinancialBenefit))
  }
  const someReviewed = expectedIntegrationStudy({ ...minor, f: .8, c: .5, minorEligibleShare: .5 })
  near(someReviewed.baseline.clinical.actions, 5.5)
  near(someReviewed.integrated.clinical.actions, 9.5)
  near(expectedIntegrationStudy({ ...minor, minorEligibleShare: 0 }).integrated.clinical.actions, 0)
})

test('MINOR optional persistence starts after the 45-day assessment and respects the budget boundary', () => {
  const minor = p({ N: 1, existingRpmShare: 1, monthlyRetention: 1, f: 1, c: 1, clinicalMode: 'minor', minorEligibleShare: 1, minorActionBaseline: 0, minorActionIntegrated: 1, minorExtrapolation: 'assumed', persistence12: 1, drugCostPerMonth: 10 })
  for (const [startMonth, medicineMonths] of [[1, 10], [9, 2], [11, 0], [12, 0]]) {
    const run = simulateIntegrationStudy({ ...minor, startMonth })
    for (const result of [run.expected, run.actual]) {
      near(result.integrated.clinical.actions, 1)
      near(result.integrated.clinical.sustainedAt12Months, 1)
      near(result.integrated.clinical.medicationMonths, medicineMonths)
      near(result.integrated.drugSavings, medicineMonths * 10)
    }
    assert.equal(run.patients[0].integrated.clinicalAssessmentMonth, startMonth + 2)
    const off = expectedIntegrationStudy({ ...minor, startMonth, minorExtrapolation: 'off' })
    near(off.delta.netFinancialBenefit, run.expected.delta.netFinancialBenefit)
  }
  const unknownPersistence = expectedIntegrationStudy({ ...minor, persistence12: null })
  near(unknownPersistence.integrated.clinical.actions, 1)
  assert.equal(unknownPersistence.integrated.clinical.sustainedAt12Months, null)
  const unknownDrugCost = expectedIntegrationStudy({ ...minor, drugCostPerMonth: null })
  near(unknownDrugCost.integrated.clinical.sustainedAt12Months, 1)
  assert.equal(unknownDrugCost.integrated.drugSavings, null)
})

test('HealthPartners plus MINOR paired simulations converge to analytic counts and surplus', () => {
  const inputs = { ...getIntegrationScenarios().find(s => s.id === 'healthpartners-minor').inputs, N: 300, recontactUptake: .2 }
  const expected = expectedIntegrationStudy(inputs)
  const read = row => [row.integrated.intakeAttendees, row.integrated.newInitiations, row.delta.netFinancialBenefit, row.integrated.clinical.actions, row.delta.clinical.actions]
  const targets = read(expected); const values = targets.map(() => [])
  for (let seed = 0; seed < 100; seed++) {
    const run = simulateIntegrationStudy({ ...inputs, seed })
    read(run.actual).forEach((value, i) => values[i].push(value))
    assert.ok(run.patients.every(patient => !patient.baseline.participating || patient.integrated.participating))
    assert.equal(run.actual.delta.newInitiations, run.patients.filter(patient => patient.additionalInitiation).length)
  }
  values.forEach((sample, i) => {
    const mean = sample.reduce((sum, value) => sum + value, 0) / sample.length
    const variance = sample.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (sample.length - 1)
    near(mean, targets[i], 6 * Math.sqrt(variance / sample.length) + 1e-7)
  })
})

test('HealthPartners no-added-recruitment retains work and threshold varies intake attendance', () => {
  const inputs = getIntegrationScenarios().find(s => s.id === 'healthpartners-minor').inputs
  const noRecruitment = getIntegrationScenarios({ ...inputs, recontactUptake: .8 }).find(s => s.id === 'no-added-recruitment').inputs
  const result = expectedIntegrationStudy(noRecruitment)
  near(result.delta.newInitiations, 0)
  near(result.integrated.intakeAttendees, expectedIntegrationStudy(inputs).integrated.intakeAttendees)
  assert.ok(result.delta.programCost > 0)
  const thresholdInputs = p({ N: 10, recruitmentMode: 'healthpartners', existingRpmShare: 0, r: 0, f: 1, activationAfterIntake: 1, intakeMinutes: 60, startMonth: 12, ...zeroCosts, pharmacistWage: 60, offerMinutes: 0, offerSupportMinutes: 0, monitorPharmacistMinutes: 0, monitorSupportMinutes: 0, qualifiedSupportMinutes: 0, addedFixedCost: 200, reimbursementMode: 'custom', monthlyRevenueBenchmark: 100, setupQualificationShare: 0, qualificationShare: 1, collectionShare: 1 })
  const threshold = findOfferThreshold(thresholdInputs)
  assert.equal(threshold.parameter, 'intakeAttendance'); assert.equal(threshold.label, 'Completed pharmacist intake')
  near(threshold.rate, .5, 1e-6)
})

test('study presets restore cited numbers and version 5 exports record stages, endpoints and extrapolation', () => {
  const changed = p({ intakeAttendance: .9, activationAfterIntake: .1, intakeMinutes: 5, minorActionBaseline: .5, minorActionIntegrated: .9, minorEligibleShare: .5, minorExtrapolation: 'assumed' })
  const preset = getIntegrationScenarios(changed).find(s => s.id === 'healthpartners-minor').inputs
  near(preset.intakeAttendance, 385 / 1423); near(preset.activationAfterIntake, .8); near(preset.intakeMinutes, 60)
  near(preset.minorActionBaseline, 11 / 161); near(preset.minorActionIntegrated, 31 / 161)
  near(preset.minorEligibleShare, 1); assert.equal(preset.minorExtrapolation, 'off')
  const bundle = createIntegrationExport(simulateIntegrationStudy({ ...preset, N: 40 }))
  assert.deepEqual(verifyIntegrationExport(JSON.parse(JSON.stringify(bundle))), bundle)
  assert.equal(bundle.metadata.recruitmentEvidence[0].intakeDenominator, 1423)
  assert.equal(bundle.metadata.clinicalEvidence[0].endpointDays, 45)
  assert.ok(bundle.metadata.evidence.minorActionIntegrated.sources.includes('https://www.sciencedirect.com/science/article/pii/S0149291823002035'))
  assert.match(integrationExportCsv(bundle), /intakeAttendees/)
  assert.match(integrationExportCsv(bundle), /minorExtrapolation/)
  assert.throws(() => verifyIntegrationExport({ ...bundle, schemaVersion: 4, modelVersion: '4.0.0' }), /Version 4.0.0.*cannot be replayed/)
  for (const key of ['intakeAttendance', 'activationAfterIntake', 'minorEligibleShare', 'minorActionIntegrated']) assert.throws(() => simulateIntegrationStudy({ ...preset, [key]: 1.1 }), RangeError)
  assert.throws(() => simulateIntegrationStudy({ ...preset, minorExtrapolation: 'yes' }), RangeError)
})


test('isolated study presets restore intended modules while preserving clinic and financial assumptions', () => {
  const inputs = p({ recruitmentMode: 'healthpartners', clinicalMode: 'minor', intakeAttendance: .9, activationAfterIntake: .1, intakeMinutes: 5, c: .1, o: .2, qB: .3, minorActionBaseline: .5, minorActionIntegrated: .9, minorEligibleShare: .5, minorExtrapolation: 'assumed', f: .7, collectionShare: .83, deviceCost: 120, pharmacistWage: 105 })
  const presets = getIntegrationScenarios(inputs)
  const hp = presets.find(s => s.id === 'healthpartners').inputs
  assert.equal(hp.recruitmentMode, 'healthpartners'); assert.equal(hp.clinicalMode, 'unestimated')
  near(hp.intakeAttendance, 385 / 1423); near(hp.activationAfterIntake, .8); near(hp.intakeMinutes, 60)
  const minor = presets.find(s => s.id === 'minor').inputs
  assert.equal(minor.recruitmentMode, 'mtm-offer'); assert.equal(minor.clinicalMode, 'minor'); assert.equal(minor.minorExtrapolation, 'off')
  near(minor.c, defaults.c); near(minor.o, defaults.o); near(minor.qB, defaults.qB)
  near(minor.minorActionBaseline, 11 / 161); near(minor.minorActionIntegrated, 31 / 161)
  const extension = presets.find(s => s.id === 'minor-extension').inputs
  assert.equal(extension.recruitmentMode, 'healthpartners'); assert.equal(extension.clinicalMode, 'minor'); assert.equal(extension.minorExtrapolation, 'assumed')
  near(extension.intakeAttendance, 385 / 1423); near(extension.activationAfterIntake, .8); near(extension.intakeMinutes, 60)
  near(extension.minorActionBaseline, 11 / 161); near(extension.minorActionIntegrated, 31 / 161); near(extension.persistence12, .694)
  for (const preset of [hp, minor, extension]) {
    near(preset.f, .7); near(preset.collectionShare, .83); near(preset.deviceCost, 120); near(preset.pharmacistWage, 105)
  }
})
