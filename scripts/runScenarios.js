import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'
import { getBaseInputs, MODEL_METADATA } from '../src/data/calculatorDefaults.js'
import { MODES } from '../src/lib/valueCalculator.js'
import { getStudyBaseScenario } from '../src/data/studyScenarios.js'
import { getScenarioDefinitions, createScenarioBundle, verifyScenarioBundle, bundleToCsv } from '../src/lib/scenarioExports.js'

export { getBaseInputs, getScenarioDefinitions }
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceFiles = ['src/data/calculatorDefaults.js', 'src/data/deprescribingScenarios.js', 'src/data/studyScenarios.js', 'src/lib/valueCalculator.js', 'src/lib/studyAnalysis.js', 'src/lib/scenarioExports.js', 'scripts/runScenarios.js']
const sha = text => createHash('sha256').update(text).digest('hex')

export async function runAllScenarios({ outDir, replay, verifyOnly = false } = {}) {
  const base = getStudyBaseScenario()
  const definitions = getScenarioDefinitions(base.inputs, MODES.COMBINED, true, base.evidenceProfileId)
  definitions[0].name = base.name
  const bundle = replay
    ? await verifyScenarioBundle(JSON.parse(fs.readFileSync(path.resolve(replay), 'utf8')))
    : await createScenarioBundle(definitions, {
      notes: 'Hypothetical health-plan study: one-year combined-program net budget impact PMPM is primary; three-year results are secondary. Standard MTM is the comparator. Geisinger informs only the recommendation yield and implementation reference; costs, incremental effects, and persistence remain assumptions. Includes program arms, plan size, implementation, RPM uptake, no added deprescribing benefit, no CV cost offset, and exploratory one-way sensitivity scenarios.'
    })
  if (verifyOnly) {
    if (!replay) throw new Error('--verify-only requires --replay <scenario JSON>.')
    return { verified: bundle.scenarios.length }
  }
  const output = outDir ? path.resolve(outDir) : path.join(root, 'results', 'health-plan-study-v3', new Date().toISOString().replace(/[:.]/g, '-'))
  if (fs.existsSync(output)) throw new Error('Output directory already exists; choose a new directory to preserve prior runs: ' + output)
  fs.mkdirSync(output, { recursive: true })
  const json = JSON.stringify(bundle, null, 2) + '\n'
  const csv = bundleToCsv(bundle)
  fs.writeFileSync(path.join(output, 'scenarios.json'), json, { flag: 'wx' })
  fs.writeFileSync(path.join(output, 'scenario_results.csv'), csv, { flag: 'wx' })
  const sourceHashes = {}
  for (const file of sourceFiles) {
    const contents = fs.readFileSync(path.join(root, file))
    const target = path.join(output, 'model-source', file)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, contents, { flag: 'wx' })
    sourceHashes[file] = sha(contents)
  }
  fs.writeFileSync(path.join(output, 'model-source', 'package.json'), JSON.stringify({ private: true, type: 'module', version: MODEL_METADATA.version }, null, 2) + '\n')
  fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify({
    modelVersion: MODEL_METADATA.version,
    sha256: { 'scenarios.json': sha(json), 'scenario_results.csv': sha(csv), ...Object.fromEntries(Object.entries(sourceHashes).map(([k, v]) => ['model-source/' + k, v])) }
  }, null, 2) + '\n')
  fs.writeFileSync(path.join(output, 'REPLAY.txt'), 'Requires Node.js 20 or newer. No package installation needed for replay.\nFrom this folder run:\nnode model-source/scripts/runScenarios.js --replay scenarios.json --verify-only\n\nCSV includes annual and cumulative results, every input, sources, and assumptions.\nJSON is the replay format. Source files and SHA-256 checksums preserve this model implementation.\n')
  return { output, scenarios: bundle.scenarios.length, base: bundle.scenarios[0].results }
}

async function main() {
  const args = process.argv.slice(2)
  const options = {}
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--verify-only') options.verifyOnly = true
    else if (['--outdir', '--replay'].includes(args[i])) {
      if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error('Missing value for ' + args[i])
      options[args[i] === '--outdir' ? 'outDir' : 'replay'] = args[++i]
    } else throw new Error('Unknown argument: ' + args[i])
  }
  const result = await runAllScenarios(options)
  if (result.verified) console.log('Verified ' + result.verified + ' scenarios against saved inputs and results.')
  else console.log('Exported ' + result.scenarios + ' scenarios to ' + result.output)
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1 })
}
