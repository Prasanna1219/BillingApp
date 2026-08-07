import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './RegisterForm.css';

interface RegisterFormProps {
  onToggleLogin: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onToggleLogin }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
    if (!username.trim()) {
      setError('Business Owner name is required.');
      return;
    }
    if (phoneNumber.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }
    if (password.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber, username, password }),
      });

      const data = await response.json();

      if (!response.ok || data.status === 'error') {
        throw new Error(data.message || 'Registration failed.');
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
      <h2>Register</h2>
      <p>Create your business owner account.</p>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name-input">Owner Full Name</label>
          <input
            id="name-input"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your name"
            className="inputStyle"
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="phone-input">Phone Number</label>
          <div className="phone-input-container">
            <span className="phone-prefix">+91</span>
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
          <label htmlFor="password-input">Password</label>
          <input
            id="password-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="inputStyle"
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="confirm-password-input">Confirm Password</label>
          <input
            id="confirm-password-input"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter password"
            className="inputStyle"
            disabled={loading}
          />
        </div>

        {error && (
          <span style={{ color: '#ef4444', fontSize: '0.8rem', display: 'block', marginBottom: '10px' }}>
            {error}
          </span>
        )}

        <button type="submit" className="buttonStyle" disabled={loading}>
          {loading ? 'Processing...' : 'Sign Up'}
        </button>
      </form>

      <div className="toggle-auth-container">
        <span style={{ color: '#94a3b8' }}>Already have an account? </span>
        <button 
          onClick={onToggleLogin}
          type="button"
          className="toggle-auth-btn"
        >
          Log In
        </button>
      </div>
    </div>
  );
};

export default RegisterForm;
