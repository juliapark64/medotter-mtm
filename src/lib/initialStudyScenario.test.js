import test from 'node:test'
import assert from 'node:assert/strict'
import { expectedIntegrationStudy } from './integrationStudy.js'
import { getInitialStudyScenario } from './initialStudyScenario.js'

test('website opens with the paired nurse-supported physician and 60:40 pharmacy staffing budget', () => {
  const { id, inputs } = getInitialStudyScenario()
  assert.equal(id, 'nurse-team-60-40')
  assert.deepEqual(
    [inputs.monitorPhysicianMinutes, inputs.monitorNurseMinutes, inputs.monitorAssistantMinutes, inputs.monitorPharmacistMinutes, inputs.monitorSupportMinutes],
    [3, 17, 10, 12, 18],
  )
  assert.deepEqual(
    [inputs.N, inputs.seed, inputs.qualifiedSupportMinutes, inputs.physicianOversightMinutes, inputs.physicianOversightCostMode, inputs.clinicalMode],
    [1000, 2027, 8, 1, 'additional-time', 'unestimated'],
  )
  const result = expectedIntegrationStudy(inputs)
  assert.ok(Math.abs(result.baseline.operatingMargin - 27645.63311457271) < 1e-7)
  assert.ok(Math.abs(result.integrated.operatingMargin - 38815.76766354579) < 1e-7)
})
