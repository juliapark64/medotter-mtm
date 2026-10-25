import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'
import { PROVIDER_MODEL, getProviderInputs } from '../src/data/providerDefaults.js'
import { createProviderBundle, verifyProviderBundle, providerBundleToCsv } from '../src/lib/providerExports.js'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sources = ['src/data/calculatorDefaults.js', 'src/data/deprescribingScenarios.js', 'src/data/providerDefaults.js', 'src/data/providerEvidence.js',
  'src/lib/valueCalculator.js', 'src/lib/scenarioExports.js', 'src/lib/providerFeasibility.js', 'src/lib/providerExports.js', 'scripts/runProviderScenarios.js', 'docs/provider-feasibility-model.md']
const sha = contents => createHash('sha256').update(contents).digest('hex')

export async function runProviderScenarios({ outDir, replay, verifyOnly = false } = {}) {
  if (verifyOnly && !replay) throw new Error('--verify-only requires --replay <provider JSON>.')
  const bundle = replay ? await verifyProviderBundle(JSON.parse(fs.readFileSync(path.resolve(replay), 'utf8'))) :
    await createProviderBundle(getProviderInputs(), { notes: 'Evidence-informed comparison: 2024 setting-specific wages with explicit carry-forward and employment-load assumptions; historical $50 community CMR fee before collections; CDTA plus a paid RPM arrangement assumed for all RPM participants in both settings. Pharmacy receives an illustrative 80% of billing-practice collections derived from 2026 national nonfacility fees; clinic retains its own external collections. CDTA alone does not establish a rate. Code qualification and collections remain assumptions. No separate clinic review payment is presumed. No internal transfers or payer cost offsets are provider income. Act review fees remain hypothetical; additional Act RPM eligibility is zero. Source years and citations are preserved.' })
  if (verifyOnly) return { verified: bundle.results.scenarios.length }
  const output = outDir ? path.resolve(outDir) : path.join(root, 'results', 'provider-feasibility', new Date().toISOString().replace(/[:.]/g, '-'))
  if (fs.existsSync(output)) throw new Error('Output directory already exists; choose a new directory to preserve prior runs.')
  fs.mkdirSync(output, { recursive: true })
  const hashes = {}
  const save = (filename, contents) => {
    fs.mkdirSync(path.dirname(path.join(output, filename)), { recursive: true })
    fs.writeFileSync(path.join(output, filename), contents, { flag: 'wx' }); hashes[filename] = sha(contents)
  }
  save('provider_scenarios.json', JSON.stringify(bundle, null, 2) + '\n')
  save('provider_results.csv', providerBundleToCsv(bundle))
  save('MODEL-NOTES.md', fs.readFileSync(path.join(root, 'docs/provider-feasibility-model.md')))
  for (const file of sources) save('model-source/' + file, fs.readFileSync(path.join(root, file)))
  save('model-source/package.json', JSON.stringify({ private: true, type: 'module', version: PROVIDER_MODEL.version }, null, 2) + '\n')
  save('REPLAY.txt', 'Requires Node.js 20 or newer; no package installation required.\nFrom this folder:\nnode model-source/scripts/runProviderScenarios.js --replay provider_scenarios.json --verify-only\n\nSix provider scenarios; CSV has three annual rows plus a cumulative row per scenario.\nPositive operating margin is surplus. Break-even is constant annual enrollment over three years.\nAll inputs, sources and policy assumptions travel with both formats. This is a hypothetical financial feasibility model, not evidence of actual reimbursement eligibility or profitability.\n')
  fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify({ model: PROVIDER_MODEL.id, modelVersion: PROVIDER_MODEL.version, sha256: hashes }, null, 2) + '\n', { flag: 'wx' })
  return { output, scenarios: bundle.results.scenarios.length }
}
async function main() {
  const args = process.argv.slice(2), options = {}
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--verify-only') options.verifyOnly = true
    else if (['--outdir', '--replay'].includes(args[i])) {
      if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error('Missing argument for ' + args[i])
      options[args[i] === '--outdir' ? 'outDir' : 'replay'] = args[++i]
    } else throw new Error('Unknown argument: ' + args[i])
  }
  const result = await runProviderScenarios(options)
  console.log(result.verified ? 'Verified ' + result.verified + ' provider scenarios.' : 'Exported ' + result.scenarios + ' provider scenarios to ' + result.output)
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch(error => { console.error(error.message); process.exitCode = 1 })
