import { createContext, useContext, useState } from 'react'
import { simulateIntegrationStudy } from '../lib/integrationStudy'
import { getDefaultSensitivityConfig } from '../lib/integrationSensitivity'
import { getInitialStudyScenario } from '../lib/initialStudyScenario'

const IntegrationStudyContext = createContext(null)

export function IntegrationStudyProvider({ children }) {
  const [initialScenario] = useState(getInitialStudyScenario)
  const [run, setRun] = useState(() => simulateIntegrationStudy(initialScenario.inputs))
  const [sensitivityConfig, setSensitivityConfig] = useState(() => getDefaultSensitivityConfig(run.inputs))
  const [notice, setNotice] = useState(() => `Website default loaded: ${initialScenario.name}.`)
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
