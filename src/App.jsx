import { HashRouter, Routes, Route } from 'react-router-dom'
import { RpmProvider } from './context/RpmContext'
import Navbar from './components/Navbar'
import PublicDemoNotice from './components/PublicDemoNotice'
import Footer from './components/Footer'
import Landing from './pages/Landing'
import EligibilityChecker from './pages/EligibilityChecker'
import Dashboard from './pages/Dashboard'
import PatientDetail from './pages/PatientDetail'
import PrintSummary from './pages/PrintSummary'
import PatientPortal from './pages/PatientPortal'
import InsurerDashboard from './pages/InsurerDashboard'
import ValueCalculator from './pages/ValueCalculator'

export default function App() {
  return (
    <HashRouter>
      <RpmProvider>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <PublicDemoNotice />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/eligibility" element={<EligibilityChecker />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/dashboard/patient/:id" element={<PatientDetail />} />
              <Route path="/dashboard/patient/:id/print" element={<PrintSummary />} />
              <Route path="/portal" element={<PatientPortal />} />
              <Route path="/insurer" element={<InsurerDashboard />} />
              <Route path="/calculator" element={<ValueCalculator />} />
              <Route path="/value-calculator" element={<ValueCalculator />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </RpmProvider>
    </HashRouter>
  )
}
