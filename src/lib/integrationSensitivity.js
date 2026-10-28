import { DEFAULT_INTEGRATION_INPUTS, INPUT_DEFINITIONS, INTEGRATION_MODEL_METADATA, expectedIntegrationStudy, getRpmPaymentSchedule, getStaffingEvidence, validateIntegrationInputs } from './integrationStudy.js'

export const SENSITIVITY_METRICS = Object.freeze([
  { id: 'physicianMargin', label: 'Physician-program margin' },
  { id: 'pharmacistMargin', label: 'Pharmacist-program margin' },
  { id: 'marginDifference', label: 'Pharmacist minus physician margin' },
])
const VERSION = '1.0.0'
const BASIS = 'Analytic expected values; all other inputs held fixed'
const ISPOR_URL = 'https://www.ispor.org/publications/journals/value-in-health/abstract/Volume-17--Issue-1/budget-impact-analysis-principles-of-good-practice-report-of-the-ispor-2012-budget-impact-analysis-good-practice-ii-task-force'
export const NUMERIC_REPLAY_TOLERANCE = Object.freeze({
  absolute: 1e-9,
  relative: 1e-12,
  maximum: 1e-6,
  formula: 'min(maximum, absolute + relative × max(abs(saved), abs(replayed)))',
  scope: 'Computed margins, sampled extrema/spans, financial thresholds and derived time-window endpoints only. Units are USD for monetary fields and the stated input unit for thresholds/endpoints. Inputs, settings, sampled input values, axis coordinates, source metadata and categorical data must match exactly.',
})
const finite = value => typeof value === 'number' && Number.isFinite(value)
const clone = value => JSON.parse(JSON.stringify(value))
const numericTolerance = (a, b) => Math.min(NUMERIC_REPLAY_TOLERANCE.maximum, NUMERIC_REPLAY_TOLERANCE.absolute + NUMERIC_REPLAY_TOLERANCE.relative * Math.max(Math.abs(a), Math.abs(b)))
const numericallyEqual = (a, b) => finite(a) && finite(b) && Math.abs(a - b) <= numericTolerance(a, b)
const derivedNumericPath = path => /^analysis\.base\.(physicianMargin|pharmacistMargin|marginDifference)$/.test(path)
  || /^analysis\.oneWay\.\d+\.(min|max|span)$/.test(path)
  || /^analysis\.oneWay\.\d+\.(points\.\d+|minimumPoint|maximumPoint)\.(physicianMargin|pharmacistMargin|marginDifference)$/.test(path)
  || /^analysis\.twoWay\.cells\.\d+\.(physicianMargin|pharmacistMargin|marginDifference)$/.test(path)
  || /^analysis\.thresholds\.\d+\.value$/.test(path)
  || /^analysis\.timeWindows\.\d+\.(min|max)$/.test(path)
function matchesReplay(saved, replayed, path = '') {
  if (saved === replayed) return true
  if (derivedNumericPath(path) && numericallyEqual(saved, replayed)) return true
  if (!saved || !replayed || typeof saved !== 'object' || typeof replayed !== 'object' || Array.isArray(saved) !== Array.isArray(replayed)) return false
  const keys = Object.keys(saved).sort()
  if (keys.join(',') !== Object.keys(replayed).sort().join(',')) return false
  return keys.every(key => matchesReplay(saved[key], replayed[key], path ? `${path}.${key}` : key))
}
const parameterKeys = ['monitorPharmacistMinutes', 'monitorPhysicianMinutes', 'monitorNurseMinutes', 'monitorSupportMinutes', 'qualifiedSupportMinutes', 'qualifiedNurseMinutes', 'qualificationShare', 'collectionShare', 'setupQualificationShare', 'monthlyTechnologyCost', 'deviceCost', 'physicianOversightMinutes', 'pharmacistWage', 'supportWage', 'physicianWage', 'nurseWage', 'fixedCost', 'addedFixedCost', 'monthlyRetention', 'reviewMinutes', 'onboardingMinutes', 'onboardingSupportMinutes']
const defaultBounds = {
  monitorPharmacistMinutes: [0, 60], monitorPhysicianMinutes: [0, 30], monitorNurseMinutes: [0, 60], monitorSupportMinutes: [0, 60],
  qualificationShare: [.4, 1], collectionShare: [.5, 1], setupQualificationShare: [0, 1], monthlyTechnologyCost: [0, 40], deviceCost: [0, 180], physicianOversightMinutes: [0, 10], fixedCost: [0, 10000], addedFixedCost: [0, 10000], monthlyRetention: [.9, 1], reviewMinutes: [0, 60], onboardingMinutes: [0, 30], onboardingSupportMinutes: [0, 40],
}
function checkedInputs(inputs) {
  const errors = validateIntegrationInputs(inputs)
  if (Object.keys(errors).length) { const error = new RangeError('Complete valid model inputs before sensitivity analysis.'); error.errors = errors; throw error }
  return { ...inputs }
}

export function getSensitivityParameters(inputs = DEFAULT_INTEGRATION_INPUTS) {
  const p = checkedInputs(inputs)
  return parameterKeys.map(key => {
    const d = INPUT_DEFINITIONS[key]
    let min = d.min; let max = d.max
    if (key === 'monitorSupportMinutes') min = p.qualifiedSupportMinutes
    if (key === 'monitorNurseMinutes') min = p.qualifiedNurseMinutes
    if (key === 'qualifiedSupportMinutes') max = p.monitorSupportMinutes
    if (key === 'qualifiedNurseMinutes') max = p.monitorNurseMinutes
    const proposed = defaultBounds[key] || (key.endsWith('Wage') ? [p[key] * .75, Math.max(p[key] * 1.25, 1)] : [min, max])
    const low = Math.max(min, Math.min(proposed[0], p[key])); const high = Math.min(max, Math.max(proposed[1], p[key]))
    const subset = key.startsWith('qualified') ? ' Only the qualifying subset changes; paid staff time and labor cost remain fixed. Qualification is an assumption, not established by job title.' : ['monitorSupportMinutes', 'monitorNurseMinutes'].includes(key) ? ' Qualifying minutes remain fixed. The one-way lower bound cannot be below the applied qualifying subset.' : ''
    const clinical = key === 'reviewMinutes' ? ' This changes added review labor only; clinical effects are fixed, and medication savings never enter clinic receipts.' : ''
    const tier = ['monitorPharmacistMinutes', 'monitorPhysicianMinutes', 'qualifiedSupportMinutes', 'qualifiedNurseMinutes'].includes(key) ? ' In Medicare mode this can cross a payment tier; more time need not change margin monotonically.' : ''
    return { key, label: d.label, unit: d.unit, min, max, low, high, current: p[key], evidenceType: d.evidenceType, sourceUrls: [...(d.sourceUrls || [])], note: `${d.description}${subset}${tier}${clinical} Sensitivity bounds are editable investigator stress-test choices, not observed ranges or confidence intervals.` }
  })
}

export function getDefaultSensitivityConfig(inputs = DEFAULT_INTEGRATION_INPUTS) {
  const parameters = getSensitivityParameters(inputs)
  return { metric: 'pharmacistMargin', ranges: Object.fromEntries(parameters.map(p => [p.key, { low: p.low, high: p.high }])), xKey: 'monitorPharmacistMinutes', yKey: 'qualificationShare', gridSize: 9 }
}

export function validateSensitivityConfig(inputs, config) {
  const inputErrors = validateIntegrationInputs(inputs)
  if (Object.keys(inputErrors).length) return { inputs: 'Complete valid model inputs before sensitivity analysis.' }
  if (!config || typeof config !== 'object' || Array.isArray(config)) return { config: 'Supply a complete sensitivity configuration.' }
  const errors = {}; const parameters = getSensitivityParameters(inputs)
  const keys = parameters.map(p => p.key)
  for (const key of Object.keys(config)) if (!['metric', 'ranges', 'xKey', 'yKey', 'gridSize'].includes(key)) errors[key] = 'Unknown sensitivity setting.'
  if (!SENSITIVITY_METRICS.some(m => m.id === config.metric)) errors.metric = 'Choose a supported margin measure.'
  if (!keys.includes(config.xKey)) errors.xKey = 'Choose a supported horizontal parameter.'
  if (!keys.includes(config.yKey)) errors.yKey = 'Choose a supported vertical parameter.'
  if (config.xKey === config.yKey) errors.yKey = 'Choose two different parameters.'
  if (![9, 11].includes(config.gridSize)) errors.gridSize = 'Use a 9 × 9 or 11 × 11 grid.'
  if (!config.ranges || typeof config.ranges !== 'object' || Array.isArray(config.ranges)) { errors.ranges = 'Supply all parameter ranges.'; return errors }
  for (const key of Object.keys(config.ranges)) if (!keys.includes(key)) errors[`ranges.${key}`] = 'Unknown sensitivity parameter.'
  for (const p of parameters) {
    const r = config.ranges[p.key]
    if (!r || typeof r !== 'object' || Array.isArray(r) || Object.keys(r).sort().join(',') !== 'high,low' || !finite(r.low) || !finite(r.high) || r.low < p.min || r.high > p.max || (p.min === p.max ? r.low !== r.high || r.low !== p.min : r.low >= r.high)) errors[`ranges.${p.key}`] = p.min === p.max ? `This parameter is fixed at ${p.min} by the applied staff-time constraint.` : `Enter lower < upper within ${p.min} to ${p.max}.`
  }
  return errors
}

function checkedConfig(inputs, config) {
  const errors = validateSensitivityConfig(inputs, config)
  if (Object.keys(errors).length) { const error = new RangeError('Correct sensitivity settings before analysis.'); error.errors = errors; throw error }
  return clone(config)
}
const metrics = result => ({ physicianMargin: result.baseline.operatingMargin, pharmacistMargin: result.integrated.operatingMargin, marginDifference: result.integrated.operatingMargin - result.baseline.operatingMargin })
function evaluate(inputs) {
  const errors = validateIntegrationInputs(inputs)
  if (Object.keys(errors).length) return { valid: false, physicianMargin: null, pharmacistMargin: null, marginDifference: null, errors }
  const values = metrics(expectedIntegrationStudy(inputs))
  if (Object.values(values).some(value => !finite(value))) return { valid: false, physicianMargin: null, pharmacistMargin: null, marginDifference: null, errors: { calculation: 'Nonfinite model result.' } }
  return { valid: true, ...values }
}
const gridValues = (low, high, size) => low === high ? [low] : Array.from({ length: size }, (_, i) => i === size - 1 ? high : low + (high - low) * i / (size - 1))
function billingBreaks(inputs, key) {
  if (inputs.reimbursementMode !== 'medicare2026') return []
  const otherMinutes = { monitorPharmacistMinutes: inputs.qualifiedSupportMinutes, qualifiedSupportMinutes: inputs.monitorPharmacistMinutes, monitorPhysicianMinutes: inputs.qualifiedNurseMinutes, qualifiedNurseMinutes: inputs.monitorPhysicianMinutes }[key]
  if (otherMinutes === undefined) return []
  return [10, 20, 40, 60, 80].map(tier => tier - otherMinutes)
}
function oneWayValues(inputs, key, low, high) {
  const values = gridValues(low, high, 21)
  if (inputs[key] >= low && inputs[key] <= high) values.push(inputs[key])
  for (const boundary of billingBreaks(inputs, key)) if (boundary >= low && boundary <= high) {
    values.push(boundary)
    const epsilon = Math.min(1e-6, (high - low) / 1000000)
    if (boundary - epsilon >= low) values.push(boundary - epsilon)
    if (boundary + epsilon <= high) values.push(boundary + epsilon)
  }
  return [...new Set(values)].sort((a, b) => a - b)
}

function threshold(id, label, arm, unit, numerator, denominator, direction, note) {
  if (!(denominator > 0)) return { id, label, arm, unit, value: null, status: (direction === 'minimum' ? numerator <= 1e-8 : numerator >= -1e-8) ? 'not-limiting' : 'not-attainable', note: `This input has no financial effect in the applied scenario. ${note}` }
  const raw = numerator / denominator
  const value = direction === 'minimum' ? Math.max(0, raw) : raw
  const status = direction === 'minimum' ? value > 1 ? 'exceeds-100-percent' : value === 0 ? 'already-covered-at-zero' : 'attainable' : value < 0 ? 'negative-price-required' : 'attainable'
  return { id, label, arm, unit, value, status, note }
}
function financialThresholds(inputs, result) {
  return ['baseline', 'integrated'].flatMap(arm => {
    const row = result[arm]; const schedule = getRpmPaymentSchedule(inputs, arm)
    const allowed = row.qualifiedMonths * schedule.monthlyBenchmark + row.qualifiedSetups * schedule.setupFee
    return [
      threshold(`${arm}-collection`, 'Minimum collection realization', arm, 'probability', row.programCost, allowed, 'minimum', 'Both recurring and setup receipts vary together; workload, qualification and costs stay fixed. Above 100% is unattainable within the model.'),
      threshold(`${arm}-qualification`, 'Minimum revenue-qualifying monthly share', arm, 'probability', row.programCost - row.setupRevenue, row.activeMonths * schedule.monthlyBenchmark * inputs.collectionShare, 'minimum', 'Setup receipts stay fixed. All active months still incur costs. Above 100% is unattainable within the model.'),
      threshold(`${arm}-technology`, 'Maximum monthly vendor package fee', arm, 'USD/month', row.operatingMargin + row.costBreakdown.software, row.activeMonths, 'maximum', 'Only the monthly vendor package fee changes. Negative values mean that even a zero fee cannot cover the remaining costs; a subsidy or other change would be needed.'),
      threshold(`${arm}-device`, 'Maximum one-time vendor/device fee', arm, 'USD/new start', row.operatingMargin + row.costBreakdown.devices, row.newInitiations, 'maximum', 'Only the one-time fee changes; clinic onboarding labor remains. With no new starts, this fee has no effect. A negative maximum is not a feasible nonnegative price.'),
    ]
  })
}

// Within one payment tier, pharmacist time changes cost linearly. Resolve roots
// inside each tier separately, and evaluate its endpoints independently so a
// reimbursement jump can never be mistaken for a continuous break-even root.
function pharmacistTimeWindows(inputs, config) {
  const { low, high } = config.ranges.monitorPharmacistMinutes
  const boundaries = [...new Set([low, high, ...billingBreaks(inputs, 'monitorPharmacistMinutes').filter(x => x > low && x < high)])].sort((a, b) => a - b)
  const evaluateAt = value => evaluate({ ...inputs, monitorPharmacistMinutes: value })
  const windows = []
  for (const metric of ['pharmacistMargin', 'marginDifference']) {
    const found = []
    for (let i = 0; i < boundaries.length - 1; i++) {
      const a = boundaries[i]; const b = boundaries[i + 1]
      const left = a + (b - a) / 3; const right = a + 2 * (b - a) / 3
      const fLeft = evaluateAt(left)[metric]; const fRight = evaluateAt(right)[metric]
      const slope = (fRight - fLeft) / (right - left)
      let min = a; let max = b
      if (Math.abs(slope) < 1e-9) { if (fLeft < -1e-7) continue }
      else {
        const root = left - fLeft / slope
        if (slope < 0) max = Math.min(b, root); else min = Math.max(a, root)
      }
      if (min > max || max < a || min > b) continue
      const lowerInclusive = evaluateAt(min)[metric] >= -1e-7
      const upperInclusive = evaluateAt(max)[metric] >= -1e-7
      if (min === max && !(lowerInclusive && upperInclusive)) continue
      found.push({ min, max, lowerInclusive, upperInclusive })
    }
    for (const value of boundaries) if (evaluateAt(value)[metric] >= -1e-7 && !found.some(w => value > w.min && value < w.max || value === w.min && w.lowerInclusive || value === w.max && w.upperInclusive)) found.push({ min: value, max: value, lowerInclusive: true, upperInclusive: true })
    found.sort((a, b) => a.min - b.min)
    const merged = []
    for (const window of found) {
      const previous = merged[merged.length - 1]
      if (previous && window.min === previous.max && (previous.upperInclusive || window.lowerInclusive)) { previous.max = window.max; previous.upperInclusive = window.upperInclusive }
      else merged.push({ ...window })
    }
    windows.push(...merged.map(window => ({ metric, parameter: 'monitorPharmacistMinutes', ...window, note: 'Financially nonnegative only within the selected time range and fixed other assumptions. Payment tiers can create separate intervals. This is not evidence that the clinical workload is sufficient or safe.' })))
  }
  return windows
}

export function analyzeIntegrationSensitivity(inputs = DEFAULT_INTEGRATION_INPUTS, config = getDefaultSensitivityConfig(inputs)) {
  const p = checkedInputs(inputs); const c = checkedConfig(p, config)
  const parameters = getSensitivityParameters(p)
  const result = expectedIntegrationStudy(p); const base = metrics(result)
  const oneWay = parameters.map(parameter => {
    const { key, label, unit, current, sourceUrls, note } = parameter; const { low, high } = c.ranges[key]
    const points = oneWayValues(p, key, low, high).map(value => ({ value, ...evaluate({ ...p, [key]: value }) }))
    const valid = points.filter(point => point.valid)
    const minimumPoint = valid.reduce((best, point) => !best || point[c.metric] < best[c.metric] && !numericallyEqual(point[c.metric], best[c.metric]) ? point : best, null)
    const maximumPoint = valid.reduce((best, point) => !best || point[c.metric] > best[c.metric] && !numericallyEqual(point[c.metric], best[c.metric]) ? point : best, null)
    const min = minimumPoint?.[c.metric] ?? null; const max = maximumPoint?.[c.metric] ?? null
    return { key, label, unit, current, low, high, points, min, max, span: min === null || max === null ? null : max - min, minimumPoint, maximumPoint, sourceUrls, note }
  }).sort((a, b) => numericallyEqual(a.span, b.span) ? parameterKeys.indexOf(a.key) - parameterKeys.indexOf(b.key) : (b.span ?? -1) - (a.span ?? -1))
  const axis = key => { const parameter = parameters.find(p => p.key === key); const range = c.ranges[key]; return { key, label: parameter.label, unit: parameter.unit, values: gridValues(range.low, range.high, c.gridSize) } }
  const x = axis(c.xKey); const y = axis(c.yKey)
  const cells = y.values.flatMap(yValue => x.values.map(xValue => ({ x: xValue, y: yValue, ...evaluate({ ...p, [c.xKey]: xValue, [c.yKey]: yValue }) })))
  return {
    analysisVersion: VERSION, modelVersion: INTEGRATION_MODEL_METADATA.version, analysisBasis: BASIS, numericReplayTolerance: clone(NUMERIC_REPLAY_TOLERANCE), base, config: c, parameters, oneWay, twoWay: { x, y, cells }, thresholds: financialThresholds(p, result), timeWindows: pharmacistTimeWindows(p, c), appliedStaffingEvidence: getStaffingEvidence(p), methodSourceUrls: [ISPOR_URL], methodSources: [{ title: 'ISPOR budget-impact good-practice guidance (2014)', url: ISPOR_URL, description: 'Supports transparent decision-maker-specific scenario analysis and model validation; does not establish these stress-test bounds.' }],
    notes: [
      'Deterministic sensitivity analysis uses analytic expected values, independently of playback progress and simulation seed. It is not a probability of profitability, a confidence interval, or a probabilistic sensitivity analysis.',
      'One-way analysis changes one entered parameter at a time. The two-way grid changes exactly its two axes; all remaining inputs are fixed. Invalid paid/qualifying staff-time combinations are unavailable rather than clamped or assigned zero.',
      'Ranking depends on the selected metric and investigator-selected ranges. Reported one-way extrema are over evaluated samples, not guaranteed continuous extrema for nonlinear parameters. Bounds are illustrative stress tests, not evidence-based uncertainty distributions. Cost and clinical equivalence are not established by these experiments.',
      'Medicare time-tier changes are included in one-way samples. The two-way grid is a discrete set of evaluated points; do not interpolate payment steps or assume an unevaluated cell is feasible.',
      'Margin difference is pharmacist-program margin minus physician-program margin. Common costs or receipts can affect both absolute margins while canceling from their difference. Medication savings remain outside clinic margin.',
      'Thresholds hold other inputs fixed and reflect the applied oversight cost allocation. Resource savings do not necessarily reduce cash payroll. Financial feasibility does not establish clinical sufficiency, staffing capacity, or billing eligibility.',
    ],
  }
}

export function createSensitivityExport(inputs, config = getDefaultSensitivityConfig(inputs)) {
  const p = checkedInputs(inputs); const c = checkedConfig(p, config)
  return { schemaVersion: 1, analysisVersion: VERSION, modelVersion: INTEGRATION_MODEL_METADATA.version, inputs: clone(p), config: c, analysis: analyzeIntegrationSensitivity(p, c) }
}
export function verifySensitivityExport(bundle) {
  if (!bundle || Object.keys(bundle).sort().join(',') !== 'analysis,analysisVersion,config,inputs,modelVersion,schemaVersion' || bundle.schemaVersion !== 1 || bundle.analysisVersion !== VERSION || bundle.modelVersion !== INTEGRATION_MODEL_METADATA.version) throw new Error('Sensitivity export version/schema mismatch; retain the matching analysis and model engines.')
  const replay = createSensitivityExport(bundle.inputs, bundle.config)
  if (!matchesReplay(bundle, replay)) throw new Error('Sensitivity export failed reproducible replay; inputs, provenance and structure must match exactly, with only the documented floating-point tolerance for computed results.')
  return bundle
}
const csvCell = value => '"' + String(value ?? '').replace(/"/g, '""') + '"'
export function sensitivityExportCsv(bundle) {
  verifySensitivityExport(bundle)
  const a = bundle.analysis
  const columns = ['row_type', 'parameter', 'x_value', 'y_parameter', 'y_value', 'valid', 'physician_margin', 'pharmacist_margin', 'margin_difference', 'threshold_id', 'arm', 'threshold_value', 'unit', 'status', 'details_json', 'model_version', 'analysis_version', 'analysis_basis', 'inputs_json', 'config_json', 'metadata_json']
  const metadata = JSON.stringify({ parameters: a.parameters, appliedStaffingEvidence: a.appliedStaffingEvidence, methodSourceUrls: a.methodSourceUrls, methodSources: a.methodSources, numericReplayTolerance: a.numericReplayTolerance, notes: a.notes })
  const rows = [columns]
  // File-level provenance is stored in the base row, avoiding repetition of
  // the complete evidence catalogue in every sampled scenario.
  const append = fields => {
    const baseRow = fields[0] === 'base'
    rows.push([...fields, bundle.modelVersion, bundle.analysisVersion, a.analysisBasis, baseRow ? JSON.stringify(bundle.inputs) : '', baseRow ? JSON.stringify(bundle.config) : '', baseRow ? metadata : ''])
  }
  append(['base', '', '', '', '', true, a.base.physicianMargin, a.base.pharmacistMargin, a.base.marginDifference, '', '', '', '', '', ''])
  for (const row of a.oneWay) for (const point of row.points) append(['one-way', row.key, point.value, '', '', point.valid, point.physicianMargin, point.pharmacistMargin, point.marginDifference, '', '', '', row.unit, '', JSON.stringify({ errors: point.errors || {}, range: { low: row.low, high: row.high }, note: row.note })])
  for (const cell of a.twoWay.cells) append(['two-way', a.twoWay.x.key, cell.x, a.twoWay.y.key, cell.y, cell.valid, cell.physicianMargin, cell.pharmacistMargin, cell.marginDifference, '', '', '', '', '', JSON.stringify(cell.errors || {})])
  for (const row of a.thresholds) append(['threshold', '', '', '', '', '', '', '', '', row.id, row.arm, row.value, row.unit, row.status, JSON.stringify({ label: row.label, note: row.note })])
  for (const row of a.timeWindows) append(['time-window', row.parameter, row.min, '', row.max, '', '', '', '', row.metric, '', '', 'minutes/active month', 'nonnegative-interval', JSON.stringify(row)])
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n'
}
