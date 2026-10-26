import { createContext, useContext, useState } from 'react'
import { DEFAULT_INTEGRATION_INPUTS, getIntegrationScenarios, simulateIntegrationStudy } from '../lib/integrationStudy'

const IntegrationStudyContext = createContext(null)

export function IntegrationStudyProvider({ children }) {
  const [run, setRun] = useState(() => simulateIntegrationStudy(getIntegrationScenarios(DEFAULT_INTEGRATION_INPUTS).find(scenario => scenario.id === 'physician-led-minor').inputs))
  const [notice, setNotice] = useState('')
  const applyInputs = next => {
    const nextRun = simulateIntegrationStudy(next)
    setRun(nextRun)
    return nextRun
  }
  return <IntegrationStudyContext.Provider value={{ inputs: run.inputs, run, applyInputs, notice, setNotice }}>{children}</IntegrationStudyContext.Provider>
}

export function useIntegrationStudy() {
  const value = useContext(IntegrationStudyContext)
  if (!value) throw new Error('Integration study provider is missing.')
  return value
}
