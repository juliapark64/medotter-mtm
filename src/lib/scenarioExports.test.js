import test from 'node:test'
import assert from 'node:assert/strict'
import { getBaseInputs, CALCULATOR_DEFAULTS, MODEL_METADATA } from '../data/calculatorDefaults.js'
import { MODES } from './valueCalculator.js'
import { createScenarioBundle, verifyScenarioBundle, getScenarioDefinitions, fingerprint, bundleToCsv, csvCell } from './scenarioExports.js'
const definition = () => ({ id: 'current', name: 'Example', mode: MODES.COMBINED, inputs: getBaseInputs() })
const options = { notes: 'Local quote pending', createdAt: '2026-10-25T00:00:00.000Z' }

test('JSON export round-trips exact inputs, provenance, and three years of results', async () => {
  const bundle = await createScenarioBundle([definition()], options)
  assert.deepEqual(await verifyScenarioBundle(JSON.parse(JSON.stringify(bundle))), bundle)
  assert.equal(bundle.model.version, MODEL_METADATA.version)
  for (const key of Object.keys(CALCULATOR_DEFAULTS)) {
    assert.equal(bundle.scenarios[0].parameters[key].value, bundle.scenarios[0].inputs[key])
    assert.ok(bundle.scenarios[0].parameters[key].source)
  }
  assert.equal(bundle.scenarios[0].results.years.length, 3)
})
test('input fingerprints are deterministic and change with inputs or service mode', async () => {
  const p = getBaseInputs()
  assert.equal(await fingerprint(p, MODES.COMBINED), await fingerprint(Object.fromEntries(Object.entries(p).reverse()), MODES.COMBINED))
  assert.notEqual(await fingerprint(p, MODES.RPM), await fingerprint(p, MODES.COMBINED))
  assert.notEqual(await fingerprint(p, MODES.COMBINED), await fingerprint({ ...p, monthlyFee: 20 }, MODES.COMBINED))
})
test('import detects changed inputs, results, provenance values, or model versions', async () => {
  const original = await createScenarioBundle([definition()], options)
  for (const mutate of [
    b => { b.scenarios[0].inputs.monthlyFee = 99 },
    b => { b.scenarios[0].results.cumulative.netImpact += 1 },
    b => { b.scenarios[0].parameters.hourlyWage.value = 1 },
    b => { b.model.version = '1.0.0' },
    b => { b.scenarios[0].inputs.legacyField = 10 },
    b => { b.scenarios[0].inputs.hourlyWage = '96.5' }
  ]) {
    const b = structuredClone(original); mutate(b)
    await assert.rejects(() => verifyScenarioBundle(b))
  }
})
test('invalid inputs prevent an export and duplicate IDs are rejected', async () => {
  await assert.rejects(() => createScenarioBundle([{ ...definition(), inputs: { ...getBaseInputs(), restartRate: null } }]))
  await assert.rejects(() => createScenarioBundle([definition(), definition()]))
})
test('comparison definitions are shared and full sensitivity has no missing bounds', async () => {
  for (const d of Object.values(CALCULATOR_DEFAULTS)) { assert.ok(Number.isFinite(d.low)); assert.ok(Number.isFinite(d.high)) }
  const defs = getScenarioDefinitions(getBaseInputs(), MODES.COMBINED, true)
  const b = await createScenarioBundle(defs, options)
  assert.ok(b.scenarios.length > 50)
  await verifyScenarioBundle(b)
  assert.deepEqual(defs.filter(s => s.id.startsWith('uptake-')).map(s => s.inputs.rpmEnrollment), [.1, .3, .5])
  assert.deepEqual(defs.filter(s => s.id.startsWith('plan-size-')).map(s => s.inputs.lives), [50000, 100000, 250000])
  assert.deepEqual(defs.filter(s => s.id.startsWith('implementation-')).map(s => s.inputs.implementationRate), [.2, .4, .6])
})
test('CSV includes full precision, all inputs, provenance, metadata and all periods', async () => {
  const bundle = await createScenarioBundle([definition()], options)
  const csv = bundleToCsv(bundle)
  assert.ok(csv.includes('"Cumulative 3 years"'))
  for (const key of Object.keys(CALCULATOR_DEFAULTS)) assert.ok(csv.includes('"input_' + key + '"'))
  for (const label of ['input_sha256', 'parameter_provenance_json', 'model_assumptions_json', 'price_year', 'perspective']) assert.ok(csv.includes('"' + label + '"'))
  assert.ok(csv.includes(String(bundle.scenarios[0].results.cumulative.netImpact)))
})
test('CSV quotes commas, quotes and newlines; guards formulas without changing numeric negatives', () => {
  assert.equal(csvCell('a,"b"\nc'), '"a,""b""\nc"')
  assert.equal(csvCell('=2+2'), '"\'=2+2"')
  assert.equal(csvCell(' @SUM(A1)'), '"\' @SUM(A1)"')
  assert.equal(csvCell(-2), '"-2"')
})
