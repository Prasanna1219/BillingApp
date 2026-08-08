import {Routes, Route, Navigate} from 'react-router-dom'
import Login from './pages/LoginPage/Login'
import Onboarding from './pages/OnboardingPage/Onboarding'
import Inventory from './pages/InventoryPage/Inventory'

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace/>}/>
      <Route path="/login" element={<Login/>}/>
      <Route path="/onboarding" element={<Onboarding/>}/>
      <Route path="/inventory" element={<Inventory/>}/>
      <Route path="/otp" element={<h1>Otp</h1>}/>
      <Route path="/dashboard" element={<h1>Dashboard</h1>}/>
      <Route path="*" element={<Navigate to='/' replace />} />
    </Routes>
  )
}

export default App