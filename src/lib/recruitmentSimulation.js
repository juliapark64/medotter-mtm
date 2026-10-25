// Recruitment only: all records are synthetic and contain no clinical profiles.
export const DEFAULT_RECRUITMENT_INPUTS = Object.freeze({
  N: 1000, r: 0.118, f: 0.5, c: 0.84, o: 0.5, qA: 0.53, qB: 0.53, seed: 2027
})

export const RECRUITMENT_MODEL_METADATA = Object.freeze({
  id: 'mtm-rpm-paired-recruitment', version: '1.0.0', schemaVersion: 1,
  endpoint: 'RPM initiation: at least one transmitted blood pressure reading during the modeled 12-month recruitment period',
  design: 'Alternative physician-referral and MTM-review entry pathways applied to the same synthetic eligible cohort',
  randomization: {
    algorithm: 'mulberry32', seedType: 'unsigned 32-bit integer',
    drawOrder: ['physician referral', 'MTM review population', 'review completion', 'RPM offer', 'shared initiation'],
    coupling: 'Distinct pseudorandom draws for each recruitment stage; one initiation uniform shared by the two pathways for each patient. All five draws are consumed for every patient, including unvisited stages.'
  },
  assumptions: [
    'N is a common RPM-eligible population; the two pathways are alternatives, not additive services.',
    'r is an annual referral probability. The published 11.8% reference covers October 2020 to October 2022 and is not an observed annual patient probability.',
    'f is the share included in the MTM review population; c is review completion conditional on that population; o is an RPM offer conditional on completion.',
    'qA and qB are initiation probabilities conditional on referral or offer. Applying the UCSD uptake reference to this population, MTM offers, and a recruitment-year endpoint is an assumption.',
    'Recruitment stage draws are independent except for the explicitly shared initiation draw. This dependence choice is a variance-reduction device, not evidence about real individual counterfactual outcomes.',
    'Each patient has one opportunity per stage. No calendar schedule, repeat recruitment, patient heterogeneity, or capacity constraint is modeled.',
    'Integer simulation counts fluctuate with the seed. Analytic expectations are scenario projections, not observed effects or estimates made more certain by a larger synthetic N.',
    'No clinical benefit, medication change, cost, reimbursement, or savings is estimated.'
  ],
  evidence: [
    { parameter: 'r', source: 'UCSD physician referral study', url: 'https://www.jmir.org/2025/1/e64933/', limitation: 'Mean physician-level rate across a two-year observation period; annual use is an investigator assumption.' },
    { parameter: 'c', source: 'PQA CMR completion report, page 4', url: 'https://www.pqa.org/wp-content/uploads/2025/10/PQA-QuIRC-MTM-Report.pdf', limitation: '84% MA-PD completion in a defined MTM program population; not all RPM-eligible members.' },
    { parameter: 'qA,qB', source: 'UCSD author manuscript, section 6.2', url: 'https://pages.ucsd.edu/~yfadlon/pdfs/Digital_Health.pdf', limitation: '53% uptake defined as at least one transmission after referral; transfer to the modeled pathways and horizon is assumed.' },
    { parameter: 'N,f,o,seed', source: 'Investigator choices', limitation: 'Not measured study estimates.' }
  ]
})

const PROBABILITIES = ['r', 'f', 'c', 'o', 'qA', 'qB']
const INPUT_KEYS = Object.keys(DEFAULT_RECRUITMENT_INPUTS)
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const copy = value => JSON.parse(JSON.stringify(value))

// Callers must pass a complete input record, or omit it to use the named defaults.
// Do not silently coerce blank strings or omit unknown fields in research exports.
export function validateRecruitmentInputs(inputs) {
  if (!isRecord(inputs)) return { inputs: 'Supply a complete recruitment input object.' }
  const errors = {}
  for (const key of Object.keys(inputs)) if (!INPUT_KEYS.includes(key)) errors[key] = 'Unknown recruitment input.'
  for (const key of PROBABILITIES) {
    if (typeof inputs[key] !== 'number' || !Number.isFinite(inputs[key]) || inputs[key] < 0 || inputs[key] > 1) {
      errors[key] = 'Enter a numeric probability from 0 to 1.'
    }
  }
  if (!Number.isInteger(inputs.N) || inputs.N < 1 || inputs.N > 10000) errors.N = 'Enter an integer cohort size from 1 to 10,000.'
  if (!Number.isInteger(inputs.seed) || inputs.seed < 0 || inputs.seed > 0xffffffff) errors.seed = 'Enter an integer seed from 0 to 4,294,967,295.'
  return errors
}

function checkedInputs(inputs) {
  const errors = validateRecruitmentInputs(inputs)
  if (Object.keys(errors).length) {
    const error = new RangeError(Object.entries(errors).map(([key, message]) => `${key}: ${message}`).join(' '))
    error.errors = errors
    throw error
  }
  return Object.fromEntries(INPUT_KEYS.map(key => [key, inputs[key]]))
}

function mulberry32(seed) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function addComparisons(summary) {
  const { N, physician, pharmacist } = summary
  physician.initiatedPer1000 = physician.initiated / N * 1000
  pharmacist.initiatedPer1000 = pharmacist.initiated / N * 1000
  summary.difference = {
    referred: pharmacist.referred - physician.referred,
    initiated: pharmacist.initiated - physician.initiated,
    initiatedPer1000: (pharmacist.initiated - physician.initiated) / N * 1000
  }
  summary.relativeInitiationYield = physician.initiated > 0 ? pharmacist.initiated / physician.initiated : null
  return summary
}

export function expectedRecruitment(inputs = DEFAULT_RECRUITMENT_INPUTS) {
  const { N, r, f, c, o, qA, qB } = checkedInputs(inputs)
  const referredA = N * r
  const populationB = N * f
  const completedB = populationB * c
  const offeredB = completedB * o
  const initiatedA = referredA * qA
  const initiatedB = offeredB * qB
  const denominator = f * c * qB
  const parity = denominator > 0 ? r * qA / denominator : null
  const doubling = denominator > 0 ? 2 * r * qA / denominator : null
  return {
    ...addComparisons({
      N,
      physician: { referred: referredA, notReferred: N - referredA, initiated: initiatedA, referredNotInitiated: referredA - initiatedA },
      pharmacist: {
        inReviewPopulation: populationB, outsideReviewPopulation: N - populationB,
        reviewCompleted: completedB, reviewNotCompleted: populationB - completedB,
        offered: offeredB, referred: offeredB, notOfferedAfterReview: completedB - offeredB,
        notReferred: N - offeredB, initiated: initiatedB, referredNotInitiated: offeredB - initiatedB
      }
    }),
    thresholds: { offerForParity: parity, offerForDoubling: doubling, parityFeasible: parity === null ? null : parity <= 1, doublingFeasible: doubling === null ? null : doubling <= 1 }
  }
}

export function summarizeRecruitment(patients) {
  if (!Array.isArray(patients) || patients.length < 1 || patients.length > 10000) throw new RangeError('Supply between 1 and 10,000 paired patient records.')
  const summary = {
    N: patients.length,
    physician: { referred: 0, notReferred: 0, initiated: 0, referredNotInitiated: 0 },
    pharmacist: { inReviewPopulation: 0, outsideReviewPopulation: 0, reviewCompleted: 0, reviewNotCompleted: 0, offered: 0, referred: 0, notOfferedAfterReview: 0, notReferred: 0, initiated: 0, referredNotInitiated: 0 },
    paired: { bothInitiated: 0, physicianOnly: 0, pharmacistOnly: 0, neitherInitiated: 0 }
  }
  const ids = new Set()
  for (const patient of patients) {
    const a = patient?.physician
    const b = patient?.pharmacist
    if (typeof patient?.id !== 'string' || !patient.id || ids.has(patient.id) ||
        !a || !b || [a.referred, a.initiated, b.inReviewPopulation, b.reviewCompleted, b.offered, b.referred, b.initiated].some(value => typeof value !== 'boolean') ||
        (a.initiated && !a.referred) || (b.reviewCompleted && !b.inReviewPopulation) || (b.offered && !b.reviewCompleted) || b.referred !== b.offered || (b.initiated && !b.offered)) {
      throw new RangeError('Patient IDs must be unique and pathway flags must be boolean and respect the recruitment gates.')
    }
    ids.add(patient.id)
    summary.physician.referred += Number(a.referred)
    summary.physician.notReferred += Number(!a.referred)
    summary.physician.initiated += Number(a.initiated)
    summary.physician.referredNotInitiated += Number(a.referred && !a.initiated)
    summary.pharmacist.inReviewPopulation += Number(b.inReviewPopulation)
    summary.pharmacist.outsideReviewPopulation += Number(!b.inReviewPopulation)
    summary.pharmacist.reviewCompleted += Number(b.reviewCompleted)
    summary.pharmacist.reviewNotCompleted += Number(b.inReviewPopulation && !b.reviewCompleted)
    summary.pharmacist.offered += Number(b.offered)
    summary.pharmacist.referred += Number(b.referred)
    summary.pharmacist.notOfferedAfterReview += Number(b.reviewCompleted && !b.offered)
    summary.pharmacist.notReferred += Number(!b.offered)
    summary.pharmacist.initiated += Number(b.initiated)
    summary.pharmacist.referredNotInitiated += Number(b.offered && !b.initiated)
    summary.paired[a.initiated ? (b.initiated ? 'bothInitiated' : 'physicianOnly') : (b.initiated ? 'pharmacistOnly' : 'neitherInitiated')]++
  }
  return addComparisons(summary)
}

export function simulateRecruitment(inputs = DEFAULT_RECRUITMENT_INPUTS) {
  const parameters = checkedInputs(inputs)
  const random = mulberry32(parameters.seed)
  const patients = Array.from({ length: parameters.N }, (_, index) => {
    // Fixed draw consumption makes comparisons stable when stage gates change.
    const referralDraw = random()
    const populationDraw = random()
    const completionDraw = random()
    const offerDraw = random()
    const initiationDraw = random()
    const referred = referralDraw < parameters.r
    const inReviewPopulation = populationDraw < parameters.f
    const reviewCompleted = inReviewPopulation && completionDraw < parameters.c
    const offered = reviewCompleted && offerDraw < parameters.o
    return {
      id: `S${String(index + 1).padStart(4, '0')}`,
      physician: { referred, initiated: referred && initiationDraw < parameters.qA, reasonForNoReferral: referred ? null : 'not-referred' },
      pharmacist: {
        inReviewPopulation, reviewCompleted, offered, referred: offered,
        initiated: offered && initiationDraw < parameters.qB,
        reasonForNoReferral: !inReviewPopulation ? 'outside-review-population' : !reviewCompleted ? 'review-not-completed' : !offered ? 'rpm-not-offered' : null
      }
    }
  })
  return { inputs: parameters, metadata: copy(RECRUITMENT_MODEL_METADATA), patients, summary: summarizeRecruitment(patients), expected: expectedRecruitment(parameters) }
}

// The export includes actual paired records, exact assumptions, and all seed inputs.
// Replaying before export also detects stale UI results or mutated patient records.
export function createRecruitmentExport(run) {
  if (!isRecord(run)) throw new RangeError('Supply a completed recruitment simulation.')
  const replay = simulateRecruitment(checkedInputs(run.inputs))
  for (const key of ['patients', 'summary', 'expected', 'metadata']) {
    if (JSON.stringify(run[key]) !== JSON.stringify(replay[key])) throw new Error(`Simulation ${key} do not match a replay of the inputs and seed.`)
  }
  return {
    schemaVersion: RECRUITMENT_MODEL_METADATA.schemaVersion,
    modelId: RECRUITMENT_MODEL_METADATA.id,
    modelVersion: RECRUITMENT_MODEL_METADATA.version,
    ...copy(replay)
  }
}

export function verifyRecruitmentExport(bundle) {
  if (!isRecord(bundle) || bundle.schemaVersion !== RECRUITMENT_MODEL_METADATA.schemaVersion || bundle.modelId !== RECRUITMENT_MODEL_METADATA.id || bundle.modelVersion !== RECRUITMENT_MODEL_METADATA.version) {
    throw new Error('Recruitment export model or schema version mismatch.')
  }
  const expectedKeys = ['schemaVersion', 'modelId', 'modelVersion', 'inputs', 'metadata', 'patients', 'summary', 'expected']
  if (Object.keys(bundle).sort().join(',') !== expectedKeys.sort().join(',')) throw new Error('Recruitment export fields do not match this schema.')
  createRecruitmentExport(bundle)
  return bundle
}
