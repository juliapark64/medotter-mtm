import { CALCULATOR_DEFAULTS } from '../data/calculatorDefaults.js'

export const MODES = { DEPRESCRIBING: 'Deprescribing only', RPM: 'RPM only', COMBINED: 'Combined' }
const usesDeprescribing = mode => mode !== MODES.RPM
const usesRpm = mode => mode !== MODES.DEPRESCRIBING
const blank = value => value === null || value === undefined || (typeof value === 'string' && value.trim() === '')

export function getRequiredInputsForMode(mode = MODES.COMBINED, horizon = 1) {
  return Object.entries(CALCULATOR_DEFAULTS).filter(([, d]) =>
    (!d.multiYear || horizon === 3) &&
    (d.appliesTo === 'all' || (d.appliesTo === 'deprescribing' && usesDeprescribing(mode)) ||
      (d.appliesTo === 'rpm' && usesRpm(mode)))
  ).map(([key]) => key)
}
export const getRequiredInputsForMultiYear = mode => getRequiredInputsForMode(mode, 3)

export function validateInputs(inputs, mode = MODES.COMBINED, horizon = 3) {
  const errors = {}
  if (!Object.values(MODES).includes(mode)) errors.mode = 'Choose a supported service combination.'
  if (![1, 3].includes(horizon)) errors.horizon = 'Choose a one- or three-year horizon.'
  for (const key of getRequiredInputsForMode(mode, horizon)) {
    const d = CALCULATOR_DEFAULTS[key]
    const raw = inputs?.[key]
    if (blank(raw)) { errors[key] = 'Enter a value.'; continue }
    if (!['number', 'string'].includes(typeof raw) || !Number.isFinite(Number(raw))) {
      errors[key] = 'Enter a finite number.'; continue
    }
    const n = Number(raw)
    if (n < d.min || (d.max !== undefined && n > d.max)) {
      errors[key] = d.percent ? 'Enter a percentage from 0 to 100.' :
        'Enter a value from ' + d.min + (d.max === undefined ? ' upward.' : ' to ' + d.max + '.')
    } else if (d.integer && !Number.isInteger(n)) errors[key] = 'Enter a whole number.'
  }
  return errors
}
export const checkInputsComplete = (inputs, mode = MODES.COMBINED) => Object.keys(validateInputs(inputs, mode, 1)).length === 0
export const checkMultiYearComplete = (inputs, mode = MODES.COMBINED) => Object.keys(validateInputs(inputs, mode, 3)).length === 0
export const normalizeInputs = inputs => Object.fromEntries(Object.keys(CALCULATOR_DEFAULTS).map(key => {
  const raw = inputs?.[key]
  return [key, blank(raw) || !['number', 'string'].includes(typeof raw) || !Number.isFinite(Number(raw)) ? null : Number(raw)]
}))

// Integral of expected retention between two episode ages (months).
// Annual dropout is converted to a constant continuous hazard; turnover is
// applied separately at calendar-year boundaries. This avoids monthly rounding.
export function retainedMonths(ageFrom, ageTo, annualDropout) {
  if (ageTo <= ageFrom || annualDropout === 1) return 0
  if (annualDropout === 0) return ageTo - ageFrom
  const rate = Math.log1p(-annualDropout) / 12
  return Math.exp(rate * ageFrom) * Math.expm1(rate * (ageTo - ageFrom)) / rate
}

export const OUTPUT_LABELS = {
  reviews: 'Completed additional reviews',
  newStops: 'New medication discontinuations',
  survivingStops: 'Prior discontinuations entering year',
  stoppedMedicationYears: 'Discontinued medication-years',
  newRpmPatients: 'New RPM starts',
  rpmEligibleRemaining: 'RPM-eligible members available before new starts',
  rpmPatientMonths: 'Active RPM patient-months',
  reviewHours: 'Pharmacist review hours',
  rpmPharmacistHours: 'Pharmacist RPM hours including onboarding',
  pharmacistHours: 'Total pharmacist hours',
  supportHours: 'Support-staff hours including onboarding',
  totalStaffHours: 'Total staff hours',
  pharmacistLaborCost: 'Pharmacist labor cost',
  supportLaborCost: 'Support-staff labor cost',
  deviceCost: 'Device acquisition cost',
  connectivityCost: 'RPM connectivity and software cost',
  platformCost: 'Annual platform cost',
  setupCost: 'One-time implementation cost',
  programCost: 'Total program cost',
  grossAvoidedDrug: 'Discontinued drug cost avoided',
  replacementDrugCost: 'Replacement drug cost',
  avoidedDrug: 'Net medication cost offset',
  avoidedEvents: 'Modeled CV events avoided',
  avoidedCV: 'Modeled CV cost offset',
  totalOffsets: 'Total modeled offsets',
  netImpact: 'Net budget impact',
  netPMPM: 'Net cost per member per month'
}
export const SUM_OUTPUT_KEYS = Object.keys(OUTPUT_LABELS).filter(k => !['survivingStops', 'rpmEligibleRemaining', 'netPMPM'].includes(k))

// Both horizons use this single engine: no separate year-one formula.
export function calculateProjection(rawInputs, mode = MODES.COMBINED, horizon = 3) {
  const errors = validateInputs(rawInputs, mode, horizon)
  if (Object.keys(errors).length) return { isComplete: false, errors, message: 'Correct the highlighted inputs.', years: [], cumulative: null }
  const p = normalizeInputs(rawInputs)
  const dep = usesDeprescribing(mode)
  const rpm = usesRpm(mode)
  const turnover = horizon === 3 ? p.memberTurnover : 0
  const restart = horizon === 3 && dep ? p.restartRate : 0
  const decline = horizon === 3 && dep ? p.opportunityDecline : 0
  const eligible = dep ? p.lives * p.eligibleShare : 0
  const rpmEligible = rpm ? p.lives * p.rpmEligibleShare : 0
  const riskReduction = rpm ? 1 - Math.pow(1 - p.rrPer5, p.sbpReduction / 5) : 0
  const cohorts = []
  const years = []
  let survivingStops = 0
  let previouslyEnrolledRetained = 0

  for (let y = 0; y < horizon; y++) {
    if (y > 0) {
      survivingStops *= (1 - restart) * (1 - turnover)
      previouslyEnrolledRetained *= (1 - turnover)
    }
    const reviews = dep && p.timingFactor > 0 ? eligible * p.completionRate : 0
    const newStops = dep ? reviews * p.pimsPerPatient * p.incrementalDetection *
      p.implementationRate * Math.pow(1 - decline, y) : 0
    const stoppedMedicationYears = newStops * p.timingFactor + survivingStops
    const grossAvoidedDrug = dep ? stoppedMedicationYears * p.costPerStopped : 0
    const replacementDrugCost = dep ? stoppedMedicationYears * p.substitution * p.substituteDrugCost : 0
    const avoidedDrug = grossAvoidedDrug - replacementDrugCost
    const reviewHours = dep ? reviews * p.minutesPerReview / 60 : 0

    const rpmEligibleRemaining = Math.max(0, rpmEligible - previouslyEnrolledRetained)
    const newRpmPatients = rpm && p.timingFactor > 0 ? rpmEligibleRemaining * p.rpmEnrollment : 0
    if (newRpmPatients > 0) cohorts.push({
      year: y, startMonth: y * 12 + (1 - p.timingFactor) * 12, members: newRpmPatients
    })
    previouslyEnrolledRetained += newRpmPatients

    let rpmPatientMonths = 0
    if (rpm) for (const c of cohorts) {
      const from = Math.max(0, y * 12 - c.startMonth)
      const to = Math.min(p.rpmDurationMonths, (y + 1) * 12 - c.startMonth)
      rpmPatientMonths += c.members * Math.pow(1 - turnover, y - c.year) *
        retainedMonths(from, to, p.rpmDropoutRate)
    }
    const rpmPharmacistHours = rpm ? (rpmPatientMonths * p.rpmMinutesPerMonth +
      newRpmPatients * p.onboardingPharmacistMinutes) / 60 : 0
    const supportHours = rpm ? (rpmPatientMonths * p.supportMinutesPerMonth +
      newRpmPatients * p.onboardingSupportMinutes) / 60 : 0
    const pharmacistHours = reviewHours + rpmPharmacistHours
    const pharmacistLaborCost = pharmacistHours * p.hourlyWage
    const supportLaborCost = rpm ? supportHours * p.supportHourlyWage : 0
    const deviceCost = rpm ? newRpmPatients * p.deviceCost : 0
    const connectivityCost = rpm ? rpmPatientMonths * p.monthlyFee : 0
    const setupCost = y === 0 ? p.setupCost : 0
    const programCost = pharmacistLaborCost + supportLaborCost + deviceCost + connectivityCost + p.platformCost + setupCost
    const avoidedEvents = rpm ? rpmPatientMonths / 12 * p.eventRate * riskReduction : 0
    const avoidedCV = rpm ? avoidedEvents * p.costPerEvent : 0
    const totalOffsets = avoidedDrug + avoidedCV
    const netImpact = programCost - totalOffsets
    const row = {
      year: y + 1, reviews, newStops, survivingStops, stoppedMedicationYears,
      newRpmPatients, rpmEligibleRemaining, rpmPatientMonths, reviewHours,
      rpmPharmacistHours, pharmacistHours, supportHours, totalStaffHours: pharmacistHours + supportHours,
      pharmacistLaborCost, supportLaborCost, deviceCost, connectivityCost,
      platformCost: p.platformCost, setupCost, programCost, grossAvoidedDrug,
      replacementDrugCost, avoidedDrug, avoidedEvents, avoidedCV, totalOffsets,
      netImpact, netPMPM: netImpact / (p.lives * 12)
    }
    if (!Object.values(row).every(Number.isFinite)) {
      return { isComplete: false, errors: { calculation: 'Inputs exceed the numeric calculation range.' }, message: 'Reduce extreme inputs.', years: [], cumulative: null }
    }
    years.push(row)
    survivingStops += newStops
  }
  const cumulative = Object.fromEntries(SUM_OUTPUT_KEYS.map(key => [key, years.reduce((sum, y) => sum + y[key], 0)]))
  cumulative.netPMPM = cumulative.netImpact / (p.lives * horizon * 12)
  if (!Object.values(cumulative).every(Number.isFinite)) {
    return { isComplete: false, errors: { calculation: 'Totals exceed the numeric calculation range.' }, message: 'Reduce extreme inputs.', years: [], cumulative: null }
  }
  return { isComplete: true, errors: {}, mode, horizon, priceYear: p.priceYear, eligible, rpmEligible, riskReduction, years, cumulative }
}
export const calculateValue = (inputs, mode = MODES.COMBINED) => {
  const result = calculateProjection(inputs, mode, 1)
  return result.isComplete ? { ...result, ...result.years[0] } : result
}
export const calculateMultiYear = (inputs, mode = MODES.COMBINED) => calculateProjection(inputs, mode, 3)
export const calculateMultiYearValue = calculateMultiYear
