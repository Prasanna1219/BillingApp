import {Routes, Route, Navigate} from 'react-router-dom'
import Login from './pages/LoginPage/Login'
import Onboarding from './pages/OnboardingPage/Onboarding'
import Inventory from './pages/InventoryPage/Inventory'
import Pos from './pages/PosPage/Pos'
import Dashboard from './pages/DashboardPage/Dashboard'
import Profile from './pages/ProfilePage/Profile'
import Analytics from './pages/AnalyticsPage/Analytics'
import NavbarLayout from './components/NavbarLayout/NavbarLayout'

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace/>}/>
      <Route path="/login" element={<Login/>}/>
      <Route path="/onboarding" element={<Onboarding/>}/>
      
      {/* Authenticated Layout */}
      <Route element={<NavbarLayout />}>
        <Route path="/inventory" element={<Inventory/>}/>
        <Route path="/pos" element={<Pos/>}/>
        <Route path="/dashboard" element={<Dashboard/>}/>
        <Route path="/analytics" element={<Analytics/>}/>
        <Route path="/profile" element={<Profile/>}/>
      </Route>

      <Route path="/otp" element={<h1>Otp</h1>}/>
      <Route path="*" element={<Navigate to='/' replace />} />
    </Routes>
  )
}

export default App