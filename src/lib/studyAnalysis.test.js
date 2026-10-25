import test from 'node:test'
import assert from 'node:assert/strict'
import { getStudyBaseScenario } from '../data/studyScenarios.js'
import { calculateStudyAnalysis } from './studyAnalysis.js'
import { calculateProjection, MODES } from './valueCalculator.js'
import { createScenarioBundle, verifyScenarioBundle } from './scenarioExports.js'

test('study base case carries the Geisinger reference through a verified export', async () => {
  const base = getStudyBaseScenario()
  assert.equal(base.inputs.pimsPerPatient, 1.09)
  assert.equal(base.inputs.implementationRate, .332)
  const bundle = await verifyScenarioBundle(await createScenarioBundle([base]))
  assert.equal(bundle.model.primaryHorizonYears, 1)
  assert.equal(bundle.model.secondaryHorizonYears, 3)
  assert.ok(bundle.scenarios[0].evidenceProfile.citation.url)
})
test('one-year study arms reconcile to the existing engine and count shared fixed costs once', () => {
  const inputs = getStudyBaseScenario().inputs
  const original = structuredClone(inputs)
  const analysis = calculateStudyAnalysis(inputs)
  assert.equal(analysis.isComplete, true)
  for (const arm of analysis.arms) assert.deepEqual(arm.result.years[0], calculateProjection(inputs, arm.mode, 3).years[0])
  const [dep, rpm, combined] = analysis.arms.map(arm => arm.result.years[0])
  assert.ok(Math.abs(dep.programCost + rpm.programCost - combined.programCost - combined.platformCost - combined.setupCost) < 1e-8)
  const noCv = calculateProjection({ ...inputs, costPerEvent: 0 }, MODES.COMBINED, 1).years[0]
  assert.equal(analysis.noCvNetImpact, noCv.netImpact)
  assert.equal(analysis.noCvNetPMPM, noCv.netPMPM)
  assert.deepEqual(inputs, original)
})
test('attainable implementation threshold gives zero combined year-one budget impact', () => {
  const inputs = { ...getStudyBaseScenario().inputs, costPerStopped: 1000 }
  const threshold = calculateStudyAnalysis(inputs).implementationThreshold
  assert.equal(threshold.status, 'attainable')
  assert.ok(threshold.rate > 0 && threshold.rate <= 1)
  const row = calculateProjection({ ...inputs, implementationRate: threshold.rate }, MODES.COMBINED, 1).years[0]
  assert.ok(Math.abs(row.netImpact) < 1e-8)
})
test('unattainable thresholds are not presented as feasible percentages', () => {
  const inputs = getStudyBaseScenario().inputs
  const threshold = calculateStudyAnalysis(inputs).implementationThreshold
  assert.equal(threshold.status, 'unattainable')
  assert.ok(threshold.rate > 1)
  const none = calculateStudyAnalysis({ ...inputs, incrementalDetection: 0 })
  assert.equal(none.implementationThreshold.rate, null)
  assert.equal(none.combined.years[0].avoidedDrug, 0)
  assert.ok(none.combined.years[0].programCost > 0)
  const adverse = calculateStudyAnalysis({ ...inputs, costPerStopped: 0, substituteDrugCost: 100 })
  assert.equal(adverse.implementationThreshold.status, 'unattainable')
})
test('zero-cost boundary and missing one-year versus later-year inputs are handled', () => {
  const inputs = getStudyBaseScenario().inputs
  const covered = calculateStudyAnalysis({ ...inputs, costPerEvent: 1000000 })
  assert.deepEqual(covered.implementationThreshold, { status: 'already-covered', rate: 0 })
  assert.equal(calculateStudyAnalysis({ ...inputs, restartRate: null }).isComplete, true)
  const invalid = calculateStudyAnalysis({ ...inputs, lives: null })
  assert.equal(invalid.isComplete, false)
  assert.equal(invalid.implementationThreshold, null)
})
