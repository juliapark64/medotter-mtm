import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { verifyIntegrationExport } from '../src/lib/integrationStudy.js'

const usage = 'Usage: node scripts/replayIntegrationStudy.js <scenario.json>'
const args = process.argv.slice(2)

if (args.length === 1 && ['--help', '-h'].includes(args[0])) {
  console.log(usage)
} else if (args.length !== 1 || args[0].startsWith('-')) {
  console.error(usage)
  process.exitCode = 1
} else {
  try {
    const path = resolve(args[0])
    const bundle = verifyIntegrationExport(JSON.parse(readFileSync(path, 'utf8')))
    const summarize = result => ({
      physicianProgram: { participants: result.baseline.totalParticipants, collections: result.baseline.revenue, costs: result.baseline.programCost, margin: result.baseline.operatingMargin },
      pharmacistProgram: { participants: result.integrated.totalParticipants, collections: result.integrated.revenue, costs: result.integrated.programCost, margin: result.integrated.operatingMargin },
      additionalInitiations: result.delta.newInitiations,
      financialImpactOfSwitching: result.delta.operatingMargin,
      incrementalNetFinancialBenefit: result.delta.netFinancialBenefit,
      incrementalNetBenefitPer1000: result.delta.netBenefitPer1000,
      incrementalClinicalOutcomes: result.delta.clinical
    })
    console.log(JSON.stringify({
      verified: true,
      file: path,
      modelId: bundle.modelId,
      modelVersion: bundle.modelVersion,
      schemaVersion: bundle.schemaVersion,
      seed: bundle.inputs.seed,
      population: bundle.inputs.N,
      perspective: bundle.inputs.perspective,
      comparisonMode: bundle.inputs.comparisonMode,
      physicianOversightCostMode: bundle.inputs.physicianOversightCostMode,
      clinicalMode: bundle.inputs.clinicalMode,
      recruitmentMode: bundle.inputs.recruitmentMode,
      minorExtrapolation: bundle.inputs.minorExtrapolation,
      expected: summarize(bundle.expected),
      simulated: summarize(bundle.actual),
      interpretation: 'Exact computational replay passed. This does not validate clinical assumptions or demonstrate observed financial benefit.'
    }, null, 2))
  } catch (error) {
    console.error(`Integration study verification failed: ${error.message}`)
    process.exitCode = 1
  }
}
