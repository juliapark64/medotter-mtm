import { readFile } from 'node:fs/promises'
import { verifyRecruitmentExport } from '../src/lib/recruitmentSimulation.js'

const args = process.argv.slice(2)
if (args.length !== 1 || args[0] === '--help' || args[0] === '-h') {
  console.log('Usage: node scripts/replayRecruitment.js <recruitment-export.json>')
  process.exitCode = args.length === 1 && ['--help', '-h'].includes(args[0]) ? 0 : 2
} else {
  try {
    const bundle = verifyRecruitmentExport(JSON.parse(await readFile(args[0], 'utf8')))
    const { summary, expected, inputs, modelVersion } = bundle
    const count = value => value.toLocaleString('en-US')
    const estimate = value => value.toFixed(2)
    const signed = (value, format = String) => `${value < 0 ? '-' : '+'}${format(Math.abs(value))}`
    console.log(`Verified model ${modelVersion}; N=${count(inputs.N)}; seed=${inputs.seed}.`)
    console.log(`Physician: ${count(summary.physician.referred)} referred; ${count(summary.physician.initiated)} initiated (expected ${estimate(expected.physician.initiated)}).`)
    console.log(`MTM: ${count(summary.pharmacist.inReviewPopulation)} in review population; ${count(summary.pharmacist.reviewCompleted)} reviews; ${count(summary.pharmacist.offered)} offers; ${count(summary.pharmacist.initiated)} initiated (expected ${estimate(expected.pharmacist.initiated)}).`)
    console.log(`MTM minus physician: ${signed(summary.difference.initiated)} initiations (expected ${signed(expected.difference.initiated, estimate)}).`)
    console.log('Synthetic scenario only. Initiation means at least one transmitted BP reading; no clinical or financial benefit is estimated.')
  } catch (error) {
    console.error(`Replay failed: ${error.message}`)
    process.exitCode = 1
  }
}
