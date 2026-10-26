const assumption = 'Illustrative investigator assumption; not a measured clinic estimate.'
const field = (label, group, value, unit, min, max, description, extra = {}) => ({ label, group, default: value, unit, min, max, step: 'any', description, evidenceType: 'Assumption', ...extra })
const probability = (label, group, value, description, extra = {}) => field(label, group, value, 'probability', 0, 1, description, { step: .01, ...extra })
export const INPUT_DEFINITIONS = {
  N: field('RPM-eligible population', 'Population and recruitment', 1000, 'members', 1, 10000, 'Same eligible population in both scenarios.', { step: 1, integer: true }),
  seed: field('Simulation seed', 'Population and recruitment', 2027, 'integer', 0, 4294967295, 'Reproduces synthetic patients; not a source of clinical evidence.', { step: 1, integer: true }),
  perspective: { label: 'Financial perspective', group: 'Financial boundary', default: 'consolidated', unit: '', options: ['consolidated', 'clinic'], description: 'Consolidated system retains modeled drug savings; clinic operating margin excludes those savings. Only external receipts count as revenue.', evidenceType: 'Model choice' },
  existingRpmShare: probability('Already receiving RPM', 'Population and recruitment', .05, 'Existing participants appear in both scenarios and can receive added medication review.'),
  r: probability('Usual physician referral', 'Population and recruitment', .118, 'Annual referral among members not already receiving RPM. Annual interpretation is assumed; the UCSD source covers two years.', { evidenceType: 'Literature-informed assumption', sourceUrls: ['https://www.jmir.org/2025/1/e64933/'] }),
  qA: probability('Initiation after physician referral', 'Population and recruitment', .53, 'First transmitted BP reading, conditional on referral.', { evidenceType: 'Literature-informed assumption', sourceUrls: ['https://pages.ucsd.edu/~yfadlon/pdfs/Digital_Health.pdf'] }),
  f: probability('MTM review-population share', 'Population and recruitment', .5, 'Share of all eligible members included in the review population, including existing RPM patients.'),
  c: probability('Completed medication review', 'Population and recruitment', .84, 'Conditional on inclusion in the review population. PQA benchmark applies to a defined MTM population.', { evidenceType: 'Literature-informed assumption', sourceUrls: ['https://www.pqa.org/wp-content/uploads/2025/10/PQA-QuIRC-MTM-Report.pdf'] }),
  o: probability('RPM offer after review', 'Population and recruitment', .5, 'Offers to reviewed members not already receiving RPM, subject to the recontact rule. Duplicate physician/pharmacist offers incur work but do not create two episodes.'),
  qB: probability('Initiation after pharmacist offer', 'Population and recruitment', .53, 'Scenario transfer of UCSD uptake to pharmacist offers; not an observed MTM uptake estimate.', { evidenceType: 'Literature-informed assumption', sourceUrls: ['https://pages.ucsd.edu/~yfadlon/pdfs/Digital_Health.pdf'] }),
  recontactUptake: probability('Uptake after recontacting physician noninitiators', 'Population and recruitment', null, 'Null disables recontact. A numeric value enables an additional offer with an independent retry draw; zero still incurs unsuccessful outreach.', { nullable: true }),
  startMonth: field('New RPM and medication-action month', 'Timing and service', 7, 'month of budget year', 1, 12, 'All new starts and modeled medication actions occur at the beginning of this month; existing RPM starts in month 1.', { step: 1, integer: true }),
  monthlyRetention: probability('Monthly RPM continuation', 'Timing and service', .98, 'Probability of continuing into each subsequent month; all participants contribute their first service month.'),
  qualificationShare: probability('Revenue-qualifying active months', 'Financial boundary', .7, 'Assumed proportion of active service months meeting the relevant contract and billing requirements. A first reading alone does not qualify a month.'),
  monthlyRevenueBenchmark: field('Revenue per qualifying month', 'Financial boundary', 100, 'USD/month', 0, 10000, 'Investigator-selected blended benchmark, not a verified CPT payment or guaranteed entitlement.'),
  collectionShare: probability('Collection share', 'Financial boundary', .9, 'Fraction of the revenue benchmark collected.'),
  externalPayerShare: probability('Share paid by external payers', 'Financial boundary', 0, 'Internal plan-to-owned-clinic transfers are excluded. Set from the external payer mix; switching perspective does not set this automatically.'),
  retainedDrugSavingsShare: probability('Medication savings retained by the system', 'Financial boundary', 1, 'Fraction of net medication savings financially retained by the consolidated organization. Exclude drug costs borne by outside payers. Independent of the RPM payer mix; clinic perspective excludes medication savings regardless.'),
  pharmacistWage: field('Loaded pharmacist wage', 'Costs and staffing', 96.5, 'USD/hour', 0, 1000, assumption),
  supportWage: field('Loaded support-staff wage', 'Costs and staffing', 40, 'USD/hour', 0, 1000, assumption),
  physicianReferralCost: field('Cost per physician referral', 'Costs and staffing', 10, 'USD/referral', 0, 1000, 'Same usual referral workload in both scenarios, including unsuccessful referrals.'),
  offerMinutes: field('Pharmacist time per offer', 'Costs and staffing', 5, 'minutes/offer', 0, 120, 'Includes unsuccessful, duplicate and enabled recontact offers.'),
  onboardingMinutes: field('Pharmacist onboarding', 'Costs and staffing', 20, 'minutes/new start', 0, 240, 'One onboarding episode per new participant, after deduplication.'),
  monitorPharmacistMinutes: field('Pharmacist monitoring', 'Costs and staffing', 10, 'minutes/active month', 0, 240, 'Charged for all active service months, including months that do not qualify for revenue.'),
  monitorSupportMinutes: field('Support-staff monitoring', 'Costs and staffing', 10, 'minutes/active month', 0, 240, 'Additional support work distinct from pharmacist clinical work.'),
  reviewMinutes: field('Added pharmacist review and follow-up', 'Costs and staffing', 10, 'minutes/completed review', 0, 240, 'Incremental review/follow-up resource bundle; charged even when no RPM initiation or medication change occurs.'),
  deviceCost: field('Device per new start', 'Costs and staffing', 100, 'USD/device', 0, 10000, 'One device for each unique new participant; no new device charged to existing participants.'),
  monthlyTechnologyCost: field('Technology per active month', 'Costs and staffing', 15, 'USD/month', 0, 1000, 'Separate from clinical labor and fixed costs; does not depend on revenue qualification.'),
  fixedCost: field('Current-program fixed cost', 'Costs and staffing', 5000, 'USD/year', 0, 10000000, 'Counted once in each scenario; not charged again per referral channel.'),
  addedFixedCost: field('Additional integration fixed cost', 'Costs and staffing', 1000, 'USD/year', 0, 10000000, 'Incremental implementation/capacity cost, counted once in the integrated scenario.'),
  clinicalMode: { label: 'Deprescribing analysis', group: 'Deprescribing assumptions', default: 'none', unit: '', options: ['none', 'illustrative', 'unestimated'], description: 'none explicitly assumes zero clinical effects/savings in both scenarios; illustrative enables stated assumptions; unestimated keeps endpoints missing.', evidenceType: 'Model choice' },
  lowBpShare: probability('Low BP prompting clinical assessment', 'Deprescribing assumptions', .23, 'Transferred prevalence, including asymptomatic low BP. Low BP does not itself establish overtreatment.', { nullable: true, evidenceType: 'Literature-informed assumption', sourceUrls: ['https://ojs.jaff.org.br/ojs/index.php/jaff/article/view/1367'] }),
  actionBaseline: probability('Usual-care medication action after low BP assessment', 'Deprescribing assumptions', .1, 'Investigator probability of an appropriate one-medicine reduction after assessment; not MINOR 28.6%.', { nullable: true }),
  actionIntegrated: probability('Medication action with added completed review', 'Deprescribing assumptions', .3, 'Used only for patients with a completed MTM review; others retain usual-care probability. Investigator assumption, not MINOR-derived.', { nullable: true }),
  persistence12: probability('Reduction maintained 12 months after action', 'Deprescribing assumptions', .694, 'Transferred patient-level conditional persistence. Simplified to one medicine per action; monthly continuation equals this value to the power 1/12.', { nullable: true, evidenceType: 'Literature-informed assumption', sourceUrls: ['https://pubmed.ncbi.nlm.nih.gov/41505212/'] }),
  drugCostPerMonth: field('Net saving per reduced medicine-month', 'Deprescribing assumptions', 10, 'USD/medicine-month', 0, 10000, 'Assumed net savings after substitution/dose adjustment. Clinic does not automatically retain this saving.', { nullable: true })
}
export const DEFAULT_INTEGRATION_INPUTS = Object.freeze(Object.fromEntries(Object.entries(INPUT_DEFINITIONS).map(([key, d]) => [key, d.default])))
export const INTEGRATION_MODEL_METADATA = {
  id: 'mtm-rpm-additive-integration', version: '1.0.0', schemaVersion: 1,
  currency: 'USD', priceYear: 2026, priceBasis: 'All monetary assumptions are constant 2026 USD; no automatic inflation or discounting.',
  comparator: 'Current RPM program and usual physician referrals versus the same program plus MTM recruitment and review',
  endpoint: 'Additional net financial benefit per 1,000 eligible members during a 12-month budget year; operating margin also reported separately',
  initiation: 'At least one transmitted BP reading; not automatically a revenue-qualifying service month',
  randomization: 'mulberry32; fixed draws per synthetic patient; shared physician decisions, first-initiation uniform, RPM continuation/qualification draws, low-BP/action and medication-persistence draws across scenarios; independent draw only for explicitly enabled recontact',
  assumptions: [
    'Existing RPM patients and usual physician referrals are identical in both scenarios. Unique RPM episodes are the union of physician and pharmacist initiations; duplicate offers still cost time.',
    'Known existing RPM participants receive reviews but no new RPM offer/device. Default null recontactUptake prevents offers to unsuccessful physician referrals; a numeric retry probability enables recontact with a separate independent draw.',
    'No exact contact sequence is simulated. Recontact eligibility is a simplified usual-pathway classification, not a claim about real-time concurrent referral scheduling.',
    'New RPM starts and medication reductions occur at the beginning of startMonth. Existing patients receive up to 12 months; new patients only the remaining budget months. Retention is a constant monthly assumption.',
    'All active months incur service costs. Only qualifying months generate benchmark revenue, multiplied by collection and external payer shares. No automatic reimbursement entitlement is asserted.',
    'Current fixed costs occur once in each arm; integration fixed costs once in the integrated arm. No capacity limit or discrete hiring steps are modeled.',
    'none is an explicit zero-clinical-benefit assumption, not missing evidence. unestimated or missing required clinical inputs yields null clinical endpoints, drug savings and total net financial benefit; operating margin remains estimable.',
    'Illustrative actions require active RPM at the assessment month, assumed low BP and the conditional action probability. Existing patients who left RPM before startMonth have no modeled action. One medicine per action is assumed; this is not an observed medication-level persistence estimate. After action, medication persistence is independent of subsequent RPM retention.',
    'Medication persistence is measured 12 months after reduction, potentially after the budget year. Only within-budget medication-months generate year-one savings. No symptoms, BP responders, falls or CV savings are estimated.',
    'Clinic net financial benefit equals operating margin; drug savings are displayed separately without assuming the clinic retains them. Consolidated-system net benefit includes drugSavings multiplied by retainedDrugSavingsShare and external receipts, excluding internal transfers. Drug savings retention and the RPM external payer share are separate contractual assumptions.',
    'Expected values are analytic scenario projections; seeded integers illustrate Monte Carlo variability. More synthetic patients or seeds do not strengthen the empirical evidence or establish causal synergy.'
  ],
  evidence: Object.fromEntries(Object.entries(INPUT_DEFINITIONS).map(([key, d]) => [key, { basis: d.evidenceType, referenceDefault: d.default, unit: d.unit, description: d.description, sources: d.sourceUrls || [] }]))
}
const clone = value => JSON.parse(JSON.stringify(value))
const canonical = value => Array.isArray(value) ? '[' + value.map(canonical).join(',') + ']' : value !== null && typeof value === 'object' ? '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}' : JSON.stringify(value)
export function validateIntegrationInputs(inputs) {
  if (!inputs || typeof inputs !== 'object' || Array.isArray(inputs)) return { inputs: 'Supply a complete input object.' }
  const errors = {}
  for (const key of Object.keys(inputs)) if (!INPUT_DEFINITIONS[key]) errors[key] = 'Unknown input.'
  for (const [key, d] of Object.entries(INPUT_DEFINITIONS)) {
    const value = inputs[key]
    if (d.nullable && value === null) continue
    if (d.options ? !d.options.includes(value) : typeof value !== 'number' || !Number.isFinite(value) || value < d.min || value > d.max || (d.integer && !Number.isInteger(value))) errors[key] = d.options ? 'Select a supported option.' : `Enter a number from ${d.min} to ${d.max}${d.integer ? ' (integer)' : ''}.`
  }
  return errors
}
function checked(inputs) { const errors = validateIntegrationInputs(inputs); if (Object.keys(errors).length) { const e = new RangeError(JSON.stringify(errors)); e.errors = errors; throw e } return { ...inputs } }
function rng(seed) { let x = seed >>> 0; return () => { x = (x + 0x6d2b79f5) >>> 0; let t = Math.imul(x ^ x >>> 15, x | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296 } }
const clinicalKnown = p => p.clinicalMode !== 'unestimated' && (p.clinicalMode === 'none' || ['lowBpShare', 'actionBaseline', 'actionIntegrated', 'persistence12', 'drugCostPerMonth'].every(k => p[k] !== null))
const geometricMonths = (months, retention) => { let total = 0; for (let k = 0; k < months; k++) total += retention ** k; return total }
function pathway(p, existing, physicianReferred, aUptake, bUptake, population, completion, offer, retry) {
  const referred = !existing && physicianReferred
  const aStarted = referred && aUptake
  const completed = population && completion
  const failedPhysician = referred && !aStarted
  const offered = !existing && completed && offer && (!failedPhysician || p.recontactUptake !== null)
  const bStarted = offered && (failedPhysician ? retry : bUptake)
  return { existingRpm: existing, physician: { referred, initiated: aStarted }, pharmacist: { inReviewPopulation: population, reviewCompleted: completed, offered, duplicateOffer: offered && referred, recontacted: offered && failedPhysician, initiated: bStarted, reasonForNoOffer: existing ? 'already-rpm' : !population ? 'outside-review-population' : !completed ? 'review-not-completed' : failedPhysician && p.recontactUptake === null ? 'recontact-disabled' : !offer ? 'not-offered' : null }, additionalInitiation: !existing && !aStarted && bStarted }
}
function arm(p, state, integrated, draws = null) {
  const participating = state.existingRpm || state.physician.initiated || (integrated && state.pharmacist.initiated)
  const newInitiation = participating && !state.existingRpm
  const months = state.existingRpm ? 12 : 13 - p.startMonth
  let activeMonths = 0; let qualifiedMonths = 0
  let activeAtAssessment = participating ? (state.existingRpm ? p.monthlyRetention ** (p.startMonth - 1) : 1) : 0
  if (participating) {
    if (!draws) { activeMonths = geometricMonths(months, p.monthlyRetention); qualifiedMonths = activeMonths * p.qualificationShare }
    else {
      let active = true; activeAtAssessment = 0
      for (let k = 0; k < months; k++) {
        if (k > 0) active = active && draws.continuation[k - 1] < p.monthlyRetention
        const calendarMonth = state.existingRpm ? k + 1 : p.startMonth + k
        if (calendarMonth === p.startMonth) activeAtAssessment = Number(active)
        if (active) { activeMonths++; qualifiedMonths += Number(draws.qualification[k] < p.qualificationShare) }
      }
    }
  }
  const reviews = integrated ? Number(state.pharmacist.reviewCompleted) : 0
  const offers = integrated ? Number(state.pharmacist.offered) : 0
  const pharmacistHours = (reviews * p.reviewMinutes + offers * p.offerMinutes + Number(newInitiation) * p.onboardingMinutes + activeMonths * p.monitorPharmacistMinutes) / 60
  const supportHours = activeMonths * p.monitorSupportMinutes / 60
  const programCost = Number(state.physician.referred) * p.physicianReferralCost + pharmacistHours * p.pharmacistWage + supportHours * p.supportWage + Number(newInitiation) * p.deviceCost + activeMonths * p.monthlyTechnologyCost
  const revenue = qualifiedMonths * p.monthlyRevenueBenchmark * p.collectionShare * p.externalPayerShare
  let clinical = { actions: null, sustainedAt12Months: null, medicationMonths: null }; let drugSavings = null
  if (clinicalKnown(p)) {
    clinical = { actions: 0, sustainedAt12Months: 0, medicationMonths: 0 }
    if (p.clinicalMode === 'illustrative' && participating) {
      const probability = integrated && state.pharmacist.reviewCompleted ? p.actionIntegrated : p.actionBaseline
      const persistenceMonth = p.persistence12 ** (1 / 12)
      if (!draws) { clinical.actions = activeAtAssessment * p.lowBpShare * probability; clinical.sustainedAt12Months = clinical.actions * p.persistence12; clinical.medicationMonths = clinical.actions * geometricMonths(13 - p.startMonth, persistenceMonth) }
      else {
        const action = Boolean(activeAtAssessment) && draws.low < p.lowBpShare && draws.action < probability
        clinical.actions = Number(action)
        let continued = action
        for (let k = 0; k < 12; k++) { if (k < 13 - p.startMonth && continued) clinical.medicationMonths++; continued = continued && draws.persistence[k] < persistenceMonth }
        clinical.sustainedAt12Months = Number(continued)
      }
    }
    drugSavings = clinical.medicationMonths * (p.drugCostPerMonth ?? 0)
  }
  const operatingMargin = revenue - programCost
  return { participating, newInitiation, activeMonths, qualifiedMonths, activeAtAssessment, pharmacistHours, supportHours, revenue, programCost, drugSavings, operatingMargin, netFinancialBenefit: drugSavings === null ? null : operatingMargin + (p.perspective === 'consolidated' ? drugSavings * p.retainedDrugSavingsShare : 0), clinical }
}
const NUMERIC_KEYS = ['existingPatients', 'newInitiations', 'totalParticipants', 'physicianReferrals', 'offers', 'duplicateOffers', 'reviews', 'activeMonths', 'qualifiedMonths', 'pharmacistHours', 'supportHours', 'revenue', 'programCost', 'drugSavings', 'operatingMargin', 'netFinancialBenefit']
function emptyArm(known) { return { ...Object.fromEntries(NUMERIC_KEYS.map(k => [k, !known && ['drugSavings', 'netFinancialBenefit'].includes(k) ? null : 0])), clinical: { actions: known ? 0 : null, sustainedAt12Months: known ? 0 : null, medicationMonths: known ? 0 : null } } }
function accumulate(total, patient, integrated, weight) {
  const row = integrated ? patient.integrated : patient.baseline
  const values = { ...row, existingPatients: Number(patient.existingRpm), newInitiations: Number(row.newInitiation), totalParticipants: Number(row.participating), physicianReferrals: Number(patient.physician.referred), offers: integrated ? Number(patient.pharmacist.offered) : 0, duplicateOffers: integrated ? Number(patient.pharmacist.duplicateOffer) : 0, reviews: integrated ? Number(patient.pharmacist.reviewCompleted) : 0 }
  for (const key of NUMERIC_KEYS) if (total[key] !== null) total[key] += values[key] * weight
  for (const key of Object.keys(total.clinical)) if (total.clinical[key] !== null) total.clinical[key] += row.clinical[key] * weight
}
function finish(p, baseline, integrated) {
  for (const [row, fixed] of [[baseline, p.fixedCost], [integrated, p.fixedCost + p.addedFixedCost]]) { row.fixedCost = fixed; row.variableCost = row.programCost; row.programCost += fixed; row.operatingMargin -= fixed; if (row.netFinancialBenefit !== null) row.netFinancialBenefit -= fixed }
  const delta = Object.fromEntries([...NUMERIC_KEYS, 'fixedCost', 'variableCost'].map(k => [k, baseline[k] === null || integrated[k] === null ? null : integrated[k] - baseline[k]]))
  delta.clinical = Object.fromEntries(Object.keys(baseline.clinical).map(k => [k, baseline.clinical[k] === null ? null : integrated.clinical[k] - baseline.clinical[k]]))
  delta.marginPer1000 = delta.operatingMargin / p.N * 1000
  delta.netBenefitPer1000 = delta.netFinancialBenefit === null ? null : delta.netFinancialBenefit / p.N * 1000
  delta.roi = delta.programCost > 0 && delta.netFinancialBenefit !== null ? delta.netFinancialBenefit / delta.programCost : null
  return { baseline, integrated, delta }
}
export function summarizeIntegrationPatients(patients, inputs = DEFAULT_INTEGRATION_INPUTS) {
  const p = checked(inputs); const baseline = emptyArm(clinicalKnown(p)); const integrated = emptyArm(clinicalKnown(p))
  for (const patient of patients) { accumulate(baseline, patient, false, 1); accumulate(integrated, patient, true, 1) }
  return finish(p, baseline, integrated)
}
const possibilities = probability => [[false, 1 - probability], [true, probability]].filter(([, weight]) => weight > 0)
export function expectedIntegrationStudy(inputs = DEFAULT_INTEGRATION_INPUTS) {
  const p = checked(inputs); const baseline = emptyArm(clinicalKnown(p)); const integrated = emptyArm(clinicalKnown(p))
  const boundaries = [...new Set([0, p.qA, p.qB, 1])].sort((a, b) => a - b)
  for (const [existing, wE] of possibilities(p.existingRpmShare)) for (const [ref, wR] of possibilities(p.r)) for (const [population, wF] of possibilities(p.f)) for (const [completion, wC] of possibilities(p.c)) for (const [offer, wO] of possibilities(p.o)) for (const [retry, wRetry] of possibilities(p.recontactUptake ?? 0)) for (let k = 1; k < boundaries.length; k++) {
    const low = boundaries[k - 1]; const high = boundaries[k]; const midpoint = (low + high) / 2
    const weight = p.N * wE * wR * wF * wC * wO * wRetry * (high - low)
    const patient = pathway(p, existing, ref, midpoint < p.qA, midpoint < p.qB, population, completion, offer, retry)
    patient.baseline = arm(p, patient, false); patient.integrated = arm(p, patient, true)
    accumulate(baseline, patient, false, weight); accumulate(integrated, patient, true, weight)
  }
  return finish(p, baseline, integrated)
}
export function simulateIntegrationStudy(inputs = DEFAULT_INTEGRATION_INPUTS) {
  const p = checked(inputs); const random = rng(p.seed)
  const patients = Array.from({ length: p.N }, (_, i) => {
    const existing = random() < p.existingRpmShare; const referred = random() < p.r; const initiation = random()
    const population = random() < p.f; const complete = random() < p.c; const offered = random() < p.o; const retry = random() < (p.recontactUptake ?? 0)
    const draws = { continuation: Array.from({ length: 11 }, random), qualification: Array.from({ length: 12 }, random), low: random(), action: random(), persistence: Array.from({ length: 12 }, random) }
    const patient = { id: `S${String(i + 1).padStart(4, '0')}`, ...pathway(p, existing, referred, initiation < p.qA, initiation < p.qB, population, complete, offered, retry) }
    patient.baseline = arm(p, patient, false, draws); patient.integrated = arm(p, patient, true, draws)
    return patient
  })
  return { inputs: p, metadata: clone(INTEGRATION_MODEL_METADATA), patients, expected: expectedIntegrationStudy(p), actual: summarizeIntegrationPatients(patients, p) }
}
export function getIntegrationScenarios(inputs = DEFAULT_INTEGRATION_INPUTS) {
  const p = checked(inputs)
  return [
    { id: 'conservative', name: 'No added deprescribing benefit', inputs: { ...p, clinicalMode: 'none' } },
    { id: 'illustrative', name: 'Illustrative deprescribing assumptions', inputs: { ...p, clinicalMode: 'illustrative', lowBpShare: .23, actionBaseline: .1, actionIntegrated: .3, persistence12: .694, drugCostPerMonth: 10 } },
    { id: 'no-external-revenue', name: 'No external reimbursement', inputs: { ...p, externalPayerShare: 0 } },
    { id: 'no-added-recruitment', name: 'No added RPM offers; review costs retained', inputs: { ...p, o: 0 } },
    { id: 'unestimated', name: 'Clinical benefits not estimable', inputs: { ...p, clinicalMode: 'unestimated' } }
  ]
}
export function findOfferThreshold(inputs = DEFAULT_INTEGRATION_INPUTS, { steps = 100 } = {}) {
  const p = checked(inputs)
  if (!Number.isInteger(steps) || steps < 1 || steps > 10000) throw new RangeError('steps must be an integer from 1 to 10,000.')
  let previous = 0
  for (let i = 0; i <= steps; i++) {
    const rate = i / steps; const benefit = expectedIntegrationStudy({ ...p, o: rate }).delta.netFinancialBenefit
    if (benefit === null) return { status: 'unestimated', rate: null, resolution: 1 / steps }
    if (benefit >= -1e-8) {
      if (i === 0) return { status: 'already-nonnegative', rate: 0, resolution: 1 / steps }
      let lo = previous; let hi = rate
      for (let n = 0; n < 30; n++) { const mid = (lo + hi) / 2; if (expectedIntegrationStudy({ ...p, o: mid }).delta.netFinancialBenefit >= 0) hi = mid; else lo = mid }
      return { status: 'attainable', rate: hi, resolution: 1 / steps }
    }
    previous = rate
  }
  return { status: 'unattainable', rate: null, resolution: 1 / steps }
}
export function createIntegrationExport(run) {
  const replay = simulateIntegrationStudy(checked(run?.inputs))
  for (const key of ['metadata', 'patients', 'expected', 'actual']) if (canonical(run[key]) !== canonical(replay[key])) throw new Error(`Integration ${key} failed exact replay.`)
  return { schemaVersion: 1, modelVersion: INTEGRATION_MODEL_METADATA.version, modelId: INTEGRATION_MODEL_METADATA.id, ...clone(replay) }
}
export function verifyIntegrationExport(bundle) {
  const keys = ['schemaVersion', 'modelVersion', 'modelId', 'inputs', 'metadata', 'patients', 'expected', 'actual']
  if (!bundle || Object.keys(bundle).sort().join(',') !== keys.sort().join(',') || bundle.schemaVersion !== 1 || bundle.modelVersion !== INTEGRATION_MODEL_METADATA.version || bundle.modelId !== INTEGRATION_MODEL_METADATA.id) throw new Error('Integration model or export schema mismatch.')
  createIntegrationExport(bundle); return bundle
}
const csvCell = value => '"' + String(value ?? '').replace(/"/g, '""') + '"'
export function integrationExportCsv(bundle) {
  verifyIntegrationExport(bundle)
  const columns = [...NUMERIC_KEYS, 'marginPer1000', 'netBenefitPer1000']
  const rows = [['model_version', 'seed', 'basis', 'scenario', ...columns, 'clinical_json', 'inputs_json', 'metadata_json']]
  for (const basis of ['expected', 'actual']) for (const scenario of ['baseline', 'integrated', 'delta']) { const row = bundle[basis][scenario]; rows.push([bundle.modelVersion, bundle.inputs.seed, basis, scenario, ...columns.map(k => row[k] ?? ''), JSON.stringify(row.clinical), JSON.stringify(bundle.inputs), JSON.stringify(bundle.metadata)]) }
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n'
}
