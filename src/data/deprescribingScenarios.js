// Study-derived references are scoped to this scenario, not global defaults.
export const GEISINGER_PROFILE_ID = 'geisinger-cmm-2021'
const citation = {
  title: 'Graybill et al. (2021). Medication therapy problems identified by pharmacists conducting telephonic comprehensive medication management within a team-based at-home care program.',
  journal: 'JACCP, 4(7), 801–807',
  doi: '10.1002/jac5.1466',
  url: 'https://accpjournals.onlinelibrary.wiley.com/doi/full/10.1002/jac5.1466',
  locator: 'Methods 2.4; Results; Tables 1 and 2, contacted-patient subgroup'
}
export const GEISINGER_PROFILE = {
  id: GEISINGER_PROFILE_ID,
  name: 'Geisinger-informed initial review',
  citation,
  population: 'High-complexity at-home care patients; cohort mean age 72, seven conditions and 19 medications. Targeting required six or more chronic conditions and high prior hospital/ED utilization.',
  context: [
    'Retrospective study of 307 patients; these references use the 182 patients/caregivers contacted for initial comprehensive medication management (CMM).',
    'Recommendations to discontinue medication are not a Beers-criteria PIM count. Dose adjustments and other medication problems are excluded from these references.',
    'Documented actions were checked after initial-review follow-up. Annual repeat yield and three-year persistence were not established.',
    'There was no usual-care control. The share additional to existing MTM remains an investigator assumption; it is not estimated by this study.',
    'Population size, eligibility, review completion, staffing time, costs and persistence retain your current assumptions. The study does not validate ten extra review minutes or the modeled drug savings.',
    'The no-added-benefit comparison sets the additional share to zero. Review workload, program costs and any RPM effects are retained.'
  ],
  references: {
    pimsPerPatient: {
      value: 1.09,
      label: 'Discontinuation recommendations per completed initial review',
      unit: 'recommendations/completed initial review',
      description: '199 discontinuation recommendations / 182 contacted patients = 1.0934, rounded to 1.09. Applied to one completed initial review episode per modeled recipient. Applying this yield again in later years is an assumption.',
      source: 'Graybill et al., 2021, Tables 1–2: 199 / 182. Rounded study-derived reference; not PIM prevalence. ' + citation.url,
      evidenceType: 'Literature-informed assumption',
      derivation: { numerator: 199, denominator: 182, exactValue: 199 / 182, roundedValue: 1.09 }
    },
    implementationRate: {
      value: 0.332,
      label: 'Implementation of discontinuation recommendations',
      unit: 'share of discontinuation recommendations',
      description: '66 accepted/actioned discontinuation recommendations / 199 recommendations = 33.17%, rounded to 33.2%. Applying this rate to additional findings beyond existing MTM is an extrapolation.',
      source: 'Graybill et al., 2021, Methods 2.4 and Table 2: 66 / 199. Chart review assessed acceptance and action; sustained discontinuation was not established. ' + citation.url,
      evidenceType: 'Literature-informed assumption',
      derivation: { numerator: 66, denominator: 199, exactValue: 66 / 199, roundedValue: 0.332 }
    }
  }
}

export function getEvidenceProfile(id = null) {
  if (id === null) return null
  if (id !== GEISINGER_PROFILE_ID) throw new Error('Unknown evidence profile: ' + id)
  return GEISINGER_PROFILE
}

export function getGeisingerScenarios(base, mode) {
  const inputs = { ...base, pimsPerPatient: 1.09, implementationRate: 0.332 }
  const evidenceProfileId = GEISINGER_PROFILE_ID
  return [
    { id: 'geisinger', name: 'Geisinger-informed initial review', mode, inputs, evidenceProfileId },
    { id: 'geisinger-no-added-benefit', name: 'Geisinger: no added deprescribing benefit', mode,
      inputs: { ...inputs, incrementalDetection: 0 }, evidenceProfileId }
  ]
}
