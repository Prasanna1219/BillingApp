import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/LoginPage/Login'
import Onboarding from './pages/OnboardingPage/Onboarding'
import Inventory from './pages/InventoryPage/Inventory'
import Pos from './pages/PosPage/Pos'
import Dashboard from './pages/DashboardPage/Dashboard'
import Profile from './pages/ProfilePage/Profile'
import Analytics from './pages/AnalyticsPage/Analytics'
import NavbarLayout from './components/NavbarLayout/NavbarLayout'

// Guard: redirects to /login if not authenticated
const PrivateRoute = ({ children }: { children: React.ReactElement }) => {
  const user = localStorage.getItem('session_user');
  return user ? children : <Navigate to="/login" replace />;
};

// Smart root redirect based on auth state
const RootRedirect = () => {
  const user = localStorage.getItem('session_user');
  const business = localStorage.getItem('session_business');
  if (!user) return <Navigate to="/login" replace />;
  if (!business) return <Navigate to="/onboarding" replace />;
  return <Navigate to="/inventory" replace />;
};

const App = () => {
  return (
    <Routes>
      {/* Root: smart redirect */}
      <Route path="/" element={<RootRedirect />} />

      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/onboarding" element={<Onboarding />} />

      {/* Authenticated Layout */}
      <Route element={<PrivateRoute><NavbarLayout /></PrivateRoute>}>
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/pos" element={<Pos />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      {/* Unknown routes: smart redirect */}
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  )
}

export default App