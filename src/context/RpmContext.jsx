import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { rpmEnrollments as initialEnrollments, bpReadings as initialReadings } from '../data/rpmData'
import { DEFAULT_RPM_THRESHOLDS, getRpmThresholds, saveRpmThresholds } from '../data/rpmThresholds'
import { generateAllAlerts } from '../lib/rpmAlerts'
import patients from '../data/patients.json'
import initialPrescriberLog from '../data/prescriberLog.json'

const RpmContext = createContext(null)

export function RpmProvider({ children }) {
  // Enrollments
  const [enrollments, setEnrollments] = useState(() => {
    try {
      const saved = localStorage.getItem('rpm_enrollments')
      if (saved) return JSON.parse(saved)
    } catch (e) {}
    return initialEnrollments
  })

  // Readings
  const [readings, setReadings] = useState(() => {
    try {
      const saved = localStorage.getItem('rpm_readings')
      if (saved) return JSON.parse(saved)
    } catch (e) {}
    return initialReadings
  })

  // Thresholds
  const [thresholds, setThresholds] = useState(() => getRpmThresholds())

  // Acknowledged Alerts map: { [alertId]: { acknowledgedBy, acknowledgedAt } }
  const [acknowledgedMap, setAcknowledgedMap] = useState(() => {
    try {
      const saved = localStorage.getItem('rpm_acknowledged_alerts')
      if (saved) return JSON.parse(saved)
    } catch (e) {}
    return {}
  })

  // Prescriber log (synced with recommendations)
  const [prescriberLog, setPrescriberLog] = useState(() => {
    try {
      const saved = localStorage.getItem('rpm_prescriber_log')
      if (saved) return JSON.parse(saved)
    } catch (e) {}
    return initialPrescriberLog
  })

  // Persistence effects
  useEffect(() => {
    try {
      localStorage.setItem('rpm_enrollments', JSON.stringify(enrollments))
    } catch (e) {}
  }, [enrollments])

  useEffect(() => {
    try {
      localStorage.setItem('rpm_readings', JSON.stringify(readings))
    } catch (e) {}
  }, [readings])

  useEffect(() => {
    try {
      saveRpmThresholds(thresholds)
    } catch (e) {}
  }, [thresholds])

  useEffect(() => {
    try {
      localStorage.setItem('rpm_acknowledged_alerts', JSON.stringify(acknowledgedMap))
    } catch (e) {}
  }, [acknowledgedMap])

  useEffect(() => {
    try {
      localStorage.setItem('rpm_prescriber_log', JSON.stringify(prescriberLog))
    } catch (e) {}
  }, [prescriberLog])

  // Derive all active alerts
  const allAlerts = useMemo(() => {
    return generateAllAlerts(enrollments, readings, patients, thresholds, acknowledgedMap)
  }, [enrollments, readings, thresholds, acknowledgedMap])

  // Enroll a patient
  const enrollPatient = ({
    patientId,
    consentDate = new Date().toISOString().slice(0, 10),
    deviceSerial = `OMR-HEM-${Math.floor(1000 + Math.random() * 9000)}-BT`,
    targetSystolic = 130,
    targetDiastolic = 80,
    attachedRecommendation = null
  }) => {
    setEnrollments(prev => {
      const existingIdx = prev.findIndex(e => e.patientId === patientId)
      const newEntry = {
        patientId,
        enrolledDate: new Date().toISOString().slice(0, 10),
        consentDate,
        deviceSerial,
        targetSystolic: Number(targetSystolic) || 130,
        targetDiastolic: Number(targetDiastolic) || 80,
        status: 'active',
        attachedRecommendations: attachedRecommendation ? [attachedRecommendation] : [],
        reviewLogs: []
      }
      if (existingIdx >= 0) {
        const updated = [...prev]
        updated[existingIdx] = {
          ...updated[existingIdx],
          status: 'active',
          deviceSerial: deviceSerial || updated[existingIdx].deviceSerial,
          targetSystolic: Number(targetSystolic) || updated[existingIdx].targetSystolic,
          targetDiastolic: Number(targetDiastolic) || updated[existingIdx].targetDiastolic,
          attachedRecommendations: attachedRecommendation
            ? [...(updated[existingIdx].attachedRecommendations || []), attachedRecommendation]
            : updated[existingIdx].attachedRecommendations
        }
        return updated
      }
      return [...prev, newEntry]
    })
  }

  // Update enrollment status
  const updateEnrollmentStatus = (patientId, newStatus) => {
    setEnrollments(prev =>
      prev.map(e => (e.patientId === patientId ? { ...e, status: newStatus } : e))
    )
  }

  // Add reading (device or manual)
  const addReading = ({
    patientId,
    systolic,
    diastolic,
    pulse = 72,
    source = 'manual',
    timestamp = new Date().toISOString()
  }) => {
    const newReading = {
      patientId,
      timestamp,
      systolic: Number(systolic),
      diastolic: Number(diastolic),
      pulse: Number(pulse) || 72,
      source
    }
    setReadings(prev => {
      const updated = [...prev, newReading]
      return updated.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    })
    return newReading
  }

  // Log pharmacist review time + note, optionally send prescriber recommendation
  const logPharmacistReview = (patientId, { minutes, note, pharmacist = 'Dr. Alexandra Rivera, PharmD', recommendation = null, prescriber = null }) => {
    const reviewId = `rev-${patientId}-${Date.now()}`
    const reviewDate = new Date().toISOString().slice(0, 10)

    setEnrollments(prev =>
      prev.map(e => {
        if (e.patientId !== patientId) return e
        const logs = e.reviewLogs || []
        return {
          ...e,
          reviewLogs: [
            {
              id: reviewId,
              date: reviewDate,
              minutes: Number(minutes) || 20,
              note,
              pharmacist
            },
            ...logs
          ]
        }
      })
    )

    // If recommendation is specified, add it to prescriberLog
    if (recommendation && recommendation.trim()) {
      const patient = patients.find(p => p.id === patientId)
      const newRec = {
        id: `rec-rpm-${Date.now()}`,
        patientName: patient ? patient.name : 'Unknown Patient',
        patientId,
        recommendation: `[RPM Review] ${recommendation}`,
        prescriber: prescriber || 'Dr. Chen',
        specialty: 'Internal Medicine / Cardiology',
        dateSent: reviewDate,
        status: 'Pending',
        responseNote: ''
      }
      setPrescriberLog(prev => [newRec, ...prev])
    }
  }

  // Acknowledge alert
  const acknowledgeAlert = (alertId, acknowledgedBy = 'Dr. Alexandra Rivera, PharmD') => {
    const timestamp = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
    setAcknowledgedMap(prev => ({
      ...prev,
      [alertId]: {
        acknowledgedBy,
        acknowledgedAt: timestamp
      }
    }))
  }

  // Unacknowledge alert
  const unacknowledgeAlert = (alertId) => {
    setAcknowledgedMap(prev => {
      const copy = { ...prev }
      delete copy[alertId]
      return copy
    })
  }

  // Link deprescribing recommendation to patient's RPM
  const attachDeprescribingToRpm = (patientId, { recommendationText, medicationName, prescriberName }) => {
    const existing = enrollments.find(e => e.patientId === patientId)
    const recItem = {
      id: `deprec-${Date.now()}`,
      medicationName: medicationName || 'Blood Pressure Medication',
      recommendationText,
      prescriberName: prescriberName || 'Attending Physician',
      dateAttached: new Date().toISOString().slice(0, 10),
      status: 'Active Taper Monitoring'
    }

    if (!existing || existing.status !== 'active') {
      enrollPatient({
        patientId,
        attachedRecommendation: recItem
      })
    } else {
      setEnrollments(prev =>
        prev.map(e => {
          if (e.patientId !== patientId) return e
          return {
            ...e,
            attachedRecommendations: [...(e.attachedRecommendations || []), recItem]
          }
        })
      )
    }
  }

  // Helper getters
  const getEnrollment = (patientId) => enrollments.find(e => e.patientId === patientId)
  const getPatientReadings = (patientId) => readings.filter(r => r.patientId === patientId)

  return (
    <RpmContext.Provider
      value={{
        enrollments,
        readings,
        thresholds,
        setThresholds,
        allAlerts,
        acknowledgedMap,
        prescriberLog,
        setPrescriberLog,
        enrollPatient,
        updateEnrollmentStatus,
        addReading,
        logPharmacistReview,
        acknowledgeAlert,
        unacknowledgeAlert,
        attachDeprescribingToRpm,
        getEnrollment,
        getPatientReadings
      }}
    >
      {children}
    </RpmContext.Provider>
  )
}

export function useRpm() {
  const context = useContext(RpmContext)
  if (!context) {
    throw new Error('useRpm must be used within an RpmProvider')
  }
  return context
}
