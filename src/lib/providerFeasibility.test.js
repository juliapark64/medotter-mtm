import test from 'node:test'
import assert from 'node:assert/strict'
import { getProviderInputs, SETTING_FIELDS } from '../data/providerDefaults.js'
import { getBaseInputs } from '../data/calculatorDefaults.js'
import { calculateProjection } from './valueCalculator.js'
import { calculateProviderComparison, providerLoadedWage } from './providerFeasibility.js'
import { createProviderBundle, verifyProviderBundle, providerBundleToCsv } from './providerExports.js'
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, a + ' != ' + b)
const scenario = (inputs, id) => calculateProviderComparison(inputs).scenarios.find(s => s.id === id)
function simple() {
  const inputs = getProviderInputs()
  Object.assign(inputs.common, { annualEnrollment: 100, rpmShare: 0, reviewBenchmark: 100, reviewCharge: 100, paidClaimShare: 1, patientCollection: .5 })
  for (const values of Object.values(inputs.settings)) {
    for (const key of Object.keys(SETTING_FIELDS)) values[key] = 0
    Object.assign(values, { pharmacistRate: 60, wageYearFactor: 1, productiveShare: 1, reviewReceiptRealization: 1, rpmManagementThreshold: 20,
      reviewMinutes: 30, annualFixedCost: 1000, startupCost: 300,
      currentReviewShare: .5, currentReviewReceipt: 80, actReviewShare: .25, billingCost: 2 })
  }
  return inputs
}

test('evidence defaults differ by setting while six scenarios share clinical volumes and preserve inputs', () => {
  const inputs = getProviderInputs(), before = structuredClone(inputs)
  const result = calculateProviderComparison(inputs)
  assert.equal(result.isComplete, true); assert.equal(result.scenarios.length, 6)
  for (const policy of ['current', 'act', 'none']) {
    const a = scenario(inputs, 'pharmacy-' + policy), b = scenario(inputs, 'clinic-' + policy)
    assert.notEqual(a.cumulative.staffCost, b.cumulative.staffCost)
    assert.notEqual(a.cumulative.margin, b.cumulative.margin)
    if (policy !== 'none') assert.notEqual(a.cumulative.revenue, b.cumulative.revenue)
  }
  for (const s of result.scenarios) assert.deepEqual(s.years.map(y => y.newStops), result.scenarios[0].years.map(y => y.newStops))
  assert.deepEqual(inputs, before)
})
test('identical contract-mode inputs still produce identical finances: no hidden setting bonus', () => {
  const inputs = simple()
  for (const policy of ['current', 'act', 'none']) assert.deepEqual(scenario(inputs, 'pharmacy-' + policy).years, scenario(inputs, 'clinic-' + policy).years)
})
test('base wages are loaded once with explicit price-year and productivity assumptions', () => {
  const inputs = getProviderInputs()
  near(providerLoadedWage(inputs.settings.pharmacy), 78.143)
  near(providerLoadedWage(inputs.settings.clinic), 104.793)
  Object.assign(inputs.settings.pharmacy, { wageYearFactor: 1.1, employmentLoad: .25, productiveShare: .8 })
  near(providerLoadedWage(inputs.settings.pharmacy), 60.11 * 1.1 * 1.25 / .8)
  const row = scenario(inputs, 'pharmacy-current').years[0]
  near(row.staffCost, row.pharmacistHours * providerLoadedWage(inputs.settings.pharmacy) + row.supportHours * inputs.settings.pharmacy.supportRate)
})
test('benchmark RPM uses qualifying units, separate collections, once-only setup and per-code billing costs', () => {
  const inputs = simple()
  Object.assign(inputs.common, { rpmShare: 1, rpmDurationMonths: 2, rpmDropoutRate: 0 })
  Object.assign(inputs.settings.clinic, { currentReviewShare: 0, rpmPaymentBasis: 1, currentRpmShare: .5,
    rpmSetupShare: .5, rpmDeviceShare: 1, rpmManagementShare: .5, rpmPharmacistMinutes: 20,
    currentPaidClaimShare: .9, currentPatientCollection: .5, currentRpmReceipt: 999 })
  const row = scenario(inputs, 'clinic-current').years[0]
  near(row.rpmSetupUnits, 25); near(row.rpmDeviceUnits, 100); near(row.rpmManagementUnits, 50)
  const allowed = 25 * 21.71 + 100 * 52.11 + 50 * 51.77
  near(row.currentRpmAllowedCharges, allowed)
  near(row.currentRpmMedicareRevenue, allowed * .9 * .8)
  near(row.currentRpmPatientRevenue, allowed * .9 * .2 * .5)
  near(row.currentRpmRevenue, allowed * .81)
  near(row.currentContractRpmRevenue, 0); near(row.claimCost, 175 * 2)
  // Increasing the episode duration changes recurring codes, not setup counts.
  inputs.common.rpmDurationMonths = 4
  near(scenario(inputs, 'clinic-current').years[0].rpmSetupUnits, 25)
  inputs.common.rpmDropoutRate = 1
  near(scenario(inputs, 'clinic-current').years[0].currentRpmRevenue, 0)
})
test('10-minute management replaces 20-minute code and technical support cannot satisfy clinical threshold', () => {
  const inputs = getProviderInputs()
  inputs.settings.clinic.rpmPharmacistMinutes = 10
  assert.equal(calculateProviderComparison(inputs).isComplete, false)
  inputs.settings.clinic.rpmSupportMinutes = 100
  assert.equal(calculateProviderComparison(inputs).isComplete, false)
  inputs.settings.clinic.rpmManagementThreshold = 10
  const row = scenario(inputs, 'clinic-current').years[0]
  near(row.currentRpmAllowedCharges, row.rpmSetupUnits * 21.71 + row.rpmDeviceUnits * 52.11 + row.rpmManagementUnits * 26.05)
  inputs.settings.clinic.rpmManagementShare = 0
  inputs.settings.clinic.rpmPharmacistMinutes = 0
  assert.equal(calculateProviderComparison(inputs).isComplete, true)
})
test('eligible clinical staff can share management time without counting technical support twice', () => {
  const inputs = getProviderInputs()
  const before = scenario(inputs, 'clinic-current').years[0]
  Object.assign(inputs.settings.clinic, { rpmPharmacistMinutes: 10, rpmClinicalStaffMinutes: 10, clinicalStaffRate: 40 })
  const after = scenario(inputs, 'clinic-current').years[0]
  near(after.rpmManagementUnits, before.rpmManagementUnits)
  near(after.revenue, before.revenue)
  near(after.rpmClinicalStaffHours, before.rpmMonths * 10 / 60)
  near(after.pharmacistHours, before.pharmacistHours - before.rpmMonths * 10 / 60)
  near(after.supportHours, before.supportHours)
  near(before.staffCost - after.staffCost, before.rpmMonths * 10 / 60 * (104.793 - 40))
  inputs.settings.clinic.rpmClinicalStaffMinutes = 9
  assert.equal(calculateProviderComparison(inputs).isComplete, false)
})
test('workload and cost audit components sum once, with a transparent default annual workload', () => {
  const inputs = getProviderInputs()
  for (const s of calculateProviderComparison(inputs).scenarios) for (const row of [...s.years, s.cumulative]) {
    near(row.pharmacistHours, row.reviewPharmacistHours + row.rpmOnboardingPharmacistHours + row.rpmManagementPharmacistHours)
    near(row.staffCost, row.reviewStaffCost + row.rpmPharmacistCost + row.rpmClinicalStaffCost + row.supportStaffCost)
    near(row.totalCost, row.staffCost + row.deviceCost + row.technologyCost + row.claimCost + row.dispensingLoss + row.fixedCost)
  }
  const row = scenario(inputs, 'clinic-current').years[0]
  near(row.reviewPharmacistHours, 200 * 40 / 60)
  near(row.rpmOnboardingPharmacistHours, 100 * 10 / 60)
  near(row.rpmManagementPharmacistHours, 194.82327560409706)
  near(row.pharmacistHours, 344.8232756040971)
  near(scenario(inputs, 'clinic-current').cumulative.margin, -76456.12312188676)
  near(scenario(inputs, 'pharmacy-current').cumulative.margin, -56507.24192070124)
})
test('a 10-minute sensitivity reduces both clinical time costs and management-code revenue', () => {
  const inputs = getProviderInputs()
  const base = scenario(inputs, 'clinic-current').cumulative
  Object.assign(inputs.settings.clinic, { rpmPharmacistMinutes: 10, rpmManagementThreshold: 10 })
  const lower = scenario(inputs, 'clinic-current').cumulative
  assert.ok(lower.staffCost < base.staffCost)
  assert.ok(lower.revenue < base.revenue)
  near(lower.margin, -77003.47443893786)
})
test('contract pathway replaces benchmark receipts and pharmacy does not claim direct Medicare RPM', () => {
  const inputs = getProviderInputs()
  assert.ok(scenario(inputs, 'pharmacy-current').years[0].currentContractRpmRevenue > 0)
  Object.assign(inputs.settings.clinic, { rpmPaymentBasis: 0, currentRpmReceipt: 30 })
  const row = scenario(inputs, 'clinic-current').years[0]
  near(row.currentRpmRevenue, row.rpmMonths * 30)
  near(row.currentRpmAllowedCharges, 0); near(row.rpmSetupUnits, 0)
  inputs.settings.pharmacy.rpmPaymentBasis = 1
  assert.equal(calculateProviderComparison(inputs).isComplete, false)
})
test('CDTA contract allocates collected benchmarks once and invoices separately from partner CPT claims', () => {
  const inputs = simple()
  Object.assign(inputs.common, { annualEnrollment: 10, rpmShare: 1, rpmDurationMonths: 2, rpmDropoutRate: 0 })
  Object.assign(inputs.settings.pharmacy, { currentReviewShare: 0, rpmPaymentBasis: 2, currentRpmShare: 1,
    rpmSetupShare: 1, rpmDeviceShare: .5, rpmManagementShare: 1, rpmPharmacistMinutes: 20,
    currentPaidClaimShare: .9, currentPatientCollection: .5, rpmContractRetainedShare: .8, currentRpmReceipt: 999 })
  let row = scenario(inputs, 'pharmacy-current').years[0]
  const allowed = 10 * 21.71 + 10 * 52.11 + 20 * 51.77
  const collected = allowed * .9 * (.8 + .2 * .5)
  near(row.currentRpmAllowedCharges, allowed)
  near(row.rpmBillingPracticeReceipts, collected)
  near(row.currentContractRpmRevenue, collected * .8)
  near(row.rpmPartnerRetainedRevenue, collected * .2)
  near(row.currentRpmRevenue, collected * .8)
  near(row.currentRpmMedicareRevenue, 0); near(row.currentRpmPatientRevenue, 0)
  near(row.currentBilledUnits, 20); near(row.claimCost, 40)
  near(row.margin, collected * .8 - row.totalCost)
  near(row.totalCost, row.staffCost + row.deviceCost + row.technologyCost + row.claimCost + row.fixedCost)
  const cost = row.totalCost
  for (const retained of [0, .5, 1]) {
    inputs.settings.pharmacy.rpmContractRetainedShare = retained
    row = scenario(inputs, 'pharmacy-current').years[0]
    near(row.currentRpmRevenue, collected * retained)
    near(row.currentRpmRevenue + row.rpmPartnerRetainedRevenue, collected)
    near(row.totalCost, cost)
  }
  inputs.settings.pharmacy.currentRpmShare = 0
  row = scenario(inputs, 'pharmacy-current').years[0]
  near(row.rpmBillingPracticeReceipts, 0); near(row.currentRpmRevenue, 0); near(row.claimCost, 0)
})
test('CDTA contract qualification follows clinical time and alternative code without adding fixed receipts', () => {
  const inputs = getProviderInputs()
  inputs.settings.pharmacy.currentRpmReceipt = 10000 // inactive mode must never add this payment
  inputs.settings.pharmacy.rpmPharmacistMinutes = 10
  assert.equal(calculateProviderComparison(inputs).isComplete, false)
  inputs.settings.pharmacy.rpmManagementThreshold = 10
  const row = scenario(inputs, 'pharmacy-current').years[0]
  near(row.currentContractRpmRevenue, (row.rpmSetupUnits * 21.71 + row.rpmDeviceUnits * 52.11 + row.rpmManagementUnits * 26.05) * .9 * (.8 + .2 * .8) * .8)
  inputs.settings.pharmacy.rpmPaymentBasis = 0
  near(scenario(inputs, 'pharmacy-current').years[0].currentRpmRevenue, row.rpmMonths * 10000)
  near(scenario(inputs, 'pharmacy-current').years[0].rpmPartnerRetainedRevenue, 0)
})
test('paid RPM baseline and Act share the same RPM receipts, with no hidden second payment', () => {
  const inputs = getProviderInputs()
  for (const setting of ['pharmacy', 'clinic']) {
    assert.equal(inputs.settings[setting].currentRpmShare, 1)
    near(scenario(inputs, setting + '-act').cumulative.currentRpmRevenue, scenario(inputs, setting + '-current').cumulative.currentRpmRevenue)
    const none = scenario(inputs, setting + '-none').cumulative
    near(none.rpmBillingPracticeReceipts, 0); near(none.rpmPartnerRetainedRevenue, 0); near(none.currentContractRpmRevenue, 0)
  }
  inputs.settings.pharmacy.rpmContractRetainedShare = 1.01
  assert.equal(calculateProviderComparison(inputs).isComplete, false)
})
test('hand-worked provider receipts use disjoint current and Act units, including 80/20 collections and lower-charge cap', () => {
  const inputs = simple()
  const current = scenario(inputs, 'pharmacy-current').years[0]
  near(current.revenue, 4000); near(current.staffCost, 3000); near(current.claimCost, 100); near(current.fixedCost, 1300); near(current.margin, -400)
  const act = scenario(inputs, 'pharmacy-act').years[0]
  // 25 previously unpaid reviews, allowed $85, Medicare $68 plus $8.50 collected patient share.
  near(act.actMedicareRevenue, 1700); near(act.actPatientRevenue, 212.5)
  near(act.revenue, 5912.5); near(act.claimCost, 150); near(act.margin, 1462.5)
  inputs.common.reviewCharge = 60
  near(scenario(inputs, 'pharmacy-act').years[0].actRevenue, 25 * 60 * .9)
  inputs.common.paidClaimShare = 0
  const failed = scenario(inputs, 'pharmacy-act').years[0]
  near(failed.actRevenue, 0); near(failed.claimCost, 150)
})
test('no added reimbursement retains service delivery and fixed costs but removes claim and Act-specific costs', () => {
  const inputs = getProviderInputs()
  for (const setting of ['pharmacy', 'clinic']) {
    const none = scenario(inputs, setting + '-none'), current = scenario(inputs, setting + '-current')
    for (let i = 0; i < 3; i++) {
    const row = none.years[i]
    assert.equal(row.revenue, 0); assert.equal(row.claimCost, 0)
    for (const key of ['staffCost', 'deviceCost', 'technologyCost', 'fixedCost', 'pharmacistHours', 'supportHours']) assert.equal(row[key], current.years[i][key])
    assert.equal(row.margin, -row.totalCost)
    }
  }
})
test('Act implementation timing preserves current contracts until activation and charges setup exactly once', () => {
  const inputs = simple()
  Object.assign(inputs.common, { actStartYear: 2 })
  Object.assign(inputs.settings.pharmacy, { actStartupCost: 300, actAnnualCost: 100 })
  const act = scenario(inputs, 'pharmacy-act'), current = scenario(inputs, 'pharmacy-current')
  assert.deepEqual(act.years[0], current.years[0])
  near(act.years[1].fixedCost - current.years[1].fixedCost, 400)
  near(act.years[2].fixedCost - current.years[2].fixedCost, 100)
  inputs.common.actStartYear = 4
  assert.deepEqual(scenario(inputs, 'pharmacy-act').years, current.years)
})
test('break-even is the smallest constant annual enrollment covering cumulative costs, including zero-enrollment evaluation', () => {
  const inputs = simple()
  const current = scenario(inputs, 'pharmacy-current')
  assert.equal(current.breakEvenEnrollment, 123) // $3,300 fixed / $27 contribution per annual participant.
  inputs.common.annualEnrollment = 123
  assert.ok(scenario(inputs, 'pharmacy-current').cumulative.margin >= 0)
  inputs.common.annualEnrollment = 122
  assert.ok(scenario(inputs, 'pharmacy-current').cumulative.margin < 0)
  inputs.common.annualEnrollment = 0
  assert.equal(scenario(inputs, 'pharmacy-current').breakEvenEnrollment, 123)
  near(scenario(inputs, 'pharmacy-current').cumulative.margin, -3300)
  assert.equal(scenario(inputs, 'pharmacy-none').breakEvenEnrollment, null)
})
test('dispensing loss follows persistent cohorts and never credits payer medication or hospital savings', () => {
  const inputs = simple()
  Object.assign(inputs.common, { recommendations: 1, incrementalDetection: 1, implementationRate: .5, stopRetention: .8 })
  Object.assign(inputs.settings.pharmacy, { dispensingShare: .5, dispensingMargin: 20 })
  const pharmacy = scenario(inputs, 'pharmacy-none'), clinic = scenario(inputs, 'clinic-none')
  assert.deepEqual(pharmacy.years.map(y => y.discontinuedMedicationYears), [50, 90, 122])
  assert.deepEqual(pharmacy.years.map(y => y.dispensingLoss), [500, 900, 1220])
  near(clinic.cumulative.margin - pharmacy.cumulative.margin, 2620)
  for (const row of pharmacy.years) assert.equal(row.revenue, 0)
  inputs.settings.pharmacy.dispensingMargin = -20
  assert.deepEqual(scenario(inputs, 'pharmacy-none').years.map(y => y.dispensingLoss), [-500, -900, -1220])
})
test('RPM dropout removes recurring work and receipts but retains device and onboarding costs', () => {
  const inputs = getProviderInputs()
  inputs.common.rpmDropoutRate = 1
  const row = scenario(inputs, 'pharmacy-current').years[0]
  assert.equal(row.rpmMonths, 0); assert.equal(row.deviceCost, 10000); assert.equal(row.technologyCost, 0)
  near(row.pharmacistHours, (200 * 40 + 100 * 10) / 60)
  inputs.common.rpmDropoutRate = 0
  assert.equal(scenario(inputs, 'pharmacy-current').years[0].rpmMonths, 600)
})
test('invalid assumptions, overlapping paid shares and extreme calculations block all scenario output', () => {
  for (const mutate of [
    x => { x.common.annualEnrollment = null }, x => { x.common.rpmShare = 1.1 },
    x => { x.common.actStartYear = 1.5 }, x => { x.common.rpmDurationMonths = 13 },
    x => { x.settings.pharmacy.currentReviewShare = .9 },
    x => { x.settings.clinic.actRpmShare = .6 },
    x => { x.settings.pharmacy.pharmacistRate = '50' },
    x => { x.settings.clinic.productiveShare = 0 },
    x => { x.settings.clinic.rpmManagementThreshold = 15 },
    x => { x.common.annualEnrollment = Number.MAX_VALUE; x.settings.pharmacy.pharmacistRate = Number.MAX_VALUE }
  ]) {
    const inputs = getProviderInputs(); mutate(inputs)
    const result = calculateProviderComparison(inputs)
    assert.equal(result.isComplete, false); assert.deepEqual(result.scenarios, [])
  }
})
test('export provenance follows setting-specific defaults and flags edited literature values', async () => {
  const inputs = getProviderInputs()
  let bundle = await createProviderBundle(inputs)
  assert.equal(bundle.parameters.settings.clinic.pharmacistRate.referenceDefault, 80.61)
  assert.equal(bundle.parameters.settings.pharmacy.pharmacistRate.referenceDefault, 60.11)
  assert.equal(bundle.parameters.settings.clinic.pharmacistRate.valueOrigin, 'Survey wage benchmark')
  assert.equal(bundle.parameters.settings.clinic.currentReviewReceipt.evidenceType, 'Assumption')
  assert.equal(bundle.parameters.common.rpmSetupFee.sourceYear, 2026)
  assert.ok(bundle.parameters.settings.pharmacy.currentReviewReceipt.citationUrl.includes('PMC6859940'))
  inputs.settings.clinic.pharmacistRate = 90
  bundle = await createProviderBundle(inputs)
  assert.match(bundle.parameters.settings.clinic.pharmacistRate.valueOrigin, /User-entered/)
  assert.deepEqual(await verifyProviderBundle(JSON.parse(JSON.stringify(bundle))), bundle)
  assert.ok(providerBundleToCsv(bundle).includes('loaded_pharmacist_cost_per_hour'))
})
test('provider JSON round-trips six scenarios with citations, and CSV carries 24 full-precision result rows', async () => {
  const bundle = await createProviderBundle(simple(), { notes: 'Illustrative; not contracted rates', createdAt: '2026-10-25T00:00:00.000Z' })
  assert.deepEqual(await verifyProviderBundle(JSON.parse(JSON.stringify(bundle))), bundle)
  const csv = providerBundleToCsv(bundle)
  assert.equal(csv.split('\r\n').filter(Boolean).length, 25)
  for (const text of ['setting', 'operating margin', 'break_even_constant_annual_enrollment', 'BILLS-119s2800is', 'jac5.1466', String(bundle.results.scenarios[0].cumulative.margin)]) assert.ok(csv.toLowerCase().includes(text.toLowerCase()), text)
  const reversed = { common: Object.fromEntries(Object.entries(bundle.inputs.common).reverse()), settings: bundle.inputs.settings }
  assert.equal((await createProviderBundle(reversed)).inputFingerprint, bundle.inputFingerprint)
})
test('provider import detects result, input, citation, perspective and field tampering', async () => {
  const original = await createProviderBundle(simple())
  for (const mutate of [
    b => { b.results.scenarios[0].cumulative.margin += 1 },
    b => { b.inputs.common.reviewBenchmark = 200 },
    b => { b.model.medicareShare = 1 },
    b => { b.parameters.settings.pharmacy.currentReviewReceipt.source = 'CMS' },
    b => { b.clinicalEvidence.citation.url = 'unsupported' },
    b => { b.inputs.settings.clinic.unknown = 1 },
    b => { b.kind = 'health-plan-savings' }
  ]) {
    const changed = structuredClone(original); mutate(changed)
    await assert.rejects(() => verifyProviderBundle(changed))
  }
})
test('provider changes do not change the existing health-system model', () => {
  const base = getBaseInputs(), before = calculateProjection(base)
  const inputs = getProviderInputs(); inputs.settings.pharmacy.currentReviewReceipt = 999
  calculateProviderComparison(inputs)
  assert.deepEqual(calculateProjection(base), before)
})
