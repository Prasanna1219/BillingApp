import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Onboarding.css';

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('Retail');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [upiId, setUpiId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Redirect to login if user session is missing & prefill login phone number
  useEffect(() => {
    const userStr = localStorage.getItem('session_user');
    if (!userStr) {
      navigate('/login', { replace: true });
    } else {
      try {
        const user = JSON.parse(userStr);
        if (user.phone_number) {
          const cleanPhone = user.phone_number.replace(/\D/g, '').slice(-10);
          setPhone(cleanPhone);
        }
      } catch (err) {
        console.error('Error parsing session user:', err);
      }
    }
  }, [navigate]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    if (val.length <= 10) {
      setPhone(val);
      setError('');
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setError('');
    } else {
      // Go back to login/logout
      localStorage.removeItem('session_user');
      navigate('/login', { replace: true });
    }
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) {
      setError('Business Name is required.');
      return;
    }
    setStep(2);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!address.trim()) {
      setError('Outlet Address is required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const userStr = localStorage.getItem('session_user');
      if (!userStr) throw new Error('No user session found. Please log in again.');
      
      const user = JSON.parse(userStr);
      const owner_id = user.id;

      const response = await fetch('/api/business', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          owner_id,
          business_name: businessName,
          business_type: businessType,
          phone_number: phone,
          outlet_address: address,
          upi_id: upiId.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || data.status === 'error') {
        throw new Error(data.message || 'Failed to complete onboarding.');
      }

      // Save business session locally
      const businessSession = {
        id: data.businessId,
        owner_id,
        business_name: businessName,
        business_type: businessType,
        phone_number: phone,
        outlet_address: address,
        upi_id: upiId.trim(),
      };
      localStorage.setItem('session_business', JSON.stringify(businessSession));
      localStorage.setItem('business_id', String(data.businessId));

      // Route to main page (Inventory)
      navigate('/inventory');
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-page">
      <div className="onboarding-container">
        
        {/* Header with Back Arrow */}
        <div className="onboarding-header">
          <button onClick={handleBack} type="button" className="back-btn" aria-label="Go back">
            ←
          </button>
          <h1>{step === 1 ? 'Store Details' : 'Store Location'}</h1>
        </div>

        {/* Stepper Progress Indicator */}
        <div className="stepper-container">
          <div className={`step-node active`}>
            <div className="step-circle">1</div>
            <span>Details</span>
          </div>
          <div className={`step-line ${step === 2 ? 'active' : ''}`}></div>
          <div className={`step-node ${step === 2 ? 'active' : ''}`}>
            <div className="step-circle">2</div>
            <span>Contact</span>
          </div>
        </div>

        {/* Step Forms */}
        {step === 1 ? (
          <form onSubmit={handleNext} className="onboarding-form">
            <div className="form-group">
              <label htmlFor="business-name">Business Name</label>
              <input
                id="business-name"
                type="text"
                value={businessName}
                onChange={(e) => {
                  setBusinessName(e.target.value);
                  setError('');
                }}
                placeholder="Enter business name"
                className="input-field"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="business-type">Business Type</label>
              <select
                id="business-type"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                className="input-field"
              >
                <option value="Retail">Retail Store</option>
                <option value="Restaurant">Restaurant / Cafe</option>
                <option value="Service">General Service</option>
              </select>
            </div>

            {error && <span className="error-text">{error}</span>}

            <div className="button-container">
              <button type="submit" className="primary-button">
                Next
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="onboarding-form">
            <div className="form-group">
              <label htmlFor="business-phone">Business Phone Number</label>
              <div className="phone-wrapper">
                <span className="phone-prefix">+91</span>
                <input
                  id="business-phone"
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="Enter 10-digit number"
                  className="input-field"
                  autoFocus
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="business-address">Outlet Address</label>
              <textarea
                id="business-address"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setError('');
                }}
                placeholder="Enter complete store address"
                className="input-field"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="business-upi">Merchant UPI ID (Optional)</label>
              <input
                id="business-upi"
                type="text"
                value={upiId}
                onChange={(e) => {
                  setUpiId(e.target.value);
                  setError('');
                }}
                placeholder="e.g. storename@upi or 9876543210@ybl"
                className="input-field"
                disabled={loading}
              />
            </div>

            {error && <span className="error-text">{error}</span>}

            <div className="button-container">
              <button type="submit" className="primary-button" disabled={loading}>
                {loading ? 'Submitting...' : 'Complete Setup'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
