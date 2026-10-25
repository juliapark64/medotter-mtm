// Single source of truth shared with the browser and scenario exports.
import { CALCULATOR_DEFAULTS } from '../src/data/calculatorDefaults.js'
export const INPUT_RANGES = Object.fromEntries(Object.entries(CALCULATOR_DEFAULTS).map(([key, d]) => [key, {
  label: d.label, unit: d.unit, low: d.low, high: d.high,
  source: 'Exploratory scenario bounds, not confidence intervals. ' + d.source
}]))
export default INPUT_RANGES
