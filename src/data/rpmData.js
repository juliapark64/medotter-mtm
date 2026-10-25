// Remote Patient Monitoring (RPM) Simulated Data
// Simulated data for demonstration. Not a medical device.

export const rpmEnrollments = [
  {
    patientId: 'p001',
    enrolledDate: '2026-07-12',
    consentDate: '2026-07-12',
    deviceSerial: 'OMR-HEM-9281-A',
    targetSystolic: 130,
    targetDiastolic: 80,
    status: 'active',
    attachedRecommendations: [],
    reviewLogs: [
      {
        id: 'rev-001-1',
        date: '2026-08-15',
        minutes: 25,
        note: 'Initial monthly review. Patient demonstrated proper cuff placement. Blood pressure trending downward after Lisinopril titration.',
        pharmacist: 'Dr. Alexandra Rivera, PharmD'
      },
      {
        id: 'rev-001-2',
        date: '2026-09-15',
        minutes: 20,
        note: 'Month 2 review. Marked improvement observed. Systolic nearing 130 target. Encouraged continued low-sodium dietary adherence.',
        pharmacist: 'Dr. Alexandra Rivera, PharmD'
      }
    ]
  },
  {
    patientId: 'p002',
    enrolledDate: '2026-07-12',
    consentDate: '2026-07-12',
    deviceSerial: 'OMR-HEM-7360-B',
    targetSystolic: 130,
    targetDiastolic: 80,
    status: 'active',
    attachedRecommendations: [],
    reviewLogs: [
      {
        id: 'rev-002-1',
        date: '2026-08-14',
        minutes: 20,
        note: 'Month 1 review. Systolic stubbornly above 145 mmHg. Inquired about medication adherence; patient reports occasional missed evening doses.',
        pharmacist: 'Dr. Alexandra Rivera, PharmD'
      },
      {
        id: 'rev-002-2',
        date: '2026-09-14',
        minutes: 20,
        note: 'Month 2 review. Blood pressure remains persistently above 130/80 goal. Recommended physician evaluate adding second-line agent or adjusting Amlodipine.',
        pharmacist: 'Dr. Alexandra Rivera, PharmD'
      }
    ]
  },
  {
    patientId: 'p004',
    enrolledDate: '2026-07-12',
    consentDate: '2026-07-12',
    deviceSerial: 'WITH-BPM-4019-X',
    targetSystolic: 130,
    targetDiastolic: 80,
    status: 'active',
    attachedRecommendations: [],
    reviewLogs: [
      {
        id: 'rev-004-1',
        date: '2026-08-12',
        minutes: 20,
        note: 'Month 1 review. Patient is highly adherent and readings are consistently at goal (120-124 / 74-78).',
        pharmacist: 'Dr. Alexandra Rivera, PharmD'
      },
      {
        id: 'rev-004-2',
        date: '2026-09-12',
        minutes: 20,
        note: 'Month 2 review. Excellent stability maintained throughout summer. Zero excursions above target.',
        pharmacist: 'Dr. Alexandra Rivera, PharmD'
      }
    ]
  },
  {
    patientId: 'p003',
    enrolledDate: '2026-07-12',
    consentDate: '2026-07-12',
    deviceSerial: 'WELCH-ALN-5200-D',
    targetSystolic: 130,
    targetDiastolic: 80,
    status: 'active',
    attachedRecommendations: [],
    reviewLogs: [
      {
        id: 'rev-003-1',
        date: '2026-08-16',
        minutes: 20,
        note: 'Called daughter/caregiver regarding multiple missed days. Caregiver will set daily morning reminder.',
        pharmacist: 'Dr. Alexandra Rivera, PharmD'
      }
    ]
  },
  {
    patientId: 'p005',
    enrolledDate: '2026-07-12',
    consentDate: '2026-07-12',
    deviceSerial: 'OMR-HEM-5401-E',
    targetSystolic: 130,
    targetDiastolic: 80,
    status: 'active',
    attachedRecommendations: [],
    reviewLogs: [
      {
        id: 'rev-005-1',
        date: '2026-08-10',
        minutes: 20,
        note: 'Routine monthly review. Baseline readings stable with minor fluctuations.',
        pharmacist: 'Dr. Alexandra Rivera, PharmD'
      }
    ]
  },
  {
    patientId: 'p006',
    enrolledDate: '2026-07-12',
    consentDate: '2026-07-12',
    deviceSerial: 'WITH-BPM-8820-F',
    targetSystolic: 130,
    targetDiastolic: 80,
    status: 'active',
    attachedRecommendations: [],
    reviewLogs: [
      {
        id: 'rev-006-1',
        date: '2026-08-11',
        minutes: 20,
        note: 'Monthly review. Hemodialysis schedule coordinated with BP measurement times.',
        pharmacist: 'Dr. Alexandra Rivera, PharmD'
      }
    ]
  }
]

// Seeded pseudorandom generator for deterministic, realistic readings
function pseudoRandom(seed) {
  let x = Math.sin(seed++) * 10000
  return x - Math.floor(x)
}

function generate90DaysReadings() {
  const readings = []
  const baseDate = new Date('2026-10-10T08:30:00Z')
  let seed = 42

  // 1. p001: Steadily improving to goal
  // Starts around 158/96 on Day 1, reaches ~124/76 by Day 90
  for (let i = 89; i >= 0; i--) {
    const d = new Date(baseDate)
    d.setDate(d.getDate() - i)
    // Morning time around 07:30 to 09:15
    const minute = Math.floor(pseudoRandom(seed++) * 50) + 10
    d.setMinutes(minute)
    
    // Progress from 0 (start) to 1 (current)
    const progress = (89 - i) / 89
    // Trend from 158 down to 123
    const trendSys = 158 - (35 * progress)
    const noiseSys = (pseudoRandom(seed++) - 0.5) * 6
    const systolic = Math.round(trendSys + noiseSys)

    // Trend from 96 down to 76
    const trendDia = 96 - (20 * progress)
    const noiseDia = (pseudoRandom(seed++) - 0.5) * 5
    const diastolic = Math.round(trendDia + noiseDia)

    const pulse = Math.round(72 + (pseudoRandom(seed++) - 0.5) * 8)
    const source = i === 4 || i === 18 || i === 42 ? 'manual' : 'device'

    readings.push({
      patientId: 'p001',
      timestamp: d.toISOString(),
      systolic,
      diastolic,
      pulse,
      source
    })
  }

  // 2. p002: Persistently above goal
  // Fluctuates around 146-160 systolic, 90-98 diastolic throughout
  for (let i = 89; i >= 0; i--) {
    const d = new Date(baseDate)
    d.setDate(d.getDate() - i)
    const minute = Math.floor(pseudoRandom(seed++) * 50) + 5
    d.setMinutes(minute)

    const systolic = Math.round(148 + pseudoRandom(seed++) * 14) // 148-162
    const diastolic = Math.round(91 + pseudoRandom(seed++) * 8)   // 91-99
    const pulse = Math.round(78 + (pseudoRandom(seed++) - 0.5) * 10)
    const source = i === 12 || i === 50 ? 'manual' : 'device'

    readings.push({
      patientId: 'p002',
      timestamp: d.toISOString(),
      systolic,
      diastolic,
      pulse,
      source
    })
  }

  // 3. p004: At goal throughout
  // Fluctuates nicely around 118-126 systolic, 72-78 diastolic
  for (let i = 89; i >= 0; i--) {
    const d = new Date(baseDate)
    d.setDate(d.getDate() - i)
    const minute = Math.floor(pseudoRandom(seed++) * 45) + 15
    d.setMinutes(minute)

    const systolic = Math.round(118 + pseudoRandom(seed++) * 9) // 118-127
    const diastolic = Math.round(72 + pseudoRandom(seed++) * 7)  // 72-79
    const pulse = Math.round(68 + (pseudoRandom(seed++) - 0.5) * 6)
    const source = i === 7 ? 'manual' : 'device'

    readings.push({
      patientId: 'p004',
      timestamp: d.toISOString(),
      systolic,
      diastolic,
      pulse,
      source
    })
  }

  // 4. p003: Frequent missed days
  // Only records every 4 to 7 days, and NO reading in the last 4 days (last reading on day -5)
  // Triggers "Missing data: no reading in 3 days"
  const p003Days = [88, 83, 78, 71, 66, 60, 54, 47, 42, 36, 30, 24, 18, 12, 5] // 5 days ago is the most recent
  for (const dayOffset of p003Days) {
    const d = new Date(baseDate)
    d.setDate(d.getDate() - dayOffset)
    const minute = Math.floor(pseudoRandom(seed++) * 40) + 10
    d.setMinutes(minute)

    const systolic = Math.round(134 + (pseudoRandom(seed++) - 0.5) * 12)
    const diastolic = Math.round(82 + (pseudoRandom(seed++) - 0.5) * 8)
    const pulse = Math.round(75 + (pseudoRandom(seed++) - 0.5) * 8)
    const source = dayOffset === 18 ? 'manual' : 'device'

    readings.push({
      patientId: 'p003',
      timestamp: d.toISOString(),
      systolic,
      diastolic,
      pulse,
      source
    })
  }

  // 5. p005: Single reading of 182/104
  // Baseline ~132/84, but on day 2 ago (2026-10-08) has an exact reading of 182/104
  for (let i = 89; i >= 0; i--) {
    const d = new Date(baseDate)
    d.setDate(d.getDate() - i)
    const minute = Math.floor(pseudoRandom(seed++) * 50) + 5
    d.setMinutes(minute)

    let systolic, diastolic, pulse
    if (i === 2) {
      // The single acute spike reading required by prompt
      systolic = 182
      diastolic = 104
      pulse = 94
    } else {
      systolic = Math.round(130 + pseudoRandom(seed++) * 8)
      diastolic = Math.round(80 + pseudoRandom(seed++) * 6)
      pulse = Math.round(74 + (pseudoRandom(seed++) - 0.5) * 8)
    }

    const source = i === 15 ? 'manual' : 'device'

    readings.push({
      patientId: 'p005',
      timestamp: d.toISOString(),
      systolic,
      diastolic,
      pulse,
      source
    })
  }

  // 6. p006: Reading of 88/56
  // Baseline ~124/78, but on day 1 ago (2026-10-09) has an exact reading of 88/56
  for (let i = 89; i >= 0; i--) {
    const d = new Date(baseDate)
    d.setDate(d.getDate() - i)
    const minute = Math.floor(pseudoRandom(seed++) * 50) + 10
    d.setMinutes(minute)

    let systolic, diastolic, pulse
    if (i === 1) {
      // The acute hypotension reading required by prompt
      systolic = 88
      diastolic = 56
      pulse = 62
    } else {
      systolic = Math.round(122 + pseudoRandom(seed++) * 8)
      diastolic = Math.round(76 + pseudoRandom(seed++) * 6)
      pulse = Math.round(70 + (pseudoRandom(seed++) - 0.5) * 8)
    }

    const source = i === 22 ? 'manual' : 'device'

    readings.push({
      patientId: 'p006',
      timestamp: d.toISOString(),
      systolic,
      diastolic,
      pulse,
      source
    })
  }

  // Sort chronologically ascending
  return readings.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
}

export const bpReadings = generate90DaysReadings()
