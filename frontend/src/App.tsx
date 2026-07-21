import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import OtpVerification from './pages/OtpVerification';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';

function App() {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check localStorage for session on mount
    const checkSession = () => {
      const user = localStorage.getItem('session_user');
      const business = localStorage.getItem('session_business');
      
      setTimeout(() => {
        setLoading(false);
        if (user && location.pathname === '/login') {
          // If logged in and on login page, redirect to inventory
          navigate('/inventory', { state: { user: JSON.parse(user), business: business ? JSON.parse(business) : null } }, { replace: true });
        }
      }, 1500); // 1.5s artificial delay for splash screen
    };
    
    checkSession();
  }, [navigate, location.pathname]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#1a5cff' }}>
        <h1 style={{ color: 'white', fontSize: '48px', fontWeight: '800', letterSpacing: '-1px' }}>Biller</h1>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/otp" element={<OtpVerification />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/inventory" element={<Inventory />} />
    </Routes>
  );
}

export default App;
