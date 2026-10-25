import { CALCULATOR_DEFAULTS, MODEL_METADATA, getBaseInputs } from '../data/calculatorDefaults.js'
import { calculateProjection, normalizeInputs, MODES, OUTPUT_LABELS } from './valueCalculator.js'
import { getEvidenceProfile, getGeisingerScenarios } from '../data/deprescribingScenarios.js'

export function canonicalJson(value) {
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']'
  if (value !== null && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonicalJson(value[key])).join(',') + '}'
  return JSON.stringify(value)
}
export async function fingerprint(inputs, mode) {
  const payload = canonicalJson({ model: MODEL_METADATA.id, version: MODEL_METADATA.version, horizon: 3, mode, inputs })
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload))
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
}

// Same comparison definitions power the UI and command-line exports.
export function getScenarioDefinitions(base = getBaseInputs(), mode = MODES.COMBINED, fullSensitivity = false, evidenceProfileId = null) {
  getEvidenceProfile(evidenceProfileId)
  const definitions = [{ id: 'current', name: 'Current scenario', mode, inputs: { ...base }, evidenceProfileId }]
  for (const [key, m] of Object.entries(MODES)) if (m !== mode) {
    definitions.push({ id: 'mode-' + key.toLowerCase(), name: m, mode: m, inputs: { ...base }, evidenceProfileId })
  }
  const add = (id, name, key, value) => definitions.push({ id, name, mode, inputs: { ...base, [key]: value }, evidenceProfileId })
  for (const value of [50000, 100000, 250000]) add('plan-size-' + value, 'Plan size ' + value.toLocaleString('en-US'), 'lives', value)
  if (mode !== MODES.DEPRESCRIBING) {
    for (const value of [0.10, 0.30, 0.50]) add('uptake-' + value, 'RPM uptake ' + value * 100 + '%', 'rpmEnrollment', value)
    for (const value of [3, 6, 12]) add('duration-' + value, 'RPM duration ' + value + ' months', 'rpmDurationMonths', value)
    add('no-cv-offset', 'No medical cost offset', 'costPerEvent', 0)
  }
  if (mode !== MODES.RPM) for (const value of [0.20, 0.40, 0.60]) {
    add('implementation-' + value, 'Deprescribing implementation ' + value * 100 + '%', 'implementationRate', value)
  }
  if (mode !== MODES.RPM) definitions.push(...getGeisingerScenarios(base, mode))
  if (fullSensitivity) for (const [key, d] of Object.entries(CALCULATOR_DEFAULTS)) {
    if (d.low === d.high) continue
    if (d.appliesTo === 'rpm' && mode === MODES.DEPRESCRIBING) continue
    if (d.appliesTo === 'deprescribing' && mode === MODES.RPM) continue
    for (const bound of ['low', 'high']) add(key + '-' + bound, d.label + ': ' + bound, key, d[bound])
  }
  return definitions
}

export function getParameterSnapshot(inputs, evidenceProfileId = null) {
  const profile = getEvidenceProfile(evidenceProfileId)
  return Object.fromEntries(Object.entries(CALCULATOR_DEFAULTS).map(([key, original]) => {
    const reference = profile?.references[key]
    const d = { ...original, ...reference }
    return [key, {
      ...d,
      value: inputs[key],
      referenceDefault: d.value,
      valueOrigin: inputs[key] === d.value ? d.evidenceType : 'User-entered or scenario assumption; original reference does not validate this value',
      sensitivityRangeMeaning: reference
        ? 'Generic exploratory bounds retained from the illustrative model; not estimated by the Geisinger study or confidence intervals'
        : 'Exploratory bounds, not confidence intervals'
    }]
  }))
}

export async function createScenarioBundle(definitions, { notes = '', createdAt = new Date().toISOString() } = {}) {
  if (!Array.isArray(definitions) || definitions.length < 1 || definitions.length > 200) throw new Error('Export between 1 and 200 scenarios.')
  if (new Set(definitions.map(d => d.id)).size !== definitions.length) throw new Error('Scenario IDs must be unique.')
  const scenarios = []
  for (const d of definitions) {
    const results = calculateProjection(d.inputs, d.mode, 3)
    if (!results.isComplete) throw new Error(d.name + ': ' + Object.entries(results.errors).map(([k, v]) => (CALCULATOR_DEFAULTS[k]?.label || k) + ': ' + v).join(' '))
    const inputs = normalizeInputs(d.inputs)
    const evidenceProfileId = d.evidenceProfileId ?? null
    const evidenceProfile = getEvidenceProfile(evidenceProfileId)
    scenarios.push({ id: d.id, name: d.name, mode: d.mode, horizon: 3, inputs,
      evidenceProfileId, evidenceProfile: evidenceProfile ? structuredClone(evidenceProfile) : null,
      parameters: getParameterSnapshot(inputs, evidenceProfileId), inputFingerprint: await fingerprint(inputs, d.mode), results })
  }
  return { schemaVersion: MODEL_METADATA.schemaVersion, model: { ...MODEL_METADATA }, createdAt, notes, scenarios }
}

export async function verifyScenarioBundle(bundle) {
  if (bundle?.schemaVersion !== MODEL_METADATA.schemaVersion || canonicalJson(bundle.model) !== canonicalJson(MODEL_METADATA)) {
    throw new Error('This file uses a different model or export version. Replay older exports with their archived model source.')
  }
  if (!Array.isArray(bundle.scenarios) || bundle.scenarios.length < 1 || bundle.scenarios.length > 200) throw new Error('Invalid scenario list.')
  if (typeof bundle.notes !== 'string' || typeof bundle.createdAt !== 'string' || !Number.isFinite(Date.parse(bundle.createdAt))) throw new Error('Invalid scenario metadata.')
  const ids = new Set()
  for (const s of bundle.scenarios) {
    if (!s || typeof s.id !== 'string' || typeof s.name !== 'string' || ids.has(s.id) || s.horizon !== 3) throw new Error('Invalid scenario identity or horizon.')
    ids.add(s.id)
    if (!s.inputs || Object.keys(s.inputs).sort().join(',') !== Object.keys(CALCULATOR_DEFAULTS).sort().join(',')) throw new Error('Scenario input fields do not match this model version.')
    if (Object.values(s.inputs).some(v => v !== null && (typeof v !== 'number' || !Number.isFinite(v)))) throw new Error('Scenario inputs must be numbers or null.')
    const results = calculateProjection(s.inputs, s.mode, 3)
    if (!results.isComplete) throw new Error('Invalid inputs in ' + s.name + '.')
    if (s.inputFingerprint !== await fingerprint(s.inputs, s.mode)) throw new Error('Input fingerprint mismatch in ' + s.name + '.')
    if (canonicalJson(results) !== canonicalJson(s.results)) throw new Error('Saved results do not match recalculation for ' + s.name + '.')
    if (s.evidenceProfileId !== null && typeof s.evidenceProfileId !== 'string') throw new Error('Missing or invalid evidence profile identity.')
    if (canonicalJson(s.evidenceProfile) !== canonicalJson(getEvidenceProfile(s.evidenceProfileId))) throw new Error('Evidence profile does not match this model version.')
    if (canonicalJson(s.parameters) !== canonicalJson(getParameterSnapshot(s.inputs, s.evidenceProfileId))) throw new Error('Assumption snapshot does not match input values or reference sources.')
  }
  return bundle
}

// Protect text cells from spreadsheet formula execution. Numeric negatives stay numeric.
export function csvCell(value) {
  if (value === null || value === undefined) return '""'
  let text = String(value)
  if (typeof value === 'string' && /^\s*[=+@-]|^[\t\r\n]/.test(text)) text = "'" + text
  return '"' + text.replace(/"/g, '""') + '"'
}
export function bundleToCsv(bundle) {
  const inputKeys = Object.keys(CALCULATOR_DEFAULTS)
  const outputKeys = Object.keys(OUTPUT_LABELS)
  const header = ['schema_version', 'model_version', 'exported_at', 'scenario_id', 'scenario_name', 'mode', 'period', 'price_year', 'currency', 'perspective', 'comparator', 'price_basis', 'input_sha256', 'notes', ...inputKeys.map(k => 'input_' + k), ...outputKeys.map(k => 'output_' + k), 'evidence_profile_id', 'scenario_evidence_json', 'parameter_provenance_json', 'model_assumptions_json']
  const rows = [header]
  for (const s of bundle.scenarios) for (const [period, result] of [
    ...s.results.years.map(y => ['Year ' + y.year, y]), ['Cumulative 3 years', s.results.cumulative]
  ]) {
    rows.push([bundle.schemaVersion, bundle.model.version, bundle.createdAt, s.id, s.name, s.mode, period,
      s.inputs.priceYear, bundle.model.currency, bundle.model.perspective, bundle.model.comparator,
      bundle.model.priceBasis, s.inputFingerprint, bundle.notes,
      ...inputKeys.map(k => s.inputs[k]), ...outputKeys.map(k => result[k] ?? ''), s.evidenceProfileId, JSON.stringify(s.evidenceProfile), JSON.stringify(s.parameters), JSON.stringify(bundle.model.limitations)])
  }
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n'
}
