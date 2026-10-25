import { COMMON_FIELDS, SETTING_FIELDS, getSettingFields, SETTINGS, PROVIDER_MODEL } from '../data/providerDefaults.js'
import { GEISINGER_PROFILE } from '../data/deprescribingScenarios.js'
import { calculateProviderComparison, PROVIDER_OUTPUTS } from './providerFeasibility.js'
import { canonicalJson, csvCell } from './scenarioExports.js'

export function providerParameterSnapshot(inputs) {
  const snapshot = (values, fields) => Object.fromEntries(Object.entries(fields).map(([key, d]) => [key, {
    ...d, value: values[key], referenceDefault: d.value,
    valueOrigin: values[key] === d.value ? d.evidenceType : 'User-entered assumption; original source does not validate this value'
  }]))
  return { common: snapshot(inputs.common, COMMON_FIELDS), settings: Object.fromEntries(Object.keys(SETTINGS).map(key => [key, snapshot(inputs.settings[key], getSettingFields(key))])) }
}
async function providerFingerprint(inputs) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalJson({ model: PROVIDER_MODEL, inputs })))
  return Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join('')
}
function checkShape(inputs) {
  const keys = (value, expected) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === Object.keys(expected).sort().join(',')
  if (!keys(inputs, { common: 0, settings: 0 }) || !keys(inputs.common, COMMON_FIELDS) || !keys(inputs.settings, SETTINGS) ||
      Object.keys(SETTINGS).some(key => !keys(inputs.settings[key], SETTING_FIELDS))) throw new Error('Provider input fields do not match this model version.')
}
export async function createProviderBundle(inputs, { notes = '', name = 'Community pharmacy and integrated clinic', createdAt = new Date().toISOString() } = {}) {
  checkShape(inputs)
  if (typeof name !== 'string' || typeof notes !== 'string' || typeof createdAt !== 'string' || !Number.isFinite(Date.parse(createdAt))) throw new Error('Invalid provider scenario metadata.')
  const results = calculateProviderComparison(inputs)
  if (!results.isComplete) throw new Error('Correct the provider assumptions before export: ' + Object.entries(results.errors).map(([k, v]) => k + ': ' + v).join(' '))
  return { kind: PROVIDER_MODEL.id, schemaVersion: PROVIDER_MODEL.schemaVersion, model: structuredClone(PROVIDER_MODEL),
    name, createdAt, notes, inputs: structuredClone(inputs), parameters: providerParameterSnapshot(inputs),
    clinicalEvidence: structuredClone(GEISINGER_PROFILE), inputFingerprint: await providerFingerprint(inputs), results }
}
export async function verifyProviderBundle(bundle) {
  if (bundle?.kind !== PROVIDER_MODEL.id || bundle.schemaVersion !== PROVIDER_MODEL.schemaVersion || canonicalJson(bundle.model) !== canonicalJson(PROVIDER_MODEL)) throw new Error('Provider model/export version mismatch. Replay with the archived source.')
  const expected = await createProviderBundle(bundle.inputs, { notes: bundle.notes, name: bundle.name, createdAt: bundle.createdAt })
  if (canonicalJson(bundle) !== canonicalJson(expected)) throw new Error('Saved provider results, inputs or citations do not match recalculation.')
  return bundle
}
export function providerBundleToCsv(bundle) {
  const fields = Object.keys(PROVIDER_OUTPUTS)
  const commonKeys = Object.keys(COMMON_FIELDS)
  const settingKeys = Object.keys(SETTING_FIELDS)
  const rows = [['model_id', 'model_version', 'exported_at', 'scenario_name', 'setting', 'reimbursement_scenario', 'period', 'perspective', 'price_year', 'currency', 'input_sha256', 'notes',
    ...commonKeys.map(k => 'common_' + k), ...settingKeys.map(k => 'setting_' + k), ...fields.map(k => 'output_' + k),
    'loaded_pharmacist_cost_per_hour', 'break_even_constant_annual_enrollment', 'three_year_contribution_per_annual_participant', 'break_even_basis', 'parameters_json', 'policy_and_limits_json', 'clinical_evidence_json']]
  for (const s of bundle.results.scenarios) for (const [period, row] of [...s.years.map(y => ['Year ' + y.year, y]), ['Cumulative 3 years', s.cumulative]]) {
    rows.push([bundle.model.id, bundle.model.version, bundle.createdAt, bundle.name, s.settingName, s.policyName, period, bundle.model.perspective,
      bundle.inputs.common.priceYear, bundle.model.currency, bundle.inputFingerprint, bundle.notes,
      ...commonKeys.map(k => bundle.inputs.common[k]), ...settingKeys.map(k => bundle.inputs.settings[s.settingId][k]), ...fields.map(k => row[k]),
      s.loadedPharmacistCost, s.breakEvenEnrollment ?? 'Not attainable at these unit economics', s.contributionPerAnnualParticipant, s.breakEvenBasis,
      JSON.stringify(bundle.parameters), JSON.stringify(bundle.model), JSON.stringify(bundle.clinicalEvidence)])
  }
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n'
}
