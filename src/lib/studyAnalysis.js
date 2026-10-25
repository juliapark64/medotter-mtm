import { calculateProjection, MODES } from './valueCalculator.js'

export function calculateStudyAnalysis(inputs) {
  const arms = Object.values(MODES).map(mode => ({ mode, result: calculateProjection(inputs, mode, 1) }))
  const combined = arms.find(arm => arm.mode === MODES.COMBINED).result
  if (!combined.isComplete) return { isComplete: false, arms, combined, implementationThreshold: null }

  const atZero = calculateProjection({ ...inputs, implementationRate: 0 }, MODES.COMBINED, 1).years[0]
  const atFull = calculateProjection({ ...inputs, implementationRate: 1 }, MODES.COMBINED, 1).years[0]
  const improvement = atZero.netImpact - atFull.netImpact
  let implementationThreshold
  if (atZero.netImpact <= 0) implementationThreshold = { status: 'already-covered', rate: 0 }
  else if (improvement <= 0) implementationThreshold = { status: 'unattainable', rate: null }
  else {
    const rate = atZero.netImpact / improvement
    implementationThreshold = { status: rate <= 1 ? 'attainable' : 'unattainable', rate }
  }
  const row = combined.years[0]
  return { isComplete: true, arms, combined, implementationThreshold,
    noCvNetImpact: row.programCost - row.avoidedDrug,
    noCvNetPMPM: (row.programCost - row.avoidedDrug) / (Number(inputs.lives) * 12) }
}
