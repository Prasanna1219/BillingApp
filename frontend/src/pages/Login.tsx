import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  
  const countries = [
    { code: '+91', iso: 'in', name: 'India' },
    { code: '+1', iso: 'us', name: 'USA' },
    { code: '+44', iso: 'gb', name: 'UK' },
    { code: '+61', iso: 'au', name: 'Australia' }
  ];
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  
  const navigate = useNavigate();

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneNumber.length < 10) {
      setError('Please enter a valid mobile number');
      return;
    }
    setLoading(true);
    try {
      const fullNumber = selectedCountry.code + phoneNumber;
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: fullNumber })
      });
      const data = await res.json();
      if (data.status === 'success') {
        navigate('/otp', { state: { phoneNumber: fullNumber } });
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to connect to backend.');
    }
    setLoading(false);
  };

  return (
    <div className="login-container">
      {/* Top Banner Area with Blue Tint Overlay */}
      <div className="login-banner">
        <div className="banner-overlay"></div>
        <div className="banner-content">
          <h1 className="brand-logo">Biller</h1>
        </div>
      </div>

      <div className="login-content">
        <h2 className="slogan">Simple & Fast Billing Solution</h2>

        <div className="divider-container">
          <div className="divider-line"></div>
          <span className="divider-text">Log in or Sign up</span>
          <div className="divider-line"></div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleContinue} className="login-form">
          <div className="phone-input-row">
            <div className="country-dropdown-box" onClick={() => setShowDropdown(!showDropdown)}>
              <img src={`https://flagcdn.com/w20/${selectedCountry.iso}.png`} alt={selectedCountry.name} className="flag-icon" />
              <span className="dropdown-arrow">▼</span>
              
              {showDropdown && (
                <div className="custom-dropdown-menu">
                  {countries.map(country => (
                    <div 
                      key={country.iso} 
                      className="dropdown-item"
                      onClick={() => {
                        setSelectedCountry(country);
                        setShowDropdown(false);
                      }}
                    >
                      <img src={`https://flagcdn.com/w20/${country.iso}.png`} alt={country.name} className="flag-icon" />
                      <span>{country.iso.toUpperCase()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="phone-input-box">
              <span className="country-code">{selectedCountry.code}</span>
              <input 
                type="tel" 
                className="phone-input" 
                placeholder="Enter Mobile Number" 
                value={phoneNumber} 
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))} 
                maxLength={10}
                required 
              />
            </div>
          </div>

          <button type="submit" className="btn-continue" disabled={loading}>
            {loading ? 'Sending OTP...' : 'Continue'}
          </button>
        </form>

        <p className="terms-text">
          By continuing, you agree to our<br/>
          <a href="#">Terms</a> & <a href="#">Policy</a>.
        </p>
      </div>

      {/* Scoped CSS for Login */}
      <style>{`
        .login-container {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background-color: white;
          margin: 0 auto;
          max-width: 480px;
        }
        .login-banner {
          position: relative;
          height: 250px;
          background-image: url('https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=800&q=80');
          background-size: cover;
          background-position: center;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .banner-overlay {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: rgba(26, 92, 255, 0.7);
        }
        .banner-content {
          position: relative;
          z-index: 1;
        }
        .brand-logo {
          color: white;
          font-size: 48px;
          font-weight: 800;
          letter-spacing: -1px;
          margin: 0;
          text-shadow: 0 2px 10px rgba(0,0,0,0.2);
        }
        .login-content {
          padding: 32px 24px;
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .slogan {
          text-align: center;
          font-size: 20px;
          color: #333;
          margin-bottom: 40px;
          font-weight: 600;
        }
        .divider-container {
          display: flex;
          align-items: center;
          margin-bottom: 24px;
        }
        .divider-line {
          flex: 1;
          height: 1px;
          background-color: #e0e0e0;
        }
        .divider-text {
          padding: 0 16px;
          color: #666;
          font-size: 14px;
        }
        .phone-input-row {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
        }
        .country-dropdown-box {
          position: relative;
          display: flex;
          align-items: center;
          background-color: white;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 0 12px;
          min-width: 70px;
          cursor: pointer;
        }
        .flag-icon {
          width: 24px;
          height: auto;
          margin-right: 8px;
          border-radius: 2px;
        }
        .dropdown-arrow {
          font-size: 10px;
          color: #6b7280;
          margin-left: auto;
        }
        .custom-dropdown-menu {
          position: absolute;
          top: 100%;
          left: 0;
          margin-top: 4px;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          width: 120px;
          z-index: 10;
          overflow: hidden;
        }
        .dropdown-item {
          display: flex;
          align-items: center;
          padding: 10px 12px;
          cursor: pointer;
          font-size: 14px;
          color: #333;
          transition: background 0.2s;
        }
        .dropdown-item:hover {
          background-color: #f3f4f6;
        }
        .phone-input-box {
          display: flex;
          align-items: center;
          flex: 1;
          min-width: 0;
          background-color: white;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 0 16px;
        }
        .country-code {
          color: #1f2937;
          font-weight: 500;
          margin-right: 8px;
          flex-shrink: 0;
        }
        .phone-input {
          flex: 1;
          min-width: 0;
          width: 100%;
          border: none;
          padding: 16px 0;
          font-size: 16px;
          outline: none;
          color: #333;
          background: transparent;
        }
        .phone-input::placeholder { color: #9ca3af; }
        .btn-continue {
          background-color: #1a5cff;
          color: white;
          width: 100%;
          padding: 16px;
          border-radius: 8px;
          border: none;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          margin-bottom: 24px;
        }
        .btn-continue:hover { background-color: #0044ff; }
        .btn-continue:disabled { opacity: 0.7; }
        .alt-login {
          display: flex;
          justify-content: center;
          margin-bottom: 32px;
        }
        .btn-icon {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          border: 1px solid #d1d5db;
          background: white;
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
        }
        .terms-text {
          text-align: center;
          font-size: 12px;
          color: #6b7280;
          margin-top: auto;
          line-height: 1.5;
        }
        .terms-text a {
          color: #1a5cff;
          text-decoration: none;
        }
        .error-message {
          color: #ef4444;
          text-align: center;
          margin-bottom: 16px;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}
