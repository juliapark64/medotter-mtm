// Configurable RPM thresholds
// Demonstration thresholds; follow your organization's protocol.

export const DEFAULT_RPM_THRESHOLDS = {
  urgentHighSystolic: 180,
  urgentHighDiastolic: 120,
  urgentLowSystolic: 90,
  missingDataDays: 3,
  disclaimer: "Demonstration thresholds; follow your organization's protocol."
}

export function getRpmThresholds() {
  try {
    const saved = localStorage.getItem('rpm_thresholds')
    if (saved) return JSON.parse(saved)
  } catch (e) {
    // Ignore localStorage errors
  }
  return DEFAULT_RPM_THRESHOLDS
}

export function saveRpmThresholds(thresholds) {
  try {
    localStorage.setItem('rpm_thresholds', JSON.stringify(thresholds))
  } catch (e) {
    // Ignore localStorage errors
  }
}
