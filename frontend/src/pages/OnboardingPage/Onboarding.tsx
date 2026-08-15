import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomSelect from '../../components/CustomSelect/CustomSelect';
import type { SelectOption } from '../../components/CustomSelect/CustomSelect';
import './Onboarding.css';

const businessTypeOptions: SelectOption[] = [
  {
    value: 'Retail',
    label: 'Retail Store',
    description: 'Grocery, apparel, electronics, or general store',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
    )
  },
  {
    value: 'Restaurant',
    label: 'Restaurant / Cafe',
    description: 'Dining, fast food, bakery, cafe, or cloud kitchen',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21V3m0 0a9.004 9.004 0 018.716 6.747M12 3a9.004 9.004 0 00-8.716 6.747" />
      </svg>
    )
  },
  {
    value: 'Service',
    label: 'Service & Salon',
    description: 'Salon, spa, repair shop, or professional services',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.83-5.83M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l5.654-4.654m.27-2.617A5.986 5.986 0 003.54 3.541m12.448 12.449A5.986 5.986 0 0017.46 3.54" />
      </svg>
    )
  },
  {
    value: 'Wholesale',
    label: 'Wholesale & B2B',
    description: 'Bulk distribution, B2B sales, or manufacturing',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
      </svg>
    )
  }
];

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('Retail');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
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
    
    // Construct full formatted address
    const fullAddress = [
      street.trim(),
      area.trim(),
      city.trim() ? (pincode.trim() ? `${city.trim()} - ${pincode.trim()}` : city.trim()) : pincode.trim()
    ].filter(Boolean).join(', ');

    if (!fullAddress.trim()) {
      setError('Please enter your store address details.');
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
          outlet_address: fullAddress,
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
        outlet_address: fullAddress,
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
              <CustomSelect
                options={businessTypeOptions}
                value={businessType}
                onChange={(val) => setBusinessType(val)}
                placeholder="Select your business type"
              />
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

            {/* Multi-field Structured Address */}
            <div className="form-group">
              <label htmlFor="street-address">Building / Flat / Street Name</label>
              <input
                id="street-address"
                type="text"
                value={street}
                onChange={(e) => {
                  setStreet(e.target.value);
                  setError('');
                }}
                placeholder="e.g. Shop #12, Ground Floor, MG Road"
                className="input-field"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="area-address">Area / Locality / Landmark</label>
              <input
                id="area-address"
                type="text"
                value={area}
                onChange={(e) => {
                  setArea(e.target.value);
                  setError('');
                }}
                placeholder="e.g. Indiranagar, Near Metro Station"
                className="input-field"
                disabled={loading}
              />
            </div>

            <div className="form-row-2col">
              <div className="form-group">
                <label htmlFor="city-address">City / Town</label>
                <input
                  id="city-address"
                  type="text"
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    setError('');
                  }}
                  placeholder="e.g. Bengaluru"
                  className="input-field"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="pincode-address">Pincode</label>
                <input
                  id="pincode-address"
                  type="text"
                  inputMode="numeric"
                  value={pincode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val.length <= 6) {
                      setPincode(val);
                      setError('');
                    }
                  }}
                  placeholder="e.g. 560038"
                  className="input-field"
                  disabled={loading}
                />
              </div>
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
