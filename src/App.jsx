import { useEffect } from 'react'
import { HashRouter, Navigate, Routes, Route, useLocation, useParams } from 'react-router-dom'
import { RpmProvider } from './context/RpmContext'
import { IntegrationStudyProvider } from './context/IntegrationStudyContext'
import Navbar from './components/Navbar'
import PublicDemoNotice from './components/PublicDemoNotice'
import Footer from './components/Footer'
import Landing from './pages/Landing'
import IntegrationDemo from './pages/IntegrationDemo'
import IntegrationDemoLayout from './components/IntegrationDemoLayout'
import Dashboard from './pages/Dashboard'
import PatientDetail from './pages/PatientDetail'
import PrintSummary from './pages/PrintSummary'
import PatientPortal from './pages/PatientPortal'
import ValueCalculator from './pages/ValueCalculator'
import IntegrationStudyCalculator from './pages/IntegrationStudyCalculator'
import RecruitmentSimulation from './pages/RecruitmentSimulation'

function LegacyDemoRedirect({ to }) {
  const { '*': rest } = useParams()
  const { search, hash } = useLocation()
  return <Navigate replace to={`${to}${rest ? `/${rest}` : ''}${search}${hash}`} />
}

function ScrollToPageStart() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])
  return null
}

export default function App() {
  return (
    <HashRouter>
      <ScrollToPageStart />
      <RpmProvider>
      <IntegrationStudyProvider>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <PublicDemoNotice />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/simulation" element={<RecruitmentSimulation />} />
              <Route path="/integration-demo" element={<IntegrationDemoLayout />}>
                <Route index element={<IntegrationDemo />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="dashboard/patient/:id" element={<PatientDetail />} />
                <Route path="dashboard/patient/:id/print" element={<PrintSummary />} />
                <Route path="patient-portal" element={<PatientPortal />} />
              </Route>
              <Route path="/eligibility" element={<Navigate replace to="/" />} />
              <Route path="/dashboard/*" element={<LegacyDemoRedirect to="/integration-demo/dashboard" />} />
              <Route path="/portal" element={<LegacyDemoRedirect to="/integration-demo/patient-portal" />} />
              <Route path="/insurer" element={<Navigate replace to="/calculator" />} />
              <Route path="/calculator" element={<IntegrationStudyCalculator />} />
              <Route path="/value-calculator" element={<Navigate replace to="/calculator" />} />
              <Route path="/legacy-budget" element={<ValueCalculator />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </IntegrationStudyProvider>
      </RpmProvider>
    </HashRouter>
  )
}
