import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function OtpVerification() {
  const location = useLocation();
  const navigate = useNavigate();
  const phoneNumber = location.state?.phoneNumber;

  const [otp, setOtp] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(27);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // If no phone number, redirect back to login
  useEffect(() => {
    if (!phoneNumber) {
      navigate('/login');
    }
  }, [phoneNumber, navigate]);

  // Timer logic
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) return; // Prevent multiple chars
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto focus next input
    if (value !== '' && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
    
    // If all filled, try verify
    if (newOtp.every(digit => digit !== '')) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (fullOtp: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, otp: fullOtp })
      });
      const data = await res.json();
      if (data.status === 'success') {
        const userId = data.user.id;
        const bizRes = await fetch(`/api/business/${userId}`);
        const bizData = await bizRes.json();
        
        // Save to localStorage for Auto-Login
        localStorage.setItem('session_user', JSON.stringify(data.user));
        if (bizData.hasBusiness) {
          localStorage.setItem('session_business', JSON.stringify(bizData.business));
          navigate('/inventory');
        } else {
          navigate('/onboarding');
        }
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to verify OTP.');
    }
    setLoading(false);
  };

  return (
    <div className="otp-container">
      {/* Header */}
      <div className="otp-header">
        <button className="back-btn" onClick={() => navigate('/login')}>
          <span style={{ fontSize: '20px' }}>&lt;</span>
        </button>
        <h2 className="header-title">OTP Verification</h2>
      </div>

      <div className="otp-content">
        <p className="otp-instruction">
          We have sent a verification code<br/>to<br/>
          <span className="phone-display">+91 {phoneNumber}</span>
        </p>

        {error && <div className="error-message">{error}</div>}

        <div className="otp-inputs">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={el => inputRefs.current[index] = el}
              type="text"
              inputMode="numeric"
              className="otp-box"
              value={digit}
              onChange={(e) => handleChange(index, e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => handleKeyDown(index, e)}
              disabled={loading}
            />
          ))}
        </div>

        <div className="resend-text">
          {timer > 0 ? (
            <span style={{ color: '#d1d5db' }}>Resend OTP in {timer} sec</span>
          ) : (
            <button className="resend-btn" onClick={() => setTimer(27)}>Resend OTP</button>
          )}
        </div>
      </div>

      <style>{`
        .otp-container {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background-color: #f4f7fc; /* Very light blue background matching image */
          margin: 0 auto;
          max-width: 480px;
        }
        .otp-header {
          display: flex;
          align-items: center;
          padding: 24px 20px;
          background-color: transparent;
        }
        .back-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: #333;
          padding: 0;
          margin-right: 16px;
        }
        .header-title {
          font-size: 18px;
          font-weight: 600;
          color: #333;
          margin: 0;
        }
        .otp-content {
          padding: 40px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          background-color: white;
          flex: 1;
          border-top-left-radius: 24px;
          border-top-right-radius: 24px;
          box-shadow: 0 -2px 10px rgba(0,0,0,0.02);
        }
        .otp-instruction {
          text-align: center;
          color: #4b5563;
          font-size: 16px;
          line-height: 1.5;
          margin-bottom: 40px;
        }
        .phone-display {
          color: #1f2937;
          font-weight: 600;
        }
        .otp-inputs {
          display: flex;
          gap: 16px;
          margin-bottom: 32px;
        }
        .otp-box {
          width: 60px;
          height: 60px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          text-align: center;
          font-size: 24px;
          font-weight: 600;
          color: #1f2937;
          background-color: white;
          outline: none;
          transition: border-color 0.2s;
        }
        .otp-box:focus {
          border-color: #1a5cff;
        }
        .resend-text {
          font-size: 14px;
        }
        .resend-btn {
          background: none;
          border: none;
          color: #1a5cff;
          font-weight: 600;
          cursor: pointer;
        }
        .error-message {
          color: #ef4444;
          margin-bottom: 16px;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}
