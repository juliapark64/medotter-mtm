import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { verifySensitivityExport } from '../src/lib/integrationSensitivity.js'

const usage = 'Usage: node scripts/replaySensitivity.js <sensitivity.json>'
const args = process.argv.slice(2)

if (args.length === 1 && ['--help', '-h'].includes(args[0])) {
  console.log(usage)
} else if (args.length !== 1 || args[0].startsWith('-')) {
  console.error(usage)
  process.exitCode = 1
} else {
  try {
    const file = resolve(args[0])
    const bundle = verifySensitivityExport(JSON.parse(readFileSync(file, 'utf8')))
    console.log(JSON.stringify({
      verified: true,
      file,
      modelVersion: bundle.modelVersion,
      analysisVersion: bundle.analysisVersion,
      analysisBasis: bundle.analysis.analysisBasis,
      numericReplayTolerance: bundle.analysis.numericReplayTolerance,
      metric: bundle.config.metric,
      base: bundle.analysis.base,
      leadingDrivers: bundle.analysis.oneWay.slice(0, 5).map(({ key, label, low, high, min, max, span }) => ({ key, label, low, high, min, max, span })),
      thresholds: bundle.analysis.thresholds,
      timeWindows: bundle.analysis.timeWindows,
      interpretation: 'Computational replay passed within the documented numeric tolerance for derived results; assumptions and configuration match exactly. Stress-test ranges are assumptions, not confidence intervals. Mathematical break-even does not establish clinical feasibility or observed profit.'
    }, null, 2))
  } catch (error) {
    console.error(`Sensitivity verification failed: ${error.message}`)
    process.exitCode = 1
  }
}
