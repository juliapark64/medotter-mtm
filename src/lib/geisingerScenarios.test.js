import test from 'node:test'
import assert from 'node:assert/strict'
import { getBaseInputs } from '../data/calculatorDefaults.js'
import { GEISINGER_PROFILE, GEISINGER_PROFILE_ID, getGeisingerScenarios } from '../data/deprescribingScenarios.js'
import { calculateProjection, MODES } from './valueCalculator.js'
import { createScenarioBundle, verifyScenarioBundle, getScenarioDefinitions, getParameterSnapshot, bundleToCsv } from './scenarioExports.js'
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, a + ' != ' + b)

test('Geisinger scenarios use the requested rounded values and preserve other assumptions', () => {
  const base = { ...getBaseInputs(), lives: 12000, hourlyWage: 117, incrementalDetection: .23 }
  const before = structuredClone(base)
  for (const mode of [MODES.COMBINED, MODES.DEPRESCRIBING]) {
    const pair = getScenarioDefinitions(base, mode).filter(s => s.id.startsWith('geisinger'))
    assert.equal(pair.length, 2)
    for (const s of pair) {
      assert.equal(s.inputs.pimsPerPatient, 1.09)
      assert.equal(s.inputs.implementationRate, .332)
      assert.equal(s.evidenceProfileId, GEISINGER_PROFILE_ID)
      for (const key of Object.keys(base)) if (!['pimsPerPatient', 'implementationRate', 'incrementalDetection'].includes(key)) assert.equal(s.inputs[key], base[key])
    }
    assert.equal(pair[0].inputs.incrementalDetection, .23)
    assert.equal(pair[1].inputs.incrementalDetection, 0)
  }
  assert.equal(getScenarioDefinitions(base, MODES.RPM).filter(s => s.id.startsWith('geisinger')).length, 0)
  assert.deepEqual(base, before)
  assert.equal(getBaseInputs().pimsPerPatient, .34)
  assert.equal(getBaseInputs().implementationRate, .60)
})

test('no-added-benefit removes all medication offsets but retains costs, workload and RPM effects in every year', () => {
  for (const mode of [MODES.COMBINED, MODES.DEPRESCRIBING]) {
    const pair = getGeisingerScenarios(getBaseInputs(), mode)
    const [withBenefit, none] = pair.map(s => calculateProjection(s.inputs, s.mode))
    assert.ok(withBenefit.isComplete && none.isComplete)
    near(withBenefit.years[0].newStops, 10920 * 1.09 * .332 * .5)
    for (const [i, row] of [...none.years, none.cumulative].entries()) {
      const reference = i < 3 ? withBenefit.years[i] : withBenefit.cumulative
      for (const key of ['newStops', 'stoppedMedicationYears', 'grossAvoidedDrug', 'replacementDrugCost', 'avoidedDrug']) assert.equal(row[key], 0)
      for (const key of ['reviews', 'reviewHours', 'programCost', 'pharmacistHours', 'rpmPatientMonths', 'avoidedEvents', 'avoidedCV']) assert.equal(row[key], reference[key])
      assert.ok(row.programCost > 0)
      near(row.netImpact - reference.netImpact, reference.avoidedDrug)
    }
  }
})

test('Geisinger citations, denominators and limits round-trip in JSON and CSV', async () => {
  const bundle = await createScenarioBundle(getGeisingerScenarios(getBaseInputs(), MODES.COMBINED))
  assert.deepEqual(await verifyScenarioBundle(JSON.parse(JSON.stringify(bundle))), bundle)
  for (const s of bundle.scenarios) {
    assert.deepEqual(s.evidenceProfile, GEISINGER_PROFILE)
    const recommendations = s.parameters.pimsPerPatient
    assert.equal(recommendations.referenceDefault, 1.09)
    assert.match(recommendations.unit, /completed initial review/)
    assert.deepEqual(recommendations.derivation, { numerator: 199, denominator: 182, exactValue: 199 / 182, roundedValue: 1.09 })
    assert.equal(s.parameters.implementationRate.derivation.numerator, 66)
    assert.equal(s.parameters.implementationRate.derivation.denominator, 199)
    assert.match(s.parameters.implementationRate.source, /10.1002\/jac5.1466/)
    assert.match(s.parameters.incrementalDetection.valueOrigin, /[Aa]ssumption/)
  }
  const csv = bundleToCsv(bundle)
  for (const text of ['evidence_profile_id', 'scenario_evidence_json', GEISINGER_PROFILE.citation.url, '199', '182', '66', 'No usual-care control'.toLowerCase()]) {
    assert.ok(csv.toLowerCase().includes(text.toLowerCase()), text)
  }
  assert.equal(csv.split('\r\n').filter(Boolean).length, 9)
})

test('edited values retain the study reference without claiming literature support for the edited value', () => {
  const inputs = { ...getBaseInputs(), pimsPerPatient: 1.5, implementationRate: .8 }
  const p = getParameterSnapshot(inputs, GEISINGER_PROFILE_ID)
  assert.equal(p.pimsPerPatient.referenceDefault, 1.09)
  assert.equal(p.implementationRate.referenceDefault, .332)
  for (const key of ['pimsPerPatient', 'implementationRate']) assert.match(p[key].valueOrigin, /does not validate this value/)
  assert.equal(getParameterSnapshot(inputs).pimsPerPatient.referenceDefault, .34)
  const definitions = getScenarioDefinitions(inputs, MODES.COMBINED, false, GEISINGER_PROFILE_ID)
  assert.equal(definitions[0].evidenceProfileId, GEISINGER_PROFILE_ID)
  assert.equal(definitions.find(s => s.id === 'implementation-0.6').evidenceProfileId, GEISINGER_PROFILE_ID)
})

test('replay rejects altered citation metadata and unknown evidence profiles', async () => {
  const original = await createScenarioBundle(getGeisingerScenarios(getBaseInputs(), MODES.COMBINED))
  for (const mutate of [
    s => { s.evidenceProfile.citation.doi = 'unsupported' },
    s => { s.parameters.pimsPerPatient.source = 'CMS' },
    s => { s.parameters.implementationRate.derivation.denominator = 182 },
    s => { s.evidenceProfileId = 'unknown' },
    s => { delete s.evidenceProfileId }
  ]) {
    const bundle = structuredClone(original)
    mutate(bundle.scenarios[0])
    await assert.rejects(() => verifyScenarioBundle(bundle))
  }
})
