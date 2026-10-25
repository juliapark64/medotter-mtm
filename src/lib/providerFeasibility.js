import { COMMON_FIELDS, getSettingFields, SETTINGS, POLICIES, PROVIDER_MODEL } from '../data/providerDefaults.js'
import { retainedMonths } from './valueCalculator.js'

export function validateProviderInputs(inputs) {
  const errors = {}
  const check = (values, fields, prefix) => {
    for (const [key, d] of Object.entries(fields)) {
      const value = values?.[key]
      if (typeof value !== 'number' || !Number.isFinite(value)) errors[prefix + key] = 'Enter a finite number.'
      else if (d.options && !Object.hasOwn(d.options, value)) errors[prefix + key] = 'Choose one of the listed options.'
      else if (value < d.min || (d.max !== undefined && value > d.max) || (d.integer && !Number.isInteger(value))) {
        errors[prefix + key] = d.percent ? 'Enter a percentage from 0 to 100.' : 'Enter ' + (d.integer ? 'a whole number' : 'a number') + ' from ' + d.min + (d.max === undefined ? ' upward.' : ' to ' + d.max + '.')
      }
    }
  }
  check(inputs?.common, COMMON_FIELDS, 'common.')
  for (const setting of Object.keys(SETTINGS)) {
    const values = inputs?.settings?.[setting]
    check(values, getSettingFields(setting), 'settings.' + setting + '.')
    if ([1, 2].includes(values?.rpmPaymentBasis) && values.currentRpmShare > 0 && values.rpmManagementShare > 0 && values.rpmPharmacistMinutes + values.rpmClinicalStaffMinutes < values.rpmManagementThreshold) {
      errors['settings.' + setting + '.rpmPharmacistMinutes'] = 'Combined pharmacist and other eligible clinical-staff management time must meet the selected ' + values.rpmManagementThreshold + '-minute threshold. Select the 10-minute code, change the clinical allocation, or set management qualification to zero. Technical support and onboarding do not count.'
    }
    for (const service of ['Review', 'Rpm']) if (values?.['current' + service + 'Share'] + values?.['act' + service + 'Share'] > 1 + 1e-12) {
      errors['settings.' + setting + '.act' + service + 'Share'] = 'Current-paid and additional Act shares must total no more than 100%.'
    }
  }
  return errors
}

export const providerLoadedWage = setting => setting.pharmacistRate * setting.wageYearFactor * (1 + setting.employmentLoad) / setting.productiveShare

function projectSetting(common, setting, policy, enrollment) {
  const years = []
  const monthsPerEpisode = retainedMonths(0, common.rpmDurationMonths, common.rpmDropoutRate)
  const reviewAllowed = Math.min(common.reviewCharge, PROVIDER_MODEL.actPfsFactor * common.reviewBenchmark)
  const rpmAllowed = Math.min(common.rpmCharge, PROVIDER_MODEL.actPfsFactor * common.rpmBenchmark)
  let priorStops = 0
  for (let year = 1; year <= 3; year++) {
    const actActive = policy === 'act' && year >= common.actStartYear
    const paid = policy !== 'none'
    const reviews = enrollment
    const rpmStarts = enrollment * common.rpmShare
    const rpmMonths = rpmStarts * monthsPerEpisode
    const newStops = reviews * common.recommendations * common.incrementalDetection * common.implementationRate
    priorStops *= common.stopRetention
    const discontinuedMedicationYears = priorStops + newStops
    priorStops += newStops
    const reviewPharmacistHours = reviews * (setting.reviewMinutes + setting.coordinationMinutes) / 60
    const rpmOnboardingPharmacistHours = rpmStarts * setting.onboardingPharmacistMinutes / 60
    const rpmManagementPharmacistHours = rpmMonths * setting.rpmPharmacistMinutes / 60
    const rpmClinicalStaffHours = rpmMonths * setting.rpmClinicalStaffMinutes / 60
    const pharmacistHours = reviewPharmacistHours + rpmOnboardingPharmacistHours + rpmManagementPharmacistHours
    const supportHours = (rpmStarts * setting.onboardingSupportMinutes + rpmMonths * setting.rpmSupportMinutes) / 60
    const reviewStaffCost = reviewPharmacistHours * providerLoadedWage(setting)
    const rpmPharmacistCost = (rpmOnboardingPharmacistHours + rpmManagementPharmacistHours) * providerLoadedWage(setting)
    const rpmClinicalStaffCost = rpmClinicalStaffHours * setting.clinicalStaffRate
    const supportStaffCost = supportHours * setting.supportRate
    const staffCost = reviewStaffCost + rpmPharmacistCost + rpmClinicalStaffCost + supportStaffCost
    const deviceCost = rpmStarts * setting.deviceCost
    const technologyCost = rpmMonths * setting.monthlyTechnology
    const currentReviewUnits = paid ? reviews * setting.currentReviewShare : 0
    const currentRpmUnits = paid ? rpmMonths * setting.currentRpmShare : 0
    const benchmarkMode = setting.rpmPaymentBasis !== 0
    const benchmarkContract = setting.rpmPaymentBasis === 2
    const currentReviewRevenue = currentReviewUnits * setting.currentReviewReceipt * setting.reviewReceiptRealization
    const rpmSetupUnits = paid && benchmarkMode && monthsPerEpisode > 0 ? rpmStarts * setting.currentRpmShare * setting.rpmSetupShare : 0
    const rpmDeviceUnits = benchmarkMode ? currentRpmUnits * setting.rpmDeviceShare : 0
    const rpmManagementUnits = benchmarkMode ? currentRpmUnits * setting.rpmManagementShare : 0
    const managementFee = setting.rpmManagementThreshold === 10 ? common.rpmShortManagementFee : common.rpmManagementFee
    const currentRpmAllowedCharges = rpmSetupUnits * common.rpmSetupFee + rpmDeviceUnits * common.rpmDeviceFee + rpmManagementUnits * managementFee
    const billingPracticeMedicareReceipts = currentRpmAllowedCharges * setting.currentPaidClaimShare * PROVIDER_MODEL.medicareShare
    const billingPracticePatientReceipts = currentRpmAllowedCharges * setting.currentPaidClaimShare * (1 - PROVIDER_MODEL.medicareShare) * setting.currentPatientCollection
    const rpmBillingPracticeReceipts = billingPracticeMedicareReceipts + billingPracticePatientReceipts
    const currentContractRpmRevenue = benchmarkContract ? rpmBillingPracticeReceipts * setting.rpmContractRetainedShare :
      benchmarkMode ? 0 : currentRpmUnits * setting.currentRpmReceipt
    const rpmPartnerRetainedRevenue = benchmarkContract ? rpmBillingPracticeReceipts - currentContractRpmRevenue : 0
    const currentRpmMedicareRevenue = benchmarkContract ? 0 : billingPracticeMedicareReceipts
    const currentRpmPatientRevenue = benchmarkContract ? 0 : billingPracticePatientReceipts
    const currentRpmRevenue = currentContractRpmRevenue + currentRpmMedicareRevenue + currentRpmPatientRevenue
    // Contract delivery incurs one local invoice unit per covered active month, not the partner's CPT claims.
    const currentBilledUnits = currentReviewUnits + (setting.rpmPaymentBasis === 1 ? rpmSetupUnits + rpmDeviceUnits + rpmManagementUnits : currentRpmUnits)
    const currentRevenue = currentReviewRevenue + currentRpmRevenue
    const actReviewUnits = actActive ? reviews * setting.actReviewShare : 0
    const actRpmUnits = actActive ? rpmMonths * setting.actRpmShare : 0
    const actBilledUnits = actReviewUnits + actRpmUnits
    const actAllowedCharges = actReviewUnits * reviewAllowed + actRpmUnits * rpmAllowed
    const actMedicareRevenue = actAllowedCharges * common.paidClaimShare * PROVIDER_MODEL.medicareShare
    const actPatientRevenue = actAllowedCharges * common.paidClaimShare * (1 - PROVIDER_MODEL.medicareShare) * common.patientCollection
    const actRevenue = actMedicareRevenue + actPatientRevenue
    const revenue = currentRevenue + actRevenue
    const claimCost = (currentBilledUnits + actBilledUnits) * setting.billingCost
    const dispensingLoss = discontinuedMedicationYears * setting.dispensingShare * setting.dispensingMargin
    const variableCost = staffCost + deviceCost + technologyCost + claimCost + dispensingLoss
    const fixedCost = setting.annualFixedCost + (year === 1 ? setting.startupCost : 0) +
      (actActive ? setting.actAnnualCost + (year === common.actStartYear ? setting.actStartupCost : 0) : 0)
    const totalCost = variableCost + fixedCost
    years.push({ year, reviews, rpmStarts, rpmMonths, newStops, discontinuedMedicationYears,
      reviewPharmacistHours, rpmOnboardingPharmacistHours, rpmManagementPharmacistHours, rpmClinicalStaffHours,
      reviewStaffCost, rpmPharmacistCost, rpmClinicalStaffCost, supportStaffCost,
      pharmacistHours, supportHours, staffCost, deviceCost, technologyCost, currentBilledUnits, actBilledUnits,
      currentReviewRevenue, currentContractRpmRevenue, rpmSetupUnits, rpmDeviceUnits, rpmManagementUnits,
      currentRpmAllowedCharges, rpmBillingPracticeReceipts, rpmPartnerRetainedRevenue, currentRpmMedicareRevenue, currentRpmPatientRevenue, currentRpmRevenue,
      actAllowedCharges, currentRevenue, actMedicareRevenue, actPatientRevenue, actRevenue, revenue,
      claimCost, dispensingLoss, variableCost, fixedCost, totalCost, margin: revenue - totalCost })
  }
  const cumulative = Object.fromEntries(Object.keys(years[0]).filter(k => k !== 'year').map(k => [k, years.reduce((sum, row) => sum + row[k], 0)]))
  return { years, cumulative }
}

export function calculateProviderComparison(inputs) {
  const errors = validateProviderInputs(inputs)
  if (Object.keys(errors).length) return { isComplete: false, errors, scenarios: [] }
  const scenarios = []
  for (const [settingId, settingName] of Object.entries(SETTINGS)) for (const [policyId, policyName] of Object.entries(POLICIES)) {
    const setting = inputs.settings[settingId]
    const projection = projectSetting(inputs.common, setting, policyId, inputs.common.annualEnrollment)
    const unit = projectSetting(inputs.common, setting, policyId, 1).cumulative
    const contribution = unit.revenue - unit.variableCost
    const breakEvenEnrollment = contribution > 0 ? Math.ceil(unit.fixedCost / contribution) :
      (contribution === 0 && unit.fixedCost === 0 ? 0 : null)
    if ([...projection.years, projection.cumulative, unit].some(row => Object.values(row).some(v => !Number.isFinite(v))) ||
        (breakEvenEnrollment !== null && !Number.isSafeInteger(breakEvenEnrollment))) {
      return { isComplete: false, errors: { calculation: 'Inputs exceed the numeric calculation range. Reduce extreme inputs.' }, scenarios: [] }
    }
    scenarios.push({ id: settingId + '-' + policyId, settingId, settingName, policyId, policyName,
      loadedPharmacistCost: providerLoadedWage(setting),
      ...projection, contributionPerAnnualParticipant: contribution, breakEvenEnrollment,
      breakEvenBasis: 'Constant new participants enrolled in each of three years; same mix and unit costs, before capacity constraints' })
  }
  return { isComplete: true, errors: {}, scenarios }
}

export const PROVIDER_OUTPUTS = {
  reviews: 'Completed initial reviews', rpmStarts: 'New RPM episodes', rpmMonths: 'Active RPM patient-months',
  newStops: 'Added medication discontinuations', discontinuedMedicationYears: 'Discontinued medication-years',
  pharmacistHours: 'Total pharmacist hours', supportHours: 'Technical-support hours (onboarding + recurring)',
  reviewPharmacistHours: 'Pharmacist review + coordination hours', rpmOnboardingPharmacistHours: 'Pharmacist RPM onboarding hours',
  rpmManagementPharmacistHours: 'Pharmacist recurring RPM management hours', rpmClinicalStaffHours: 'Other eligible RPM clinical-staff hours',
  reviewStaffCost: 'Pharmacist review + coordination cost', rpmPharmacistCost: 'Pharmacist RPM cost (onboarding + recurring)',
  rpmClinicalStaffCost: 'Other eligible RPM clinical-staff cost', supportStaffCost: 'Technical-support cost (onboarding + recurring)',
  currentRevenue: 'Current-arrangement receipts', actMedicareRevenue: 'Hypothetical Act Medicare receipts',
  currentReviewRevenue: 'Current review receipts', currentContractRpmRevenue: 'Retained contract RPM receipts',
  rpmSetupUnits: 'Qualifying 99453 setup units', rpmDeviceUnits: 'Qualifying 99454 device/data units', rpmManagementUnits: 'Qualifying management units (99457 OR 99470)',
  currentRpmAllowedCharges: 'Underlying RPM benchmark allowed charges',
  rpmBillingPracticeReceipts: 'Billing-practice RPM collections before contract allocation (reference subtotal)',
  rpmPartnerRetainedRevenue: 'RPM amount retained by collaborating practice (excluded from provider income)',
  currentRpmMedicareRevenue: 'Direct current RPM Medicare receipts',
  currentRpmPatientRevenue: 'Direct current RPM patient/supplemental receipts', currentRpmRevenue: 'Total current RPM receipts',
  actPatientRevenue: 'Hypothetical Act patient/supplemental receipts', actRevenue: 'Total hypothetical Act receipts', revenue: 'Total program receipts',
  staffCost: 'Staff costs', deviceCost: 'Device costs', technologyCost: 'Technology costs',
  currentBilledUnits: 'Current submitted code/contract units', actBilledUnits: 'Additional Act billed review/month units', actAllowedCharges: 'Hypothetical Act allowed charges',
  claimCost: 'Claim processing costs', dispensingLoss: 'Lost dispensing contribution (signed)', variableCost: 'Total variable costs including dispensing effect',
  fixedCost: 'Fixed overhead and startup', totalCost: 'Total program costs including dispensing effect', margin: 'Provider operating margin'
}
