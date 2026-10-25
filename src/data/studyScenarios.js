import { getBaseInputs } from './calculatorDefaults.js'
import { getGeisingerScenarios } from './deprescribingScenarios.js'

// Keep the selected study reference explicit; do not relabel generic assumptions as study evidence.
export function getStudyBaseScenario() {
  const scenario = getGeisingerScenarios(getBaseInputs(), 'Combined')[0]
  return { ...scenario, id: 'study-base', name: 'Health-plan base case — Geisinger-informed' }
}
