import { DEFAULT_INTEGRATION_INPUTS, getIntegrationScenarios } from './integrationStudy.js'

export const INITIAL_STUDY_SCENARIO_ID = 'nurse-team-60-40'

// Opening or reloading the website starts a fresh, reproducible paired scenario.
// The engine's reference inputs and all other selectable presets stay unchanged.
export function getInitialStudyScenario() {
  return getIntegrationScenarios(DEFAULT_INTEGRATION_INPUTS).find(scenario => scenario.id === INITIAL_STUDY_SCENARIO_ID)
}
