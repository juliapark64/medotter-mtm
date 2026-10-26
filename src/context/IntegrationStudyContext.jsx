import { createContext, useContext, useState } from 'react'
import { DEFAULT_INTEGRATION_INPUTS, simulateIntegrationStudy } from '../lib/integrationStudy'

const IntegrationStudyContext = createContext(null)

export function IntegrationStudyProvider({ children }) {
  const [run, setRun] = useState(() => simulateIntegrationStudy(DEFAULT_INTEGRATION_INPUTS))
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
