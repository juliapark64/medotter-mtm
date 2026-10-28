import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_INTEGRATION_INPUTS, expectedIntegrationStudy, getIntegrationScenarios } from './integrationStudy.js'
import { getSensitivityParameters, getDefaultSensitivityConfig, validateSensitivityConfig, analyzeIntegrationSensitivity, createSensitivityExport, verifySensitivityExport, sensitivityExportCsv } from './integrationSensitivity.js'

const near = (actual, expected, tolerance = 1e-7) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`)
const zeroCosts = { pharmacistWage: 0, supportWage: 0, physicianWage: 0, nurseWage: 0, assistantWage: 0, deviceCost: 0, monthlyTechnologyCost: 0, monthlyConnectivityCost: 0, monthlyPlatformBaseCost: 0, fixedCost: 0, addedFixedCost: 0 }
const oneMonth = changes => ({ ...DEFAULT_INTEGRATION_INPUTS, N: 1, existingRpmShare: 0, startMonth: 12, monthlyRetention: 1, qualificationShare: 1, setupQualificationShare: 0, collectionShare: 1, onboardingMinutes: 0, onboardingSupportMinutes: 0, ...zeroCosts, ...changes })
const paired = changes => getIntegrationScenarios({ ...DEFAULT_INTEGRATION_INPUTS, N: 10, ...changes }).find(s => s.id === 'nurse-team-60-40').inputs
const modelMetrics = inputs => {
  const r = expectedIntegrationStudy(inputs)
  return { physicianMargin: r.baseline.operatingMargin, pharmacistMargin: r.integrated.operatingMargin, marginDifference: r.integrated.operatingMargin - r.baseline.operatingMargin }
}
const assertMetrics = (actual, expected) => { for (const key of ['physicianMargin', 'pharmacistMargin', 'marginDifference']) near(actual[key], expected[key]) }

// A one-patient December case gives independent dollar calculations without
// relying on the production threshold formulas: allowed receipts are 60,
// collections 48, and costs 35 / 50 in the physician / pharmacist programs.
const handInputs = oneMonth({ reimbursementMode: 'custom', monthlyRevenueBenchmark: 100, customSetupRevenueBenchmark: 20, qualificationShare: .5, setupQualificationShare: .5, collectionShare: .8, monthlyTechnologyCost: 20, deviceCost: 10, fixedCost: 5, addedFixedCost: 15 })

test('one-way points change only their stated input, preserve applied inputs, and rank by selected outcome range', () => {
  const inputs = paired()
  const config = getDefaultSensitivityConfig(inputs)
  const before = structuredClone({ inputs, config })
  const result = analyzeIntegrationSensitivity(inputs, config)
  assert.deepEqual({ inputs, config }, before)
  assertMetrics(result.base, modelMetrics(inputs))
  assert.match(result.analysisBasis, /Analytic expected/)
  for (const row of result.oneWay) {
    for (const point of row.points) {
      assert.equal(point.valid, true, row.key)
      assertMetrics(point, modelMetrics({ ...inputs, [row.key]: point.value }))
    }
    const values = row.points.filter(p => p.valid).map(p => p[config.metric])
    near(row.min, Math.min(...values)); near(row.max, Math.max(...values)); near(row.span, row.max - row.min)
  }
  assert.ok(result.oneWay.every((r, i, rows) => i === 0 || rows[i - 1].span >= r.span))
  assert.ok(result.parameters.every(p => /stress-test|stress test/.test(p.note)))
})

test('one-way analysis includes interior Medicare tier peaks and both sides of each threshold', () => {
  const inputs = oneMonth({ pharmacistWage: 60, monitorSupportMinutes: 0, qualifiedSupportMinutes: 0 })
  const config = getDefaultSensitivityConfig(inputs)
  config.ranges.monitorPharmacistMinutes = { low: 10, high: 39 }
  const row = analyzeIntegrationSensitivity(inputs, config).oneWay.find(r => r.key === 'monitorPharmacistMinutes')
  // 10 min: 52.11 + 26.05 - 10 = 68.16. At 20 min the management
  // tier becomes 51.77: 52.11 + 51.77 - 20 = 83.88, an interior maximum.
  near(row.points.find(p => p.value === 10).pharmacistMargin, 68.16)
  near(row.maximumPoint.value, 20); near(row.max, 83.88)
  assert.ok(row.max > row.points.find(p => p.value === 39).pharmacistMargin)
  const offsetInputs = { ...inputs, monitorSupportMinutes: 8, qualifiedSupportMinutes: 8 }
  const wide = getDefaultSensitivityConfig(offsetInputs)
  wide.ranges.monitorPharmacistMinutes = { low: 0, high: 80 }
  const points = analyzeIntegrationSensitivity(offsetInputs, wide).oneWay.find(r => r.key === 'monitorPharmacistMinutes').points
  for (const boundary of [2, 12, 32, 52, 72]) {
    assert.ok(points.some(p => p.value === boundary), `missing exact ${boundary}`)
    assert.ok(points.some(p => p.value < boundary && boundary - p.value < .00001), `missing below ${boundary}`)
    assert.ok(points.some(p => p.value > boundary && p.value - boundary < .00001), `missing above ${boundary}`)
  }
})

test('shared collection assumptions affect both margins but cancel from the matched-cohort difference', () => {
  const inputs = paired()
  const config = { ...getDefaultSensitivityConfig(inputs), metric: 'marginDifference' }
  const result = analyzeIntegrationSensitivity(inputs, config)
  const row = result.oneWay.find(r => r.key === 'collectionShare')
  const first = row.points[0]; const last = row.points.at(-1)
  assert.ok(last.physicianMargin > first.physicianMargin)
  assert.ok(last.pharmacistMargin > first.pharmacistMargin)
  near(row.span, 0, 1e-6)
  near(first.marginDifference, result.base.marginDifference)
  const differentTier = { ...inputs, qualifiedSupportMinutes: 0 }
  const different = analyzeIntegrationSensitivity(differentTier, getDefaultSensitivityConfig(differentTier)).oneWay.find(r => r.key === 'collectionShare')
  assert.notEqual(different.points[0].marginDifference, different.points.at(-1).marginDifference)
})

test('two-way cells reproduce exactly two changed inputs and reject impossible qualifying subsets', () => {
  const inputs = paired()
  const config = { ...getDefaultSensitivityConfig(inputs), xKey: 'monitorSupportMinutes', yKey: 'qualifiedSupportMinutes' }
  config.ranges.monitorSupportMinutes = { low: 8, high: 24 }
  config.ranges.qualifiedSupportMinutes = { low: 0, high: 18 }
  const result = analyzeIntegrationSensitivity(inputs, config)
  assert.equal(result.twoWay.cells.length, 81)
  assert.ok(result.twoWay.cells.some(cell => !cell.valid))
  for (const cell of result.twoWay.cells) {
    if (cell.y > cell.x) {
      assert.equal(cell.valid, false)
      assert.equal(cell.pharmacistMargin, null)
      assert.ok(cell.errors.qualifiedSupportMinutes)
    } else {
      assert.equal(cell.valid, true)
      assertMetrics(cell, modelMetrics({ ...inputs, monitorSupportMinutes: cell.x, qualifiedSupportMinutes: cell.y }))
    }
  }
})

test('four threshold types match independent hand calculations and give zero margin at the boundary', () => {
  const result = analyzeIntegrationSensitivity(handInputs)
  near(result.base.physicianMargin, 13); near(result.base.pharmacistMargin, -2)
  const targets = [
    ['collection', 'collectionShare', 35 / 60, 50 / 60],
    ['qualification', 'qualificationShare', .3375, .525],
    ['technology', 'monthlyTechnologyCost', 33, 18],
    ['device', 'deviceCost', 23, 8],
  ]
  for (const [suffix, key, physicianValue, pharmacistValue] of targets) for (const [arm, metric, value] of [['baseline', 'physicianMargin', physicianValue], ['integrated', 'pharmacistMargin', pharmacistValue]]) {
    const threshold = result.thresholds.find(t => t.id === `${arm}-${suffix}`)
    near(threshold.value, value)
    assert.equal(threshold.status, 'attainable')
    near(modelMetrics({ ...handInputs, [key]: value })[metric], 0)
  }
})

test('thresholds distinguish impossible shares, negative prices, zero exposure and already-covered costs', () => {
  const costly = analyzeIntegrationSensitivity({ ...handInputs, fixedCost: 1000 })
  for (const suffix of ['collection', 'qualification']) {
    const target = costly.thresholds.find(t => t.id === `integrated-${suffix}`)
    assert.ok(target.value > 1); assert.equal(target.status, 'exceeds-100-percent')
  }
  for (const suffix of ['technology', 'device']) {
    const target = costly.thresholds.find(t => t.id === `integrated-${suffix}`)
    assert.ok(target.value < 0); assert.equal(target.status, 'negative-price-required')
  }
  const noPayment = analyzeIntegrationSensitivity({ ...handInputs, reimbursementMode: 'none' })
  assert.equal(noPayment.thresholds.find(t => t.id === 'integrated-collection').value, null)
  assert.equal(noPayment.thresholds.find(t => t.id === 'integrated-collection').status, 'not-attainable')
  const establishedPositive = analyzeIntegrationSensitivity(oneMonth({ existingRpmShare: 1, reimbursementMode: 'custom', monthlyRevenueBenchmark: 100 }))
  assert.equal(establishedPositive.thresholds.find(t => t.id === 'integrated-device').value, null)
  assert.equal(establishedPositive.thresholds.find(t => t.id === 'integrated-device').status, 'not-limiting')
  const establishedLoss = analyzeIntegrationSensitivity(oneMonth({ existingRpmShare: 1, reimbursementMode: 'none', fixedCost: 100 }))
  assert.equal(establishedLoss.thresholds.find(t => t.id === 'integrated-device').status, 'not-attainable')
  const setupCovers = analyzeIntegrationSensitivity({ ...handInputs, customSetupRevenueBenchmark: 1000 })
  assert.equal(setupCovers.thresholds.find(t => t.id === 'integrated-qualification').value, 0)
  assert.equal(setupCovers.thresholds.find(t => t.id === 'integrated-qualification').status, 'already-covered-at-zero')
})

test('zero-participation secondary analysis distinguishes cost-free invariance from an uncovered fixed deficit', () => {
  const empty = oneMonth({ comparisonMode: 'recruitment', staffingMode: 'integrated-team', existingRpmShare: 0, r: 0, f: 0, o: 0 })
  const noCost = analyzeIntegrationSensitivity(empty)
  assertMetrics(noCost.base, { physicianMargin: 0, pharmacistMargin: 0, marginDifference: 0 })
  assert.ok(noCost.thresholds.every(t => t.value === null && t.status === 'not-limiting'))
  const deficit = analyzeIntegrationSensitivity({ ...empty, fixedCost: 100 })
  assertMetrics(deficit.base, { physicianMargin: -100, pharmacistMargin: -100, marginDifference: 0 })
  assert.ok(deficit.thresholds.every(t => t.value === null && t.status === 'not-attainable'))
})

test('pharmacist-time windows preserve disjoint profitable intervals created by reimbursement steps', () => {
  const inputs = oneMonth({ pharmacistWage: 300, monitorSupportMinutes: 0, qualifiedSupportMinutes: 0 })
  const config = getDefaultSensitivityConfig(inputs)
  config.ranges.monitorPharmacistMinutes = { low: 0, high: 39 }
  const windows = analyzeIntegrationSensitivity(inputs, config).timeWindows.filter(w => w.metric === 'pharmacistMargin')
  // Labor is $5/minute. The first tier stays positive through 78.16/5,
  // then loses money until the 20-minute allowance jump creates a new interval.
  assert.equal(windows.length, 2)
  near(windows[0].min, 0); near(windows[0].max, 78.16 / 5)
  near(windows[1].min, 20); near(windows[1].max, 103.88 / 5)
  assert.equal(windows[1].lowerInclusive, true)
  near(modelMetrics({ ...inputs, monitorPharmacistMinutes: windows[0].max }).pharmacistMargin, 0)
  near(modelMetrics({ ...inputs, monitorPharmacistMinutes: windows[1].max }).pharmacistMargin, 0)
  assert.ok(modelMetrics({ ...inputs, monitorPharmacistMinutes: 18 }).pharmacistMargin < 0)
  assert.ok(modelMetrics({ ...inputs, monitorPharmacistMinutes: 20 }).pharmacistMargin > 0)
  assert.match(sensitivityExportCsv(createSensitivityExport(inputs, config)), /time-window/)
})

test('invalid sensitivity ranges cannot silently become zero values or alter model constraints', () => {
  const inputs = paired()
  const valid = getDefaultSensitivityConfig(inputs)
  assert.deepEqual(validateSensitivityConfig(inputs, valid), {})
  for (const change of [c => { c.metric = 'profitChance' }, c => { c.yKey = c.xKey }, c => { c.gridSize = 500 }, c => { c.ranges.collectionShare.low = NaN }, c => { c.ranges.collectionShare.high = 1.01 }, c => { c.ranges.monitorSupportMinutes.low = 0 }, c => { c.ranges.qualifiedSupportMinutes.high = inputs.monitorSupportMinutes + 1 }, c => { c.ranges.monthlyTechnologyCost.low = c.ranges.monthlyTechnologyCost.high }, c => { c.ranges.fake = { low: 0, high: 1 } }]) {
    const invalid = structuredClone(valid); change(invalid)
    assert.ok(Object.keys(validateSensitivityConfig(inputs, invalid)).length)
    assert.throws(() => analyzeIntegrationSensitivity(inputs, invalid), RangeError)
  }
  const noNurses = oneMonth({ monitorNurseMinutes: 0, qualifiedNurseMinutes: 0 })
  const fixed = getDefaultSensitivityConfig(noNurses)
  assert.deepEqual(fixed.ranges.qualifiedNurseMinutes, { low: 0, high: 0 })
  assert.deepEqual(validateSensitivityConfig(noNurses, fixed), {})
  const parameters = getSensitivityParameters(inputs)
  assert.equal(parameters.find(p => p.key === 'monitorSupportMinutes').min, inputs.qualifiedSupportMinutes)
  assert.equal(parameters.find(p => p.key === 'qualifiedSupportMinutes').max, inputs.monitorSupportMinutes)
})

test('analysis is seed-independent and sensitivity exports replay with their inputs, ranges and provenance intact', () => {
  const config = getDefaultSensitivityConfig(handInputs)
  const result = analyzeIntegrationSensitivity(handInputs, config)
  assert.deepEqual(analyzeIntegrationSensitivity({ ...handInputs, seed: handInputs.seed + 1 }, config), result)
  const bundle = createSensitivityExport(handInputs, config)
  assert.equal(bundle.schemaVersion, 1); assert.equal(bundle.analysisVersion, '1.0.0'); assert.equal(bundle.modelVersion, '8.1.0')
  assert.deepEqual(verifySensitivityExport(JSON.parse(JSON.stringify(bundle))), bundle)
  for (const mutate of [b => { b.analysis.base.pharmacistMargin++ }, b => { b.analysis.twoWay.cells[0].physicianMargin++ }, b => { b.analysis.thresholds[0].value++ }, b => { b.config.ranges.collectionShare.low += .01 }, b => { b.analysis.notes[0] = 'validated clinical evidence' }, b => { b.analysis.methodSourceUrls = [] }]) {
    const tampered = structuredClone(bundle); mutate(tampered)
    assert.throws(() => verifySensitivityExport(tampered), /replay/)
  }
  assert.throws(() => verifySensitivityExport({ ...bundle, analysisVersion: '0.9.0' }), /version\/schema mismatch/)
  const csv = sensitivityExportCsv(bundle)
  for (const text of ['one-way', 'two-way', 'threshold', 'inputs_json', 'config_json', 'metadata_json', 'Analytic expected values', 'stress-test', 'ispor.org']) assert.ok(csv.includes(text), text)
  assert.match(csv, /0\.5833333333333334/)
})

test('sensitivity replay tolerates cross-runtime arithmetic noise only in derived numeric results', () => {
  const inputs = paired({ N: 1000 })
  const bundle = createSensitivityExport(inputs)
  const rounding = structuredClone(bundle)
  rounding.analysis.base.pharmacistMargin += 5e-11
  rounding.analysis.oneWay.find(r => r.key === 'monthlyRetention').points[5].pharmacistMargin += 5e-11
  rounding.analysis.twoWay.cells[0].physicianMargin += 5e-11
  rounding.analysis.thresholds.find(t => t.id === 'integrated-collection').value += 5e-11
  if (rounding.analysis.timeWindows.length) rounding.analysis.timeWindows[0].max += 5e-11
  assert.deepEqual(verifySensitivityExport(rounding), rounding)
  for (const mutate of [
    b => { b.analysis.base.pharmacistMargin += .01 },
    b => { b.analysis.oneWay[0].points[0].pharmacistMargin += .01 },
    b => { b.analysis.twoWay.cells[0].physicianMargin += .01 },
    b => { b.inputs.pharmacistWage += 1e-10 },
    b => { b.config.ranges.collectionShare.low += 1e-10 },
    b => { b.analysis.parameters.find(p => p.key === 'pharmacistWage').current += 1e-10 },
    b => { b.analysis.oneWay[0].points[0].value += 1e-10 },
    b => { b.analysis.twoWay.cells[0].x += 1e-10 },
    b => { b.analysis.notes[0] += ' ' },
    b => { b.analysis.numericReplayTolerance.absolute += 1e-12 },
  ]) {
    const changed = structuredClone(bundle); mutate(changed)
    assert.throws(() => verifySensitivityExport(changed), /replay/)
  }
})
