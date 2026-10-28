import { createContext, useContext, useState } from 'react'
import { DEFAULT_INTEGRATION_INPUTS, getIntegrationScenarios, simulateIntegrationStudy } from '../lib/integrationStudy'
import { getDefaultSensitivityConfig } from '../lib/integrationSensitivity'

const IntegrationStudyContext = createContext(null)

export function IntegrationStudyProvider({ children }) {
  const [run, setRun] = useState(() => simulateIntegrationStudy(getIntegrationScenarios(DEFAULT_INTEGRATION_INPUTS).find(scenario => scenario.id === 'delivery').inputs))
  const [sensitivityConfig, setSensitivityConfig] = useState(() => getDefaultSensitivityConfig(run.inputs))
  const [notice, setNotice] = useState('')
  const applyInputs = next => {
    const nextRun = simulateIntegrationStudy(next)
    if (Object.keys(run.inputs).some(key => key !== 'seed' && nextRun.inputs[key] !== run.inputs[key])) {
      setSensitivityConfig(getDefaultSensitivityConfig(nextRun.inputs))
    }
    setRun(nextRun)
    return nextRun
  }
  return <IntegrationStudyContext.Provider value={{ inputs: run.inputs, run, applyInputs, notice, setNotice, sensitivityConfig, setSensitivityConfig }}>{children}</IntegrationStudyContext.Provider>
}

export function useIntegrationStudy() {
  const value = useContext(IntegrationStudyContext)
  if (!value) throw new Error('Integration study provider is missing.')
  return value
}
