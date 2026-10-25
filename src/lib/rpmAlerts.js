import { DEFAULT_RPM_THRESHOLDS } from '../data/rpmThresholds.js'

// Helper to get reference date for the simulated environment
export function getSimulatedToday() {
  return new Date('2026-10-10T23:59:59Z')
}

// Calculate averages for a given number of days back
export function calculateAverages(readings, days = 7, refDate = getSimulatedToday()) {
  if (!readings || readings.length === 0) return null

  const cutoff = new Date(refDate)
  cutoff.setDate(cutoff.getDate() - days)

  const windowReadings = readings.filter(r => new Date(r.timestamp) >= cutoff && new Date(r.timestamp) <= refDate)
  if (windowReadings.length === 0) return null

  const totalSys = windowReadings.reduce((sum, r) => sum + r.systolic, 0)
  const totalDia = windowReadings.reduce((sum, r) => sum + r.diastolic, 0)
  const totalPulse = windowReadings.reduce((sum, r) => sum + r.pulse, 0)

  return {
    systolic: Math.round(totalSys / windowReadings.length),
    diastolic: Math.round(totalDia / windowReadings.length),
    pulse: Math.round(totalPulse / windowReadings.length),
    count: windowReadings.length
  }
}

// Percentage of readings at or below target
export function calculateGoalPercentage(readings, targetSystolic = 130, targetDiastolic = 80) {
  if (!readings || readings.length === 0) return 0
  const atGoal = readings.filter(r => r.systolic <= targetSystolic && r.diastolic <= targetDiastolic)
  return Math.round((atGoal.length / readings.length) * 100)
}

// Number of days with at least one reading in current month (October 2026)
export function calculateDaysWithReadingsThisMonth(readings, year = 2026, month = 9) { // 9 = October (0-indexed)
  if (!readings || readings.length === 0) return 0
  const days = new Set()
  readings.forEach(r => {
    const d = new Date(r.timestamp)
    if (d.getUTCFullYear() === year && d.getUTCMonth() === month) {
      days.add(d.getUTCDate())
    }
  })
  return days.size
}

// Evaluate alerts for a single enrolled patient
export function evaluatePatientAlerts(patient, enrollment, patientReadings, thresholds = DEFAULT_RPM_THRESHOLDS, acknowledgedMap = {}) {
  const alerts = []
  if (!enrollment || enrollment.status !== 'active') return alerts

  const sortedReadings = [...(patientReadings || [])].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  const latestReading = sortedReadings[0]
  const refDate = getSimulatedToday()

  // 1. Urgent High: systolic >= 180 or diastolic >= 120
  // Check latest or any acute reading in last 7 days
  const urgentHighReadings = sortedReadings.filter(r => {
    const d = new Date(r.timestamp)
    const diffDays = (refDate - d) / (1000 * 60 * 60 * 24)
    return diffDays <= 7 && (r.systolic >= thresholds.urgentHighSystolic || r.diastolic >= thresholds.urgentHighDiastolic)
  })

  if (urgentHighReadings.length > 0) {
    const r = urgentHighReadings[0]
    const alertId = `alert-${patient.id}-urgent-high-${r.timestamp}`
    const ack = acknowledgedMap[alertId]
    alerts.push({
      id: alertId,
      patientId: patient.id,
      patientName: patient.name,
      patientMrn: patient.mrn,
      patientAge: patient.age,
      severity: 'urgent',
      type: 'urgent-high',
      title: 'Urgent High Blood Pressure',
      badge: 'Urgent High',
      badgeColor: 'bg-red-600 text-white',
      reading: `${r.systolic}/${r.diastolic} mmHg (Pulse: ${r.pulse} bpm)`,
      systolic: r.systolic,
      diastolic: r.diastolic,
      pulse: r.pulse,
      timestamp: r.timestamp,
      description: `Reading of ${r.systolic}/${r.diastolic} mmHg exceeds the urgent threshold (≥${thresholds.urgentHighSystolic}/${thresholds.urgentHighDiastolic} mmHg). Immediate clinical evaluation recommended.`,
      thresholdLabel: `Urgent High: Systolic ≥${thresholds.urgentHighSystolic} or Diastolic ≥${thresholds.urgentHighDiastolic}`,
      acknowledged: Boolean(ack),
      acknowledgedBy: ack ? ack.acknowledgedBy : null,
      acknowledgedAt: ack ? ack.acknowledgedAt : null
    })
  }

  // 2. Urgent Low: systolic < 90
  const urgentLowReadings = sortedReadings.filter(r => {
    const d = new Date(r.timestamp)
    const diffDays = (refDate - d) / (1000 * 60 * 60 * 24)
    return diffDays <= 7 && r.systolic < thresholds.urgentLowSystolic
  })

  if (urgentLowReadings.length > 0) {
    const r = urgentLowReadings[0]
    const alertId = `alert-${patient.id}-urgent-low-${r.timestamp}`
    const ack = acknowledgedMap[alertId]
    alerts.push({
      id: alertId,
      patientId: patient.id,
      patientName: patient.name,
      patientMrn: patient.mrn,
      patientAge: patient.age,
      severity: 'urgent',
      type: 'urgent-low',
      title: 'Urgent Low Blood Pressure (Hypotension)',
      badge: 'Urgent Low',
      badgeColor: 'bg-rose-600 text-white',
      reading: `${r.systolic}/${r.diastolic} mmHg (Pulse: ${r.pulse} bpm)`,
      systolic: r.systolic,
      diastolic: r.diastolic,
      pulse: r.pulse,
      timestamp: r.timestamp,
      description: `Reading of ${r.systolic}/${r.diastolic} mmHg is below the urgent low threshold (<${thresholds.urgentLowSystolic} mmHg). Assess patient for dizziness, lightheadedness, or medication over-titration.`,
      thresholdLabel: `Urgent Low: Systolic <${thresholds.urgentLowSystolic} mmHg`,
      acknowledged: Boolean(ack),
      acknowledgedBy: ack ? ack.acknowledgedBy : null,
      acknowledgedAt: ack ? ack.acknowledgedAt : null
    })
  }

  // 3. Above Goal: 7-day average above the patient's target
  const avg7 = calculateAverages(sortedReadings, 7, refDate)
  if (avg7 && (avg7.systolic > enrollment.targetSystolic || avg7.diastolic > enrollment.targetDiastolic)) {
    const alertId = `alert-${patient.id}-above-goal-7day`
    const ack = acknowledgedMap[alertId]
    alerts.push({
      id: alertId,
      patientId: patient.id,
      patientName: patient.name,
      patientMrn: patient.mrn,
      patientAge: patient.age,
      severity: 'warning',
      type: 'above-goal',
      title: '7-Day Average Above Goal',
      badge: 'Above Goal',
      badgeColor: 'bg-amber-500 text-white',
      reading: `7-Day Avg: ${avg7.systolic}/${avg7.diastolic} mmHg (${avg7.count} readings)`,
      systolic: avg7.systolic,
      diastolic: avg7.diastolic,
      pulse: avg7.pulse,
      timestamp: latestReading ? latestReading.timestamp : refDate.toISOString(),
      description: `Patient's 7-day average (${avg7.systolic}/${avg7.diastolic} mmHg) remains above personalized target (${enrollment.targetSystolic}/${enrollment.targetDiastolic} mmHg). Consider adherence counseling or therapy optimization.`,
      thresholdLabel: `Target: ≤${enrollment.targetSystolic}/${enrollment.targetDiastolic} mmHg`,
      acknowledged: Boolean(ack),
      acknowledgedBy: ack ? ack.acknowledgedBy : null,
      acknowledgedAt: ack ? ack.acknowledgedAt : null
    })
  }

  // 4. Missing Data: no reading in 3 days
  if (!latestReading) {
    const alertId = `alert-${patient.id}-missing-data-none`
    const ack = acknowledgedMap[alertId]
    alerts.push({
      id: alertId,
      patientId: patient.id,
      patientName: patient.name,
      patientMrn: patient.mrn,
      patientAge: patient.age,
      severity: 'warning',
      type: 'missing-data',
      title: 'Missing RPM Data',
      badge: 'Missing Data',
      badgeColor: 'bg-orange-500 text-white',
      reading: 'No readings recorded',
      timestamp: refDate.toISOString(),
      description: `No blood pressure readings have been transmitted since enrollment. Please check device pairing.`,
      thresholdLabel: `Missing Data: No reading in ≥${thresholds.missingDataDays} days`,
      acknowledged: Boolean(ack),
      acknowledgedBy: ack ? ack.acknowledgedBy : null,
      acknowledgedAt: ack ? ack.acknowledgedAt : null
    })
  } else {
    const lastDate = new Date(latestReading.timestamp)
    const diffDays = Math.floor((refDate - lastDate) / (1000 * 60 * 60 * 24))
    if (diffDays >= thresholds.missingDataDays) {
      const alertId = `alert-${patient.id}-missing-data-${diffDays}d`
      const ack = acknowledgedMap[alertId]
      alerts.push({
        id: alertId,
        patientId: patient.id,
        patientName: patient.name,
        patientMrn: patient.mrn,
        patientAge: patient.age,
        severity: 'warning',
        type: 'missing-data',
        title: 'Missing RPM Transmissions',
        badge: 'Missing Data',
        badgeColor: 'bg-orange-500 text-white',
        reading: `Last reading: ${diffDays} days ago (${new Date(latestReading.timestamp).toLocaleDateString()})`,
        timestamp: latestReading.timestamp,
        description: `Patient has not transmitted a reading in ${diffDays} days (threshold: ≥${thresholds.missingDataDays} days). Patient outreach recommended to encourage regular monitoring.`,
        thresholdLabel: `Missing Data: No reading in ≥${thresholds.missingDataDays} days`,
        acknowledged: Boolean(ack),
        acknowledgedBy: ack ? ack.acknowledgedBy : null,
        acknowledgedAt: ack ? ack.acknowledgedAt : null
      })
    }
  }

  return alerts
}

// Generate all active alerts across the cohort, sorted urgent first
export function generateAllAlerts(enrollments, readings, patients, thresholds = DEFAULT_RPM_THRESHOLDS, acknowledgedMap = {}) {
  const allAlerts = []

  enrollments.forEach(enrollment => {
    const patient = patients.find(p => p.id === enrollment.patientId)
    if (!patient) return

    const patientReadings = readings.filter(r => r.patientId === enrollment.patientId)
    const patientAlerts = evaluatePatientAlerts(patient, enrollment, patientReadings, thresholds, acknowledgedMap)
    allAlerts.push(...patientAlerts)
  })

  // Sort urgent first, then by timestamp descending
  return allAlerts.sort((a, b) => {
    if (a.severity === 'urgent' && b.severity !== 'urgent') return -1
    if (b.severity === 'urgent' && a.severity !== 'urgent') return 1
    return new Date(b.timestamp) - new Date(a.timestamp)
  })
}
