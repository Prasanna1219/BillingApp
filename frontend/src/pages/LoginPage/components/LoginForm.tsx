import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginForm.css';

interface LoginFormProps {
  onToggleRegister: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onToggleRegister }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, ''); // Keep only numbers
    if (val.length <= 10) {
      setPhoneNumber(val);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneNumber.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber, password }),
      });

      const data = await response.json();

      if (!response.ok || data.status === 'error') {
        throw new Error(data.message || 'Login failed.');
      }

      // Save user session
      localStorage.setItem('session_user', JSON.stringify(data.user));

      // Check if user has a business profile
      const bizRes = await fetch(`/api/business/${data.user.id}`);
      const bizData = await bizRes.json();

      if (bizData.status === 'success' && bizData.hasBusiness) {
        localStorage.setItem('session_business', JSON.stringify(bizData.business));
        navigate('/inventory');
      } else {
        navigate('/onboarding');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="loginForm">
      
      {/* Top Rounded Icon/Logo Badge */}
      <div className="logo-badge-container">
        <div className="logo-badge">
          <svg className="logo-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="lightning-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="url(#lightning-grad)" />
          </svg>
        </div>
      </div>

      <h2 className="auth-title">Welcome back</h2>
      <p className="auth-subtitle">Please enter your details to sign in.</p>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="phone-input">Phone Number</label>
          <div className="input-with-icon">
            {/* Phone SVG Icon */}
            <span className="input-icon-left">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </span>
            <input
              id="phone-input"
              type="tel"
              inputMode="numeric"
              value={phoneNumber}
              onChange={handleInputChange}
              placeholder="Enter 10-digit number"
              className="inputStyle"
              disabled={loading}
              autoFocus
            />
          </div>
        </div>

        <div className="form-group">
          <div className="label-row">
            <label htmlFor="password-input">Password</label>
            <a href="#forgot" className="forgot-link" onClick={(e) => e.preventDefault()}>
              Forgot Password?
            </a>
          </div>
          <div className="input-with-icon">
            {/* Lock SVG Icon */}
            <span className="input-icon-left">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </span>
            <input
              id="password-input"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="inputStyle"
              disabled={loading}
            />
            {/* Eye toggle button */}
            <button
              type="button"
              className="eye-toggle-btn"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? (
                // Eye Off
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                </svg>
              ) : (
                // Eye On
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {error && (
          <span className="error-message">
            {error}
          </span>
        )}

        <button type="submit" className="buttonStyle" disabled={loading}>
          {loading ? 'Processing...' : 'Login'}
        </button>
      </form>

      <div className="toggle-auth-container">
        <span>Don't have an account? </span>
        <button 
          onClick={onToggleRegister}
          type="button"
          className="toggle-auth-btn"
        >
          Register here
        </button>
      </div>
    </div>
  );
};

export default LoginForm;
