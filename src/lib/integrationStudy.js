import { FINANCIAL_EVIDENCE, FINANCIAL_BENCHMARKS, RPM_TEAM_TASK_ALLOCATION, CLINIC_STAFFING_BENCHMARKS, CLINIC_TASK_ALLOCATION, CASHBOOK_VENDOR_PACKAGE, RPM_MEDICARE_2026_FEES } from '../data/integrationFinancialEvidence.js'
export { FINANCIAL_EVIDENCE } from '../data/integrationFinancialEvidence.js'
const evidenceUrls = (...ids) => FINANCIAL_EVIDENCE.filter(source => ids.includes(source.id) && source.url).map(source => source.url)
const HEALTHPARTNERS_URL = 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9649877/'
const MINOR_URL = 'https://www.sciencedirect.com/science/article/pii/S0149291823002035'
const MINOR_AUTHOR_URL = 'https://repositorio.ufba.br/handle/ri/36958'
const taskAllocation = { evidenceType: 'Illustrative task-allocation assumption', sourceNotes: '90% technician / 10% pharmacist RPM task time, informed by the service structure in RPM Cash Book.xlsx, RPM etc!B30:B31. This is not a headcount ratio or the ratio of all program hours; added medication review remains pharmacist work.' }
const clinicAllocation = { evidenceType: 'Illustrative clinic task-allocation assumption', sourceNotes: 'Explicit investigator allocation, not an observed usual-care workload: physician clinical management, nurse monitoring and medical-assistant logistics. Individual task minutes need local calibration. Wage sources support compensation only.' }
const field = (label, group, value, unit, min, max, description, extra = {}) => ({ label, group, default: value, unit, min, max, step: 'any', description, evidenceType: 'Assumption', ...extra })
const probability = (label, group, value, description, extra = {}) => field(label, group, value, 'probability', 0, 1, description, { step: .01, ...extra })
export const INPUT_DEFINITIONS = {
  N: field('RPM-eligible population', 'Population and recruitment', 1000, 'members', 1, 10000, 'Same RPM-eligible Original Medicare fee-for-service population in both scenarios; excludes Medicare Advantage and commercial-payer contracting.', { step: 1, integer: true }),
  seed: field('Simulation seed', 'Population and recruitment', 2027, 'integer', 0, 4294967295, 'Reproduces synthetic patients; not a source of clinical evidence.', { step: 1, integer: true }),
  perspective: { label: 'Financial perspective', group: 'Financial boundary', default: 'clinic', unit: '', options: ['clinic'], description: 'Clinic serving Original Medicare fee-for-service patients. Clinic collections minus program costs; medication-cost offsets are reported separately and are not clinic revenue.', evidenceType: 'Model choice' },
  existingRpmShare: probability('Already receiving RPM', 'Population and recruitment', .05, 'Existing participants appear in both scenarios and can receive added medication review.'),
  r: probability('Usual physician referral', 'Population and recruitment', .118, 'Assumed annual physician-only referral pathway among members not already receiving RPM. UCSD reported PCP-attributed referrals over two years, including possible referrals initiated by colleagues, residents or advanced practice providers. Both annualization and treating the attributed rate as exclusively physician-initiated are investigator assumptions; this source does not establish the RPM delivery team.', { evidenceType: 'Literature-informed assumption', sourceUrls: ['https://www.jmir.org/2025/1/e64933/'] }),
  qA: probability('Initiation after physician referral', 'Population and recruitment', .53, 'First transmitted BP reading, conditional on referral.', { evidenceType: 'Literature-informed assumption', sourceUrls: ['https://pages.ucsd.edu/~yfadlon/pdfs/Digital_Health.pdf'] }),
  recruitmentMode: { label: 'Pharmacist recruitment scenario', group: 'Population and recruitment', default: 'mtm-offer', unit: '', options: ['mtm-offer', 'healthpartners'], description: 'MTM-offer uses illustrative review and offer stages. HealthPartners uses targeted intake attendance followed by first BP transmission; its published mixed-payer study does not establish the effect in this Original Medicare clinic.', evidenceType: 'Model choice; transferred study scenario', sourceUrls: [HEALTHPARTNERS_URL] },
  f: probability('Targeted pharmacist cohort share', 'Population and recruitment', .5, 'Assumed share of the eligible clinic population targeted for review or HealthPartners-style intake, including existing RPM patients. Not a HealthPartners enrollment or MTM eligibility estimate.'),
  intakeAttendance: probability('Completed pharmacist intake within six weeks', 'Population and recruitment', 385 / 1423, '385 of 1,423 HyperLink 3 telehealth-arm participants attended pharmacist intake within six weeks. Applied once to the targeted cohort; transfer to this clinic, existing participants and the selected start month is assumed.', { evidenceType: 'Observed proportion; population/workflow transfer', sourceUrls: [HEALTHPARTNERS_URL] }),
  activationAfterIntake: probability('First BP transmission after completed intake', 'Population and recruitment', .8, '80% of HyperLink 3 participants attending pharmacist intake transmitted at least one home BP reading. Conditional on intake, not an offer rate or share of every clinic patient. Billing qualification remains separate.', { evidenceType: 'Observed conditional proportion; transferred scenario', sourceUrls: [HEALTHPARTNERS_URL] }),
  intakeMinutes: field('Pharmacist time per completed intake', 'Costs and staffing', 60, 'minutes/intake', 0, 240, 'HyperLink 3 offered a one-hour intake appointment including medication review and device education; 60 minutes is a protocol-duration proxy, not a measured mean workload. Replaces the short review cost in HealthPartners mode, including for nonactivators. Separate clinic onboarding is excluded for additional pharmacist-initiated episodes; vendor/device charges remain. Subsequent monitoring workload remains a separate assumption.', { evidenceType: 'Published workflow duration; resource transfer', sourceUrls: [HEALTHPARTNERS_URL] }),
  c: probability('Completed medication review', 'Population and recruitment', .84, 'Conditional on inclusion in the review population. The PQA benchmark comes from a defined Medicare Advantage/Part D MTM population; transferring it to pharmacist recruitment for Original Medicare RPM is an explicit assumption, not a directly observed completion rate for this program.', { evidenceType: 'Literature-informed assumption', sourceUrls: ['https://www.pqa.org/wp-content/uploads/2025/10/PQA-QuIRC-MTM-Report.pdf'] }),
  o: probability('RPM offer after review', 'Population and recruitment', .5, 'Offers to reviewed members not already receiving RPM, subject to the recontact rule. Duplicate physician/pharmacist offers incur work but do not create two episodes.'),
  qB: probability('Initiation after pharmacist offer', 'Population and recruitment', .53, 'Scenario transfer of UCSD uptake to pharmacist offers; not an observed MTM uptake estimate.', { evidenceType: 'Literature-informed assumption', sourceUrls: ['https://pages.ucsd.edu/~yfadlon/pdfs/Digital_Health.pdf'] }),
  recontactUptake: probability('Uptake after recontacting physician noninitiators', 'Population and recruitment', null, 'Null disables recontact. A numeric value enables an additional offer with an independent retry draw; zero still incurs unsuccessful outreach.', { nullable: true }),
  startMonth: field('RPM start and review month', 'Timing and service', 7, 'month of budget year', 1, 12, 'New RPM starts and reviews occur at the beginning of this month; existing RPM starts in month 1. Illustrative medication actions occur here. MINOR measures outcomes 45 days after review; its optional budget extrapolation approximates that assessment at startMonth + 2.', { step: 1, integer: true }),
  monthlyRetention: probability('Monthly RPM continuation', 'Timing and service', .98, 'Probability of continuing into each subsequent month; all participants contribute their first service month.'),
  reimbursementMode: { label: 'RPM reimbursement method', group: 'Financial boundary', default: 'medicare2026', unit: '', options: ['medicare2026', 'custom', 'none'], description: 'Medicare 2026 benchmarks select each arm’s management tier from its physician clinical minutes plus qualifying nurse or pharmacist/technician clinical work; custom uses an investigator-adjusted clinic benchmark; none excludes all RPM receipts. This is not a claim adjudication engine.', evidenceType: 'Model choice with published benchmarks', sourceUrls: evidenceUrls('medpac-2026', 'cms-rpm') },
  qualificationShare: probability('Revenue-qualifying active months', 'Financial boundary', .7, 'Unvalidated planning assumption: pooled share of active months meeting every requirement for the selected recurring bundle, including eligible billing arrangement, device data and interactive clinical service. Device and management qualification are not separately simulated. A first reading alone does not qualify a month.', { sourceUrls: evidenceUrls('cms-rpm') }),
  setupQualificationShare: probability('New starts qualifying for setup payment', 'Financial boundary', .7, 'Unvalidated planning assumption: share of unique new RPM starts qualifying for one setup payment. Existing participants and duplicate referral channels do not generate another setup. Independent of recurring-month qualification.', { sourceUrls: evidenceUrls('cms-rpm') }),
  monthlyRevenueBenchmark: field('Custom revenue per qualifying month', 'Financial boundary', 100, 'USD/month', 0, 10000, 'Used only in custom mode. Investigator-adjusted clinic allowance, not automatically mapped to a CPT code or increased with clinical time.'),
  customSetupRevenueBenchmark: field('Custom payment per qualifying setup', 'Financial boundary', 21.71, 'USD/setup', 0, 10000, 'Used only in custom mode. Starts from the 2026 Medicare setup benchmark, but represents an editable clinic allowance assumption.', { evidenceType: 'Benchmark-informed clinic allowance assumption', sourceUrls: evidenceUrls('medpac-2026') }),
  collectionShare: probability('Collection realization', 'Financial boundary', .9, 'Unvalidated 90% planning assumption for realization of the total allowed amount across Medicare, patient and any supplemental-insurance collections, net of adjustments and uncollected balances. Applied after billing qualification. This is not Medicare’s statutory payment percentage; do not add another 80% factor.', { sourceUrls: evidenceUrls('medicare-part-b-collections') }),
  pharmacistWage: field('Loaded pharmacist wage', 'Costs and staffing', FINANCIAL_BENCHMARKS.pharmacistWage, 'USD/hour', 0, 1000, 'BLS May 2025 national mean $67.75 × June 2026 healthcare compensation/wage ratio (49.93/35.13). Derived employer cost with an assumed cross-year benefit load; not a cashbook wage or observed local 2026 pay. Do not add benefits again.', { evidenceType: 'Derived national benchmark; cross-year transfer', sourceUrls: evidenceUrls('bls-wages-2025', 'bls-benefits-2026') }),
  supportWage: field('Loaded technician wage', 'Costs and staffing', FINANCIAL_BENCHMARKS.supportWage, 'USD/hour', 0, 1000, 'BLS May 2025 pharmacy technician mean $22.41 × the same assumed benefit-loading ratio. Generic occupation benchmark, not a measured CPhT-A pay rate. Costs all technician time once, including the qualifying clinical subset. Wage and job title do not establish billing eligibility.', { evidenceType: 'Derived national benchmark; role and cross-year transfer', sourceUrls: evidenceUrls('bls-wages-2025', 'bls-benefits-2026') }),
  staffingMode: { label: 'RPM delivery workflow', group: 'Costs and staffing', default: 'shared-clinic', unit: '', options: ['shared-clinic', 'integrated-team'], description: 'Primary analysis: identical physician/nurse/medical-assistant RPM delivery in both pathways, adding pharmacist recruitment and review only. Optional integrated-team mode replaces nurse/assistant delivery in the integrated arm with pharmacist/technician delivery, retaining physician clinical management. The baseline has no pharmacist or pharmacy-technician work.', evidenceType: 'Explicit comparison design' },
  physicianWage: field('Loaded family physician cost', 'Costs and staffing', CLINIC_STAFFING_BENCHMARKS.physicianWage, 'USD/hour', 0, 1000, 'BLS family medicine physician hourly employer-cost approximation. Applied only to modeled referral and clinical management time, not the physician’s full salary.', { evidenceType: 'Derived national wage benchmark', sourceUrls: evidenceUrls('bls-wages-2025', 'bls-benefits-2026') }),
  nurseWage: field('Loaded registered nurse cost', 'Costs and staffing', CLINIC_STAFFING_BENCHMARKS.nurseWage, 'USD/hour', 0, 1000, 'BLS registered nurse hourly employer-cost approximation. Nurses and medical assistants are costed separately; neither uses a pharmacy-technician wage.', { evidenceType: 'Derived national wage benchmark', sourceUrls: evidenceUrls('bls-wages-2025', 'bls-benefits-2026') }),
  assistantWage: field('Loaded medical assistant cost', 'Costs and staffing', CLINIC_STAFFING_BENCHMARKS.assistantWage, 'USD/hour', 0, 1000, 'BLS medical assistant hourly employer-cost approximation, not a physician-assistant wage. These modeled logistics minutes are nonclinical and excluded from management billing time.', { evidenceType: 'Derived national wage benchmark', sourceUrls: evidenceUrls('bls-wages-2025', 'bls-benefits-2026') }),
  physicianReferralMinutes: field('Physician time per referral', 'Costs and staffing', CLINIC_TASK_ALLOCATION.physicianReferralMinutes, 'minutes/referral', 0, 120, 'Same physician referral workload in both arms, including referrals that never activate RPM. Replaces the old flat $10 referral charge; no duplicate referral fee is added.', clinicAllocation),
  monitorPhysicianMinutes: field('Physician clinical review and management', 'Costs and staffing', CLINIC_TASK_ALLOCATION.monitorPhysicianMinutes, 'minutes/active month', 0, 240, 'Actual patient-specific clinical review, treatment decisions and clinical oversight, retained in both arms and charged for every active month. These nonoverlapping clinical-service minutes count toward the chosen management tier; general administrative supervision alone does not qualify.', { ...clinicAllocation, sourceUrls: evidenceUrls('cms-remote-monitoring', 'physician-rpm-workflow') }),
  monitorNurseMinutes: field('Registered nurse monitoring and follow-up', 'Costs and staffing', CLINIC_TASK_ALLOCATION.monitorNurseMinutes, 'minutes/active month', 0, 240, 'Nurse triage and patient follow-up. Applies in both arms of the main comparison; optional integrated-team mode replaces this work in the integrated arm only.', clinicAllocation),
  qualifiedNurseMinutes: field('Nurse minutes qualifying as clinical work', 'Costs and staffing', CLINIC_TASK_ALLOCATION.qualifiedNurseMinutes, 'minutes/active month', 0, 240, 'Qualifying subset of nurse service minutes, not additional labor. Assumes eligible personnel, supervision, interactive communication and all other service requirements. Staff title alone does not establish eligibility.', { ...clinicAllocation, sourceUrls: evidenceUrls('cms-remote-monitoring', 'noridian-incident-to') }),
  monitorAssistantMinutes: field('Medical assistant logistics and reminders', 'Costs and staffing', CLINIC_TASK_ALLOCATION.monitorAssistantMinutes, 'minutes/active month', 0, 240, 'Nonclinical coordination and technical assistance, excluded from management billing minutes. In the optional integrated-team workflow, technician support replaces these integrated-arm tasks.', clinicAllocation),
  onboardingNurseMinutes: field('Registered nurse onboarding', 'Costs and staffing', CLINIC_TASK_ALLOCATION.onboardingNurseMinutes, 'minutes/new start', 0, 240, 'One episode of nurse onboarding per unique new activation. Not repeated for an existing participant or second referral channel. Excluded from recurring management time.', clinicAllocation),
  onboardingAssistantMinutes: field('Medical assistant onboarding', 'Costs and staffing', CLINIC_TASK_ALLOCATION.onboardingAssistantMinutes, 'minutes/new start', 0, 240, 'Device setup assistance and coordination per unique new activation. Excluded from recurring management time. The HealthPartners sensitivity includes education in its intake and omits duplicate additional-start onboarding.', clinicAllocation),
  offerMinutes: field('Pharmacist time per offer', 'Costs and staffing', RPM_TEAM_TASK_ALLOCATION.offerMinutes, 'minutes/offer', 0, 120, '10% of the assumed five-minute offer workflow. Includes unsuccessful, duplicate and enabled recontact offers; clinical oversight remains with the pharmacist.', taskAllocation),
  offerSupportMinutes: field('Support time per offer', 'Costs and staffing', RPM_TEAM_TASK_ALLOCATION.offerSupportMinutes, 'minutes/offer', 0, 120, '90% of the assumed five-minute offer workflow for outreach and coordination. Includes unsuccessful, duplicate and enabled recontact offers. Excluded from recurring clinical billing minutes.', taskAllocation),
  onboardingMinutes: field('Pharmacist onboarding', 'Costs and staffing', RPM_TEAM_TASK_ALLOCATION.onboardingMinutes, 'minutes/new start', 0, 240, '10% of the assumed twenty-minute onboarding workflow. One episode per unique new participant, after deduplication; excluded from recurring management time.', taskAllocation),
  onboardingSupportMinutes: field('Support onboarding', 'Costs and staffing', RPM_TEAM_TASK_ALLOCATION.onboardingSupportMinutes, 'minutes/new start', 0, 240, '90% of the assumed twenty-minute onboarding workflow for setup and training. One episode per unique new participant, not one per referral channel; excluded from recurring management time.', taskAllocation),
  monitorPharmacistMinutes: field('Pharmacist clinical monitoring', 'Costs and staffing', RPM_TEAM_TASK_ALLOCATION.monitorPharmacistMinutes, 'minutes/active month', 0, 240, '10% of the retained thirty-minute monthly workflow. Charged for every active month. Added MTM medication review remains separately assigned to the pharmacist; this workload is not an observed average.', { ...taskAllocation, sourceUrls: evidenceUrls('cms-remote-monitoring') }),
  monitorSupportMinutes: field('Total non-pharmacist RPM support', 'Costs and staffing', RPM_TEAM_TASK_ALLOCATION.monitorSupportMinutes, 'minutes/active month', 0, 240, '90% of the retained thirty-minute monthly workflow. Includes both qualifying supervised clinical work and nonclinical support, costed once. Only the separately specified qualifying subset adds management billing time.', taskAllocation),
  qualifiedSupportMinutes: field('Support minutes qualifying as clinical work', 'Costs and staffing', RPM_TEAM_TASK_ALLOCATION.qualifiedSupportMinutes, 'minutes/active month', 0, 240, 'Subset of total support time, not additional labor. The default assumes 17 of 27 support minutes satisfy the clinical service, personnel and supervision requirements, leaving 10 nonclinical minutes. This is an investigator assumption, not a cashbook observation or billing determination. Set to zero if the arrangement does not qualify.', { evidenceType: 'Explicit supervised-clinical-work assumption', sourceUrls: evidenceUrls('cms-remote-monitoring', 'noridian-incident-to') }),
  reviewMinutes: field('Added pharmacist review and follow-up', 'Costs and staffing', 10, 'minutes/completed review', 0, 240, 'Incremental review/follow-up resource bundle; charged even when no RPM initiation or medication change occurs.'),
  deviceCost: field('One-time vendor/device package', 'Costs and staffing', CASHBOOK_VENDOR_PACKAGE.deviceCost, 'USD/new start', 0, 10000, 'Business-plan vendor onboarding package, including the device under the user-confirmed inclusions. Once per unique new start, never added again as a separate device purchase. Clinic team onboarding labor remains separate. Not an independently verified vendor quote.', { evidenceType: 'Business-plan package; user-confirmed inclusions', sourceNotes: 'RPM Cash Book.xlsx, RPM etc!B26: $90 one-time vendor onboarding. User confirmed device/software/cellular are included in the vendor package; team labor is separate.' }),
  monthlyTechnologyCost: field('Monthly RPM vendor package', 'Costs and staffing', CASHBOOK_VENDOR_PACKAGE.monthlyTechnologyCost, 'USD/month', 0, 1000, 'Business-plan recurring RPM package includes software and cellular under the user-confirmed inclusions. Charged for every active month. Clinic team labor remains separate; not an independently verified vendor quote.', { evidenceType: 'Business-plan package; user-confirmed inclusions', sourceNotes: 'RPM Cash Book.xlsx, RPM etc!B28: $12 per RPM month. User confirmed the vendor package covers device/software/cellular charges, excluding the team labor cost.' }),
  monthlyConnectivityCost: field('Additional connectivity per active month', 'Costs and staffing', CASHBOOK_VENDOR_PACKAGE.monthlyConnectivityCost, 'USD/month', 0, 1000, 'Zero in the business-plan package because cellular connectivity is already included. Enter a separate charge only if it is additional to the monthly package.', { evidenceType: 'User-confirmed package inclusion', sourceNotes: 'User clarification of RPM Cash Book.xlsx, RPM etc!B26 and B28: do not add device/software/cellular charges again.' }),
  monthlyPlatformBaseCost: field('Additional platform fee per provider per month', 'Costs and staffing', CASHBOOK_VENDOR_PACKAGE.monthlyPlatformBaseCost, 'USD/provider-month', 0, 10000, 'Zero in the business-plan package because software/platform charges are included. An additional contract fee, if any, is charged for 12 months in each scenario; do not duplicate an included charge.', { evidenceType: 'User-confirmed package inclusion', sourceNotes: 'User clarification of RPM Cash Book.xlsx, RPM etc!B26 and B28: vendor software is included.' }),
  platformProviderCount: field('Additional platform provider licenses', 'Costs and staffing', CASHBOOK_VENDOR_PACKAGE.platformProviderCount, 'licenses', 0, 10000, 'Applies only to the separately entered platform base fee. The default fee is zero for the business-plan package. Capacity and provider-license requirements are not established.', { step: 1, integer: true }),
  fixedCost: field('Other current-program fixed costs', 'Costs and staffing', 5000, 'USD/year', 0, 10000000, 'Assumed nontechnology overhead counted once in each scenario. Excludes the separately listed platform license, variable technology and loaded labor benefits.'),
  addedFixedCost: field('Additional integration fixed cost', 'Costs and staffing', 1000, 'USD/year', 0, 10000000, 'Incremental implementation/capacity cost, counted once in the integrated scenario.'),
  clinicalMode: { label: 'Deprescribing analysis', group: 'Deprescribing assumptions', default: 'illustrative', unit: '', options: ['none', 'illustrative', 'minor', 'unestimated'], description: 'MINOR uses patient-level antihypertensive deprescribing at 45 days among comparable monitored patients, without a low-BP multiplier. Illustrative uses hypothetical low-BP-gated actions; none explicitly sets clinical effects to zero; unestimated keeps endpoints missing.', evidenceType: 'Model choice' },
  minorEligibleShare: probability('Share comparable to the MINOR population', 'Deprescribing assumptions', 1, 'Explicit scenario assumption: share of monitored patients comparable to MINOR adults aged 60 or older, taking antihypertensives, able to perform home BP monitoring and not poorly adherent. This is not the 23% low-BP subgroup or a measured local eligibility rate.', { nullable: true, sourceUrls: [MINOR_URL] }),
  minorActionBaseline: probability('MINOR: deprescribing with home BP and usual review', 'Deprescribing assumptions', 11 / 161, '11 of 161 participants had antihypertensive deprescribing at 45 days. Applies to comparable monitored patients, not only low-BP patients. The current publisher abstract, table and author record support 11; an older indexed abstract reports 9 (5.6%).', { nullable: true, evidenceType: 'Randomized trial proportion; transferred short-term scenario', sourceUrls: [MINOR_URL, MINOR_AUTHOR_URL] }),
  minorActionIntegrated: probability('MINOR: deprescribing with pharmacist review', 'Deprescribing assumptions', 31 / 161, '31 of 161 participants had antihypertensive deprescribing at 45 days with pharmacist collaborative drug-therapy management plus home BP monitoring. Used only with a completed pharmacist review/intake. Brazilian trial; not validated Original Medicare or a one-medicine-stop probability.', { nullable: true, evidenceType: 'Randomized trial proportion; transferred short-term scenario', sourceUrls: [MINOR_URL] }),
  minorExtrapolation: { label: 'Extend MINOR beyond its measured endpoint', group: 'Deprescribing assumptions', default: 'off', unit: '', options: ['off', 'assumed'], description: 'Off reports 45-day patient outcomes only; later persistence, medicine-months and drug savings are unknown. Assumed adds one medicine-equivalent per affected patient and a transferred persistence curve starting at the 45-day assessment, approximated as two months after review. This extension was not measured by MINOR or the combined recruitment program.', evidenceType: 'Explicit extrapolation choice', sourceUrls: [MINOR_URL, 'https://pubmed.ncbi.nlm.nih.gov/41505212/'] },
  lowBpShare: probability('Low BP prompting clinical assessment', 'Deprescribing assumptions', .23, 'Transferred prevalence, including asymptomatic low BP. Low BP does not itself establish overtreatment.', { nullable: true, evidenceType: 'Literature-informed assumption', sourceUrls: ['https://ojs.jaff.org.br/ojs/index.php/jaff/article/view/1367'] }),
  actionBaseline: probability('Usual-care medication action after low BP assessment', 'Deprescribing assumptions', .1, 'Investigator probability of an appropriate one-medicine reduction after assessment; not MINOR 28.6%.', { nullable: true }),
  actionIntegrated: probability('Medication action with added completed review', 'Deprescribing assumptions', .3, 'Used only for patients with a completed MTM review; others retain usual-care probability. Investigator assumption, not MINOR-derived.', { nullable: true }),
  persistence12: probability('Reduction maintained 12 months after action', 'Deprescribing assumptions', .694, 'Transferred patient-level conditional persistence. Simplified to one medicine per action; monthly continuation equals this value to the power 1/12.', { nullable: true, evidenceType: 'Literature-informed assumption', sourceUrls: ['https://pubmed.ncbi.nlm.nih.gov/41505212/'] }),
  drugCostPerMonth: field('Net saving per reduced medicine-month', 'Deprescribing assumptions', 10, 'USD/medicine-month', 0, 10000, 'Assumed net savings after substitution/dose adjustment. Clinic does not automatically retain this saving.', { nullable: true })
}
export const DEFAULT_INTEGRATION_INPUTS = Object.freeze(Object.fromEntries(Object.entries(INPUT_DEFINITIONS).map(([key, d]) => [key, d.default])))
function paymentSchedule(p, integrated = false) {
  const team = integrated && p.staffingMode === 'integrated-team'
  const minutes = p.monitorPhysicianMinutes + (team ? p.monitorPharmacistMinutes + p.qualifiedSupportMinutes : p.qualifiedNurseMinutes)
  const common = { mode: p.reimbursementMode, deviceCodeLabel: null, deviceFee: 0, managementCode: null, managementFee: 0, additionalUnits: 0, monthlyBenchmark: 0, setupFee: 0, qualifyingClinicalMinutes: minutes, staffingMode: team ? 'integrated-team' : 'shared-clinic', arm: integrated ? 'integrated' : 'baseline', clinicalMinutesByRole: { physician: p.monitorPhysicianMinutes, nurse: team ? 0 : p.qualifiedNurseMinutes, pharmacist: team ? p.monitorPharmacistMinutes : 0, technician: team ? p.qualifiedSupportMinutes : 0, medicalAssistant: 0 } }
  if (p.reimbursementMode === 'none') return { ...common, notes: ['All RPM receipts are excluded; staffing, devices, software and other program costs remain.'] }
  if (p.reimbursementMode === 'custom') return { ...common, monthlyBenchmark: p.monthlyRevenueBenchmark, setupFee: p.customSetupRevenueBenchmark, notes: ['Editable clinic allowance assumptions, not CPT-coded payments. Clinical minutes do not automatically change a custom payment.', 'Setup and recurring qualification and collection realization still apply; all collected receipts count toward clinic revenue.'] }
  const fees = RPM_MEDICARE_2026_FEES
  const additionalUnits = minutes >= 20 ? Math.min(2, Math.floor((minutes - 20) / 20)) : 0
  const managementCode = minutes >= 20 ? '99457' : minutes >= 10 ? '99470' : null
  const managementFee = (minutes >= 20 ? fees.management99457 : minutes >= 10 ? fees.management99470 : 0) + additionalUnits * fees.additional99458
  return { ...common, deviceCodeLabel: '99454 (16+ days) OR 99445 (2–15 days)', deviceFee: fees.device99454, managementCode, managementFee, additionalUnits, monthlyBenchmark: fees.device99454 + managementFee, setupFee: fees.setup99453, notes: [
    '2026 national nonfacility Original Medicare fee-for-service benchmarks, subject to geographic, setting and clinician differences; not guaranteed receipts.',
    'Device codes are alternatives, never summed. The chosen qualifying recurring bundle contains one device payment plus the management tier shown.',
    'Nonoverlapping physician clinical-management minutes plus the qualifying nurse or pharmacist/technician minutes select each arm’s tier. Administrative supervision, medical-assistant logistics, separate onboarding, recruitment and MTM review are excluded. Qualifying subsets are costed once.',
    'The qualifying nurse or technician subset assumes eligible personnel, state-law scope, supervision and a compliant billing arrangement. Medical assistants contribute only nonclinical time in this model. A job title or business plan does not itself establish eligibility.',
    '10–19 minutes uses 99470; 20+ uses 99457, plus one 99458 per full additional 20 minutes. At most two add-on units are modeled as an explicit conservative cap, not a universal payer rule.',
    'A pooled qualification share represents all remaining billing requirements, including interactive communication and an eligible billing arrangement; time alone is insufficient.'
  ] }
}
export function getRpmPaymentSchedule(inputs = DEFAULT_INTEGRATION_INPUTS, arm = 'baseline') {
  if (![true, false, 'baseline', 'integrated'].includes(arm)) throw new RangeError('Select baseline or integrated payment schedule.')
  return paymentSchedule(checked(inputs), arm === true || arm === 'integrated')
}
export const INTEGRATION_MODEL_METADATA = {
  id: 'mtm-rpm-additive-integration', version: '6.0.0', schemaVersion: 6,
  perspective: 'Clinic operating margin', payerPopulation: 'Original Medicare fee-for-service; Medicare Advantage and commercial contracts excluded',
  currency: 'USD', priceYear: 2026, priceBasis: '2026 budget scenario with source-year transfers explicitly documented: BLS May 2025 national occupational wages use an assumed June 2026 healthcare benefit ratio. Cashbook wages are not used. Vendor package and component-price assumptions are not inflation-adjusted automatically.',
  comparator: 'Physician-led RPM with registered nurse and medical-assistant support, no pharmacist, versus the same delivery team plus pharmacist recruitment and medication review. Optional integrated-team staffing is a separate sensitivity.',
  endpoint: 'Additional clinic operating surplus per 1,000 eligible Original Medicare fee-for-service members during a 12-month budget year; medication-cost offsets reported separately',
  initiation: 'At least one transmitted BP reading; not automatically a revenue-qualifying service month',
  randomization: 'mulberry32; fixed version-1 random stream for pathway, continuation, monthly qualification and clinical draws. HealthPartners changes the attendance/activation thresholds; MINOR reuses the low-BP draw solely for its independent comparable-population eligibility flag, without applying the low-BP probability. Setup qualification uses a separate FNV-1a patient-keyed seed (setup:seed:syntheticID), shared across scenarios; no extra consumption of the original random stream. Explicit recontact uses its original independent retry draw.',
  recruitmentEvidence: [{ id: 'healthpartners-hyperlink3', title: 'HealthPartners HyperLink 3 (2022)', url: HEALTHPARTNERS_URL, intakeNumerator: 385, intakeDenominator: 1423, activationConditionalOnIntake: .8, intakeMinutes: 60, limitation: 'Mixed-payer uncontrolled-hypertension population; intake within six weeks, not an annual offer or causal added-enrollment rate.' }],
  clinicalEvidence: [{ id: 'minor-2023', title: 'MINOR randomized trial (2023)', url: MINOR_URL, corroborationUrl: MINOR_AUTHOR_URL, baselineNumerator: 11, integratedNumerator: 31, denominatorPerArm: 161, endpointDays: 45, limitation: 'Brazilian adults aged 60 or older; all studied patients, not just low BP. Older indexed abstract reports 9 controls; current publisher/table and author record report 11. Exact medicine count and annual persistence are not established.' }],
  financialEvidence: FINANCIAL_EVIDENCE,
  medicare2026Fees: RPM_MEDICARE_2026_FEES,
  assumptions: [
    'Existing RPM patients and usual physician referrals are identical in both scenarios. Unique RPM episodes are the union of physician and pharmacist initiations; duplicate offers still cost time.',
    'Known existing RPM participants receive reviews but no new RPM offer/device. Default null recontactUptake prevents offers to unsuccessful physician referrals; a numeric retry probability enables recontact with a separate independent draw.',
    'No exact contact sequence is simulated. Recontact eligibility is a simplified usual-pathway classification, not a claim about real-time concurrent referral scheduling.',
    'New RPM starts and reviews occur at the beginning of startMonth. Illustrative actions occur then; MINOR actions are 45-day outcomes, approximated at startMonth + 2 only for optional budget extrapolation. Existing patients receive up to 12 months; new patients only remaining budget months. Retention is a constant monthly assumption.',
    'All active months incur service costs. Recurring and one-time setup qualification are separate assumptions. Setup payment is at most once per unique new start and never charged for an existing participant. Both revenue components are multiplied by collection realization; all collected receipts count as clinic revenue without a separate payer-share reduction.',
    'Medicare management payment tiers depend on each arm’s nonoverlapping physician clinical-management minutes plus its qualifying nurse or pharmacist/technician minutes, conditional on all other billing requirements. Device codes 99454 and 99445 are alternatives. At most two 99458 add-on units are modeled, a conservative analytic cap. A pooled monthly qualification fraction is not a code-level claims engine.',
    'Primary delivery is identical in both arms: illustrative 3 physician clinical-management minutes, 17 registered-nurse minutes and 10 nonclinical medical-assistant minutes per active month, with 5 nurse plus 15 assistant onboarding minutes per unique new start and 2 physician minutes per referral. Physician work remains for additional pharmacist recruits. All task durations are assumptions, not observed mean workloads. The baseline contains no pharmacist or pharmacy-technician labor.',
    'The optional integrated-team sensitivity replaces integrated-arm nurse/assistant RPM delivery only, while retaining 3 physician clinical-management minutes. The illustrative 90% technician / 10% pharmacist RPM task allocation applies to the 5-minute offer, 20-minute onboarding and 30-minute monthly workflow. The 9:1 ratio is technician-to-pharmacist task time, not staff headcount or all program hours. The 10-minute added medication review remains pharmacist work. The cashbook informs service structure only; its wages, mixed RPM/CCM durations, revenue and provider-fee assumptions are not imported. The separately user-confirmed vendor package remains an explicit cost assumption.',
    'Default BLS May 2025 base hourly wages include $122.99 for family medicine physicians, $48.76 for registered nurses, $22.17 for medical assistants, $67.75 for pharmacists and $22.41 for pharmacy technicians, multiplied once by the June 2026 healthcare 49.93/35.13 compensation ratio. This is an approximate cross-year employer-cost benchmark, not measured local compensation or an advanced-technician-specific wage. Delegated minutes do not automatically reduce cash payroll or establish spare staffing capacity.',
    'The clinic serves Original Medicare fee-for-service patients. Monthly and setup qualification each default to 70%, and all-in collection realization to 90%; these are unvalidated planning assumptions, not observed clinic rates or CMS requirements. Collection realization applies to the total allowed amount across Medicare, patient and supplemental-insurance collections; do not apply another 80% Medicare factor. Neither reimbursement eligibility nor staffing workload is established by the fee benchmarks.',
    'Default vendor costs use the cashbook $90 one-time onboarding and $12 monthly RPM package. The user confirmed device/software/cellular are included and clinic team labor is separate, so no additional device purchase, connectivity or platform base fee is added. Inclusions are business-plan assumptions, not an independently verified vendor contract. Published component-price sensitivities use separate unverified vendor components and $5 assumed connectivity.',
    'Platform base licenses cost 12 times the monthly fee times license count in each scenario; other fixed costs exclude this fee and loaded labor benefits. Integration fixed costs occur once. No capacity limit or discrete hiring steps are modeled.',
    'HealthPartners mode substitutes 385/1423 intake attendance and 80% conditional first transmission for the c, o and qB stages. The targeted cohort share remains assumed. One outreach work bundle is charged per targeted person, including nonattendees; the approximately 60-minute pharmacist intake is charged to every attendee and replaces the shorter medication review. Additional pharmacist starts do not incur another clinic onboarding bundle; usual physician starts retain one onboarding episode under each arm’s selected staffing. Vendor charges remain once per new episode.',
    'HealthPartners intake may also reach existing RPM patients in this adaptation, an explicit transfer outside the reported recruitment denominator. The six-week study attendance proportion is applied once, not repeatedly every month. An independent assessment of applicability and capacity is still required.',
    'MINOR uses complete-case trial proportions 11/161 versus 31/161 for patient-level deprescribing at 45 days, applied to the assumed comparable share of patients active in RPM at the review month. The activeAtAssessment field represents eligibility at that review, not a second retention gate at day 45. No additional loss to follow-up during those 45 days is modeled. The integrated probability applies only after completed pharmacist review, with no low-BP multiplier. Country, payer, workflow and completion assumptions are transferred; combining HealthPartners recruitment and MINOR clinical effects is not a trial-tested intervention.',
    'MINOR short-term mode leaves annual persistence, medication-months and drug savings null. Its optional extension assumes one medication-equivalent per affected patient, a two-month assessment offset and the specified 12-month persistence after assessment. Singapore maintenance began after deprescribing, not MINOR day 45; this shifted time origin is an explicit cross-study extrapolation, not an empirical annual MINOR result.',
    'The no-enhanced-deprescribing scenario retains the current usual-care action probability after pharmacist review. More RPM participants may still produce more usual-care actions; it does not impose zero total incremental outcomes. none is an explicit zero-clinical-benefit assumption in both arms, not missing evidence. unestimated yields null clinical endpoints; required inputs for MINOR 45-day actions and its optional later extension are evaluated separately. Missing persistence or medication-cost inputs do not erase known short-term actions. Clinic operating margin remains estimable because it excludes medication savings.',
    'Illustrative actions require active RPM at the assessment month, assumed low BP and the conditional action probability. Existing patients who left RPM before startMonth have no modeled action. One medicine per action is assumed; this is not an observed medication-level persistence estimate. After action, medication persistence is independent of subsequent RPM retention.',
    'Medication persistence is measured 12 months after reduction, potentially after the budget year. Only within-budget medication-months generate year-one savings. No symptoms, BP responders, falls or CV savings are estimated.',
    'Clinic net financial benefit equals operating margin: all collected RPM receipts minus program costs. Drug savings are displayed separately without assuming the clinic retains them. This clinic-only model does not consolidate a parent health plan or estimate insurer savings as clinic income.',
    'Expected values are analytic scenario projections; seeded integers illustrate Monte Carlo variability. More synthetic patients or seeds do not strengthen the empirical evidence or establish causal synergy.'
  ],
  evidence: Object.fromEntries(Object.entries(INPUT_DEFINITIONS).map(([key, d]) => [key, { basis: d.evidenceType, referenceDefault: d.default, unit: d.unit, description: d.description, sources: d.sourceUrls || [], sourceNotes: d.sourceNotes || null }]))
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
  if (typeof inputs.qualifiedNurseMinutes === 'number' && typeof inputs.monitorNurseMinutes === 'number' && inputs.qualifiedNurseMinutes > inputs.monitorNurseMinutes) errors.qualifiedNurseMinutes = 'Qualifying nurse minutes must be a subset of total nurse minutes.'
  if (typeof inputs.qualifiedSupportMinutes === 'number' && typeof inputs.monitorSupportMinutes === 'number' && inputs.qualifiedSupportMinutes > inputs.monitorSupportMinutes) errors.qualifiedSupportMinutes = 'Qualifying support minutes must be a subset of total support minutes.'
  return errors
}
function checked(inputs) { const errors = validateIntegrationInputs(inputs); if (Object.keys(errors).length) { const e = new RangeError(JSON.stringify(errors)); e.errors = errors; throw e } return { ...inputs } }
function rng(seed) { let x = seed >>> 0; return () => { x = (x + 0x6d2b79f5) >>> 0; let t = Math.imul(x ^ x >>> 15, x | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296 } }
function setupDraw(seed, patientId) {
  let hash = 2166136261
  for (const character of `setup:${seed}:${patientId}`) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0
  return rng(hash)()
}
const COST_KEYS = ['reviews', 'offers', 'supportOffers', 'onboarding', 'supportOnboarding', 'pharmacistMonitoring', 'technicalSupport', 'physicianReferrals', 'physicianMonitoring', 'nurseMonitoring', 'assistantMonitoring', 'nurseOnboarding', 'assistantOnboarding', 'devices', 'software', 'connectivity', 'platformBase', 'otherFixed', 'addedFixed']
const emptyCosts = () => Object.fromEntries(COST_KEYS.map(key => [key, 0]))
const healthPartners = p => p.recruitmentMode === 'healthpartners'
const recruitmentParameters = p => healthPartners(p) ? { completion: p.intakeAttendance, offer: 1, activation: p.activationAfterIntake } : { completion: p.c, offer: p.o, activation: p.qB }
function clinicalAvailability(p) {
  if (p.clinicalMode === 'none') return { actions: true, annual: true, savings: true }
  if (p.clinicalMode === 'minor') {
    const actions = ['minorEligibleShare', 'minorActionBaseline', 'minorActionIntegrated'].every(k => p[k] !== null)
    const annual = actions && p.minorExtrapolation === 'assumed' && p.persistence12 !== null
    return { actions, annual, savings: annual && p.drugCostPerMonth !== null }
  }
  const known = p.clinicalMode === 'illustrative' && ['lowBpShare', 'actionBaseline', 'actionIntegrated', 'persistence12', 'drugCostPerMonth'].every(k => p[k] !== null)
  return { actions: known, annual: known, savings: known }
}
const emptyClinical = p => { const known = clinicalAvailability(p); return { actions: known.actions ? 0 : null, sustainedAt12Months: known.annual ? 0 : null, medicationMonths: known.annual ? 0 : null } }
const geometricMonths = (months, retention) => { let total = 0; for (let k = 0; k < months; k++) total += retention ** k; return total }
function pathway(p, existing, physicianReferred, aUptake, bUptake, population, completion, offer, retry) {
  const referred = !existing && physicianReferred
  const aStarted = referred && aUptake
  const completed = population && completion
  const failedPhysician = referred && !aStarted
  const offered = !existing && completed && offer && (!failedPhysician || p.recontactUptake !== null)
  const bStarted = offered && (failedPhysician ? retry : bUptake)
  return { recruitmentMode: p.recruitmentMode, existingRpm: existing, physician: { referred, initiated: aStarted }, pharmacist: { inReviewPopulation: population, targetedForIntake: healthPartners(p) && population, intakeAttended: healthPartners(p) && completed, reviewCompleted: completed, offered, duplicateOffer: offered && referred, recontacted: offered && failedPhysician, initiated: bStarted, reasonForNoOffer: existing ? 'already-rpm' : !population ? 'outside-review-population' : !completed ? 'review-not-completed' : failedPhysician && p.recontactUptake === null ? 'recontact-disabled' : !offer ? 'not-offered' : null }, additionalInitiation: !existing && !aStarted && bStarted }
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
  const contacts = integrated ? Number(healthPartners(p) ? state.pharmacist.inReviewPopulation : state.pharmacist.offered) : 0
  const reviewDuration = healthPartners(p) ? p.intakeMinutes : p.reviewMinutes
  // The intake includes review and device education. Preserve usual physician onboarding
  // in both arms; exclude a second clinic onboarding bundle only for additional HP starts.
  const onboarding = Number(newInitiation && !(integrated && healthPartners(p) && state.additionalInitiation))
  const team = integrated && p.staffingMode === 'integrated-team'
  const taskRecords = [
    { role: 'physician', task: 'referral', minutes: Number(state.physician.referred) * p.physicianReferralMinutes, wage: p.physicianWage, key: 'physicianReferrals' },
    { role: 'physician', task: 'clinical review and management', minutes: activeMonths * p.monitorPhysicianMinutes, wage: p.physicianWage, key: 'physicianMonitoring' },
    { role: 'nurse', task: 'onboarding', minutes: team ? 0 : onboarding * p.onboardingNurseMinutes, wage: p.nurseWage, key: 'nurseOnboarding' },
    { role: 'medicalAssistant', task: 'onboarding', minutes: team ? 0 : onboarding * p.onboardingAssistantMinutes, wage: p.assistantWage, key: 'assistantOnboarding' },
    { role: 'nurse', task: 'monitoring and follow-up', minutes: team ? 0 : activeMonths * p.monitorNurseMinutes, wage: p.nurseWage, key: 'nurseMonitoring' },
    { role: 'medicalAssistant', task: 'logistics and reminders', minutes: team ? 0 : activeMonths * p.monitorAssistantMinutes, wage: p.assistantWage, key: 'assistantMonitoring' },
    { role: 'pharmacist', task: 'added medication review', minutes: reviews * reviewDuration, wage: p.pharmacistWage, key: 'reviews' },
    { role: 'pharmacist', task: 'recruitment outreach', minutes: contacts * p.offerMinutes, wage: p.pharmacistWage, key: 'offers' },
    { role: 'technician', task: 'recruitment assistance', minutes: contacts * p.offerSupportMinutes, wage: p.supportWage, key: 'supportOffers' },
    { role: 'pharmacist', task: 'onboarding', minutes: team ? onboarding * p.onboardingMinutes : 0, wage: p.pharmacistWage, key: 'onboarding' },
    { role: 'technician', task: 'onboarding', minutes: team ? onboarding * p.onboardingSupportMinutes : 0, wage: p.supportWage, key: 'supportOnboarding' },
    { role: 'pharmacist', task: 'clinical monitoring', minutes: team ? activeMonths * p.monitorPharmacistMinutes : 0, wage: p.pharmacistWage, key: 'pharmacistMonitoring' },
    { role: 'technician', task: 'RPM clinical and nonclinical support', minutes: team ? activeMonths * p.monitorSupportMinutes : 0, wage: p.supportWage, key: 'technicalSupport' }
  ].filter(task => task.minutes > 0).map(task => ({ ...task, cost: task.minutes / 60 * task.wage }))
  const hours = role => taskRecords.filter(task => task.role === role).reduce((sum, task) => sum + task.minutes / 60, 0)
  const physicianHours = hours('physician'); const nurseHours = hours('nurse'); const assistantHours = hours('medicalAssistant')
  const pharmacistHours = hours('pharmacist'); const technicianHours = hours('technician'); const supportHours = technicianHours
  const costBreakdown = {
    ...emptyCosts(),
    ...Object.fromEntries(taskRecords.map(task => [task.key, task.cost])),
    devices: Number(newInitiation) * p.deviceCost,
    software: activeMonths * p.monthlyTechnologyCost,
    connectivity: activeMonths * p.monthlyConnectivityCost
  }
  const programCost = Object.values(costBreakdown).reduce((sum, cost) => sum + cost, 0)
  const qualifiedSetups = newInitiation ? (draws ? Number(draws.setup < p.setupQualificationShare) : p.setupQualificationShare) : 0
  const schedule = paymentSchedule(p, integrated)
  const monthlyRevenue = qualifiedMonths * schedule.monthlyBenchmark * p.collectionShare
  const setupRevenue = qualifiedSetups * schedule.setupFee * p.collectionShare
  const revenue = monthlyRevenue + setupRevenue
  const availability = clinicalAvailability(p)
  const clinical = emptyClinical(p)
  let drugSavings = availability.savings ? 0 : null
  const minor = p.clinicalMode === 'minor'
  const clinicalAssessmentMonth = p.startMonth + (minor ? 2 : 0)
  if (availability.actions && p.clinicalMode !== 'none' && participating) {
    const reviewed = integrated && state.pharmacist.reviewCompleted
    const probability = minor ? (reviewed ? p.minorActionIntegrated : p.minorActionBaseline) : (reviewed ? p.actionIntegrated : p.actionBaseline)
    const eligibility = minor ? p.minorEligibleShare : p.lowBpShare
    const action = draws ? Number(Boolean(activeAtAssessment) && draws.low < eligibility && draws.action < probability) : activeAtAssessment * eligibility * probability
    clinical.actions = action
    if (availability.annual) {
      const persistenceMonth = p.persistence12 ** (1 / 12)
      const availableBudgetMonths = Math.max(0, 13 - clinicalAssessmentMonth)
      if (!draws) {
        clinical.sustainedAt12Months = action * p.persistence12
        clinical.medicationMonths = action * geometricMonths(availableBudgetMonths, persistenceMonth)
      } else {
        let continued = Boolean(action)
        for (let k = 0; k < 12; k++) {
          if (k < availableBudgetMonths && continued) clinical.medicationMonths++
          continued = continued && draws.persistence[k] < persistenceMonth
        }
        clinical.sustainedAt12Months = Number(continued)
      }
      if (availability.savings) drugSavings = clinical.medicationMonths * p.drugCostPerMonth
    }
  }
  const operatingMargin = revenue - programCost
  return { participating, newInitiation, activeMonths, qualifiedMonths, qualifiedSetups, activeAtAssessment, physicianHours, nurseHours, assistantHours, pharmacistHours, technicianHours, supportHours, taskRecords, qualifyingClinicalMinutesPerMonth: schedule.qualifyingClinicalMinutes, monthlyRevenue, setupRevenue, revenue, costBreakdown, programCost, drugSavings, operatingMargin, netFinancialBenefit: operatingMargin, clinicalAssessmentMonth, clinical }
}
const NUMERIC_KEYS = ['existingPatients', 'newInitiations', 'totalParticipants', 'physicianReferrals', 'offers', 'duplicateOffers', 'reviews', 'intakeAttendees', 'outreachContacts', 'activeMonths', 'qualifiedMonths', 'qualifiedSetups', 'physicianHours', 'nurseHours', 'assistantHours', 'pharmacistHours', 'technicianHours', 'supportHours', 'monthlyRevenue', 'setupRevenue', 'revenue', 'programCost', 'drugSavings', 'operatingMargin', 'netFinancialBenefit']
function emptyArm(p) { return { ...Object.fromEntries(NUMERIC_KEYS.map(k => [k, !clinicalAvailability(p).savings && k === 'drugSavings' ? null : 0])), costBreakdown: emptyCosts(), clinical: emptyClinical(p) } }
function accumulate(total, patient, integrated, weight) {
  const row = integrated ? patient.integrated : patient.baseline
  const values = { ...row, existingPatients: Number(patient.existingRpm), newInitiations: Number(row.newInitiation), totalParticipants: Number(row.participating), physicianReferrals: Number(patient.physician.referred), offers: integrated ? Number(patient.pharmacist.offered) : 0, duplicateOffers: integrated ? Number(patient.pharmacist.duplicateOffer) : 0, reviews: integrated ? Number(patient.pharmacist.reviewCompleted) : 0, intakeAttendees: integrated ? Number(patient.pharmacist.intakeAttended) : 0, outreachContacts: integrated ? Number(patient.recruitmentMode === 'healthpartners' ? patient.pharmacist.inReviewPopulation : patient.pharmacist.offered) : 0 }
  for (const key of NUMERIC_KEYS) if (total[key] !== null) total[key] += values[key] * weight
  for (const key of COST_KEYS) total.costBreakdown[key] += row.costBreakdown[key] * weight
  for (const key of Object.keys(total.clinical)) if (total.clinical[key] !== null) total.clinical[key] += row.clinical[key] * weight
}
function finish(p, baseline, integrated) {
  for (const [row, additional] of [[baseline, 0], [integrated, p.addedFixedCost]]) {
    row.costBreakdown.platformBase = 12 * p.monthlyPlatformBaseCost * p.platformProviderCount
    row.costBreakdown.otherFixed = p.fixedCost; row.costBreakdown.addedFixed = additional
    const fixed = row.costBreakdown.platformBase + p.fixedCost + additional
    row.fixedCost = fixed; row.variableCost = row.programCost; row.programCost += fixed; row.operatingMargin -= fixed; if (row.netFinancialBenefit !== null) row.netFinancialBenefit -= fixed
  }
  const delta = Object.fromEntries([...NUMERIC_KEYS, 'fixedCost', 'variableCost'].map(k => [k, baseline[k] === null || integrated[k] === null ? null : integrated[k] - baseline[k]]))
  delta.clinical = Object.fromEntries(Object.keys(baseline.clinical).map(k => [k, baseline.clinical[k] === null ? null : integrated.clinical[k] - baseline.clinical[k]]))
  delta.costBreakdown = Object.fromEntries(COST_KEYS.map(key => [key, integrated.costBreakdown[key] - baseline.costBreakdown[key]]))
  delta.marginPer1000 = delta.operatingMargin / p.N * 1000
  delta.netBenefitPer1000 = delta.netFinancialBenefit === null ? null : delta.netFinancialBenefit / p.N * 1000
  delta.roi = delta.programCost > 0 && delta.netFinancialBenefit !== null ? delta.netFinancialBenefit / delta.programCost : null
  return { baseline, integrated, delta }
}
export function summarizeIntegrationPatients(patients, inputs = DEFAULT_INTEGRATION_INPUTS) {
  const p = checked(inputs); const baseline = emptyArm(p); const integrated = emptyArm(p)
  for (const patient of patients) { accumulate(baseline, patient, false, 1); accumulate(integrated, patient, true, 1) }
  return finish(p, baseline, integrated)
}
const possibilities = probability => [[false, 1 - probability], [true, probability]].filter(([, weight]) => weight > 0)
export function expectedIntegrationStudy(inputs = DEFAULT_INTEGRATION_INPUTS) {
  const p = checked(inputs); const baseline = emptyArm(p); const integrated = emptyArm(p)
  const recruitment = recruitmentParameters(p)
  const boundaries = [...new Set([0, p.qA, recruitment.activation, 1])].sort((a, b) => a - b)
  for (const [existing, wE] of possibilities(p.existingRpmShare)) for (const [ref, wR] of possibilities(p.r)) for (const [population, wF] of possibilities(p.f)) for (const [completion, wC] of possibilities(recruitment.completion)) for (const [offer, wO] of possibilities(recruitment.offer)) for (const [retry, wRetry] of possibilities(p.recontactUptake ?? 0)) for (let k = 1; k < boundaries.length; k++) {
    const low = boundaries[k - 1]; const high = boundaries[k]; const midpoint = (low + high) / 2
    const weight = p.N * wE * wR * wF * wC * wO * wRetry * (high - low)
    const patient = pathway(p, existing, ref, midpoint < p.qA, midpoint < recruitment.activation, population, completion, offer, retry)
    patient.baseline = arm(p, patient, false); patient.integrated = arm(p, patient, true)
    accumulate(baseline, patient, false, weight); accumulate(integrated, patient, true, weight)
  }
  return finish(p, baseline, integrated)
}
export function simulateIntegrationStudy(inputs = DEFAULT_INTEGRATION_INPUTS) {
  const p = checked(inputs); const random = rng(p.seed); const recruitment = recruitmentParameters(p)
  const patients = Array.from({ length: p.N }, (_, i) => {
    const existing = random() < p.existingRpmShare; const referred = random() < p.r; const initiation = random()
    const population = random() < p.f; const complete = random() < recruitment.completion; const offered = random() < recruitment.offer; const retry = random() < (p.recontactUptake ?? 0)
    const draws = { continuation: Array.from({ length: 11 }, random), qualification: Array.from({ length: 12 }, random), low: random(), action: random(), persistence: Array.from({ length: 12 }, random), setup: setupDraw(p.seed, `S${String(i + 1).padStart(4, '0')}`) }
    const patient = { id: `S${String(i + 1).padStart(4, '0')}`, ...pathway(p, existing, referred, initiation < p.qA, initiation < recruitment.activation, population, complete, offered, retry) }
    patient.baseline = arm(p, patient, false, draws); patient.integrated = arm(p, patient, true, draws)
    return patient
  })
  return { inputs: p, metadata: clone(INTEGRATION_MODEL_METADATA), patients, expected: expectedIntegrationStudy(p), actual: summarizeIntegrationPatients(patients, p) }
}
export function getIntegrationScenarios(inputs = DEFAULT_INTEGRATION_INPUTS) {
  const p = checked(inputs)
  const evidence20 = { ...p, staffingMode: 'integrated-team', ...FINANCIAL_BENCHMARKS, reimbursementMode: 'medicare2026', monitorPharmacistMinutes: 20, monitorSupportMinutes: 10, qualifiedSupportMinutes: 0, offerMinutes: 5, offerSupportMinutes: 0, onboardingMinutes: 20, onboardingSupportMinutes: 0, qualificationShare: .7, setupQualificationShare: .7, collectionShare: .9 }
  const team = { ...p, staffingMode: 'integrated-team', ...RPM_TEAM_TASK_ALLOCATION }
  const healthPartnersInputs = { ...p, recruitmentMode: 'healthpartners', intakeAttendance: 385 / 1423, activationAfterIntake: .8, intakeMinutes: 60 }
  const minorInputs = { clinicalMode: 'minor', minorEligibleShare: 1, minorActionBaseline: 11 / 161, minorActionIntegrated: 31 / 161, minorExtrapolation: 'off' }
  return [
    { id: 'physician-led-minor', name: 'Primary: physician-led RPM + pharmacist recruitment and MINOR deprescribing', inputs: { ...p, staffingMode: 'shared-clinic', recruitmentMode: 'mtm-offer', c: DEFAULT_INTEGRATION_INPUTS.c, o: DEFAULT_INTEGRATION_INPUTS.o, qB: DEFAULT_INTEGRATION_INPUTS.qB, ...minorInputs } },
    { id: 'healthpartners-minor', name: 'Sensitivity: HealthPartners in-person intake + MINOR deprescribing', inputs: { ...healthPartnersInputs, ...minorInputs } },
    { id: 'healthpartners', name: 'Sensitivity: HealthPartners in-person intake; clinical outcomes not estimated', inputs: { ...healthPartnersInputs, clinicalMode: 'unestimated' } },
    { id: 'minor', name: 'MINOR 45-day deprescribing; illustrative MTM recruitment', inputs: { ...p, recruitmentMode: 'mtm-offer', c: DEFAULT_INTEGRATION_INPUTS.c, o: DEFAULT_INTEGRATION_INPUTS.o, qB: DEFAULT_INTEGRATION_INPUTS.qB, ...minorInputs } },
    { id: 'minor-extension', name: 'HealthPartners + MINOR with assumed later persistence and medicine offsets', inputs: { ...healthPartnersInputs, ...minorInputs, minorExtrapolation: 'assumed', persistence12: .694, drugCostPerMonth: 10 } },
    { id: 'team-90-10', name: 'Staffing sensitivity: integrated 9:1 technician/pharmacist service + physician oversight', inputs: team },
    { id: 'team-no-qualified-support', name: 'Same team costs; support time does not qualify for management billing', inputs: { ...team, qualifiedSupportMinutes: 0 } },
    { id: 'team-published-vendor-costs', name: 'Same team workflow and wages; published device/software component costs', inputs: { ...team, ...FINANCIAL_BENCHMARKS, pharmacistWage: team.pharmacistWage, supportWage: team.supportWage } },
    { id: 'evidence-20', name: 'Prior pharmacist-heavy benchmark; 20 pharmacist + 10 nonclinical support minutes', inputs: evidence20 },
    { id: 'evidence-10', name: 'Pharmacist-heavy 10 clinical minutes; lower Medicare management tier', inputs: { ...evidence20, monitorPharmacistMinutes: 10 } },
    { id: 'qualification-90', name: '90% qualifying months (70% setups); pharmacist-heavy workload', inputs: { ...evidence20, qualificationShare: .9 } },
    { id: 'nyu-workload', name: 'NYU NP workload transferred to pharmacist: 58.33 minutes', inputs: { ...evidence20, monitorPharmacistMinutes: 10 * 52 / 12 + 15 } },
    { id: 'zero-rpm-revenue', name: 'No RPM receipts; all service costs retained', inputs: { ...p, reimbursementMode: 'none' } },
    { id: 'no-enhanced-deprescribing', name: 'No enhanced deprescribing effect; usual-care rate retained', inputs: { ...p, minorActionIntegrated: p.minorActionBaseline, actionIntegrated: p.actionBaseline } },
    { id: 'conservative', name: 'Zero deprescribing outcomes in both arms (explicit assumption)', inputs: { ...p, clinicalMode: 'none' } },
    { id: 'illustrative', name: 'Illustrative deprescribing assumptions', inputs: { ...p, clinicalMode: 'illustrative', lowBpShare: .23, actionBaseline: .1, actionIntegrated: .3, persistence12: .694, drugCostPerMonth: 10 } },
    { id: 'no-added-recruitment', name: healthPartners(p) ? 'No additional RPM activation; intake and outreach costs retained' : 'No added RPM offers; review costs retained', inputs: healthPartners(p) ? { ...p, activationAfterIntake: 0, recontactUptake: p.recontactUptake === null ? null : 0 } : { ...p, o: 0 } },
    { id: 'unestimated', name: 'Clinical benefits not estimable', inputs: { ...p, clinicalMode: 'unestimated' } }
  ]
}
export function findOfferThreshold(inputs = DEFAULT_INTEGRATION_INPUTS, { steps = 100 } = {}) {
  const p = checked(inputs)
  if (!Number.isInteger(steps) || steps < 1 || steps > 10000) throw new RangeError('steps must be an integer from 1 to 10,000.')
  const parameter = healthPartners(p) ? 'intakeAttendance' : 'o'
  const label = healthPartners(p) ? 'Completed pharmacist intake' : 'RPM offer after review'
  let previous = 0
  for (let i = 0; i <= steps; i++) {
    const rate = i / steps; const benefit = expectedIntegrationStudy({ ...p, [parameter]: rate }).delta.netFinancialBenefit
    if (benefit === null) return { status: 'unestimated', rate: null, resolution: 1 / steps, parameter, label }
    if (benefit >= -1e-8) {
      if (i === 0) return { status: 'already-nonnegative', rate: 0, resolution: 1 / steps, parameter, label }
      let lo = previous; let hi = rate
      for (let n = 0; n < 30; n++) { const mid = (lo + hi) / 2; if (expectedIntegrationStudy({ ...p, [parameter]: mid }).delta.netFinancialBenefit >= 0) hi = mid; else lo = mid }
      return { status: 'attainable', rate: hi, resolution: 1 / steps, parameter, label }
    }
    previous = rate
  }
  return { status: 'unattainable', rate: null, resolution: 1 / steps, parameter, label }
}
export function createIntegrationExport(run) {
  const replay = simulateIntegrationStudy(checked(run?.inputs))
  for (const key of ['metadata', 'patients', 'expected', 'actual']) if (canonical(run[key]) !== canonical(replay[key])) throw new Error(`Integration ${key} failed exact replay.`)
  return { schemaVersion: 6, modelVersion: INTEGRATION_MODEL_METADATA.version, modelId: INTEGRATION_MODEL_METADATA.id, ...clone(replay) }
}
export function verifyIntegrationExport(bundle) {
  const keys = ['schemaVersion', 'modelVersion', 'modelId', 'inputs', 'metadata', 'patients', 'expected', 'actual']
  if ([1, 2, 3, 4, 5].includes(bundle?.schemaVersion) || ['1.0.0', '2.0.0', '3.0.0', '3.1.0', '4.0.0', '5.0.0'].includes(bundle?.modelVersion)) throw new Error(`Version ${bundle.modelVersion ?? bundle.schemaVersion} integration exports cannot be replayed with model 6.0.0: the baseline is now physician-led with nurse and medical-assistant support, and staffing and billing are arm-specific. Keep the original export with its matching engine; create a new model 6.0.0 scenario explicitly.`)
  if (!bundle || Object.keys(bundle).sort().join(',') !== keys.sort().join(',') || bundle.schemaVersion !== 6 || bundle.modelVersion !== INTEGRATION_MODEL_METADATA.version || bundle.modelId !== INTEGRATION_MODEL_METADATA.id) throw new Error('Integration model or export schema mismatch; expected model 6.0.0 and schema 6.')
  createIntegrationExport(bundle); return bundle
}
const csvCell = value => '"' + String(value ?? '').replace(/"/g, '""') + '"'
export function integrationExportCsv(bundle) {
  verifyIntegrationExport(bundle)
  const columns = [...NUMERIC_KEYS, 'marginPer1000', 'netBenefitPer1000']
  const rows = [['model_version', 'seed', 'basis', 'scenario', ...columns, 'cost_breakdown_json', 'clinical_json', 'inputs_json', 'metadata_json']]
  for (const basis of ['expected', 'actual']) for (const scenario of ['baseline', 'integrated', 'delta']) { const row = bundle[basis][scenario]; rows.push([bundle.modelVersion, bundle.inputs.seed, basis, scenario, ...columns.map(k => row[k] ?? ''), JSON.stringify(row.costBreakdown), JSON.stringify(row.clinical), JSON.stringify(bundle.inputs), JSON.stringify(bundle.metadata)]) }
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n'
}
