import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function Onboarding() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Try to get user from state, otherwise fallback to localStorage
  const stateUser = location.state?.user;
  const localUserStr = localStorage.getItem('session_user');
  const user = stateUser || (localUserStr ? JSON.parse(localUserStr) : null);

  const [step, setStep] = useState(0);

  const [formData, setFormData] = useState({
    business_name: '',
    phone_number: user?.phone_number || '',
    outlet_address: '',
    upi_id: '',
    fssai_number: '',
    tax_slab: '5',
    seating_capacity: '0',
    business_type: 'Retail',
    business_category: 'General',
    gstin: '',
    footer_message: 'Thank you for visiting!'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner_id: user.id, ...formData })
      });
      const data = await res.json();
      if (data.status === 'success') {
        navigate('/inventory', { state: { user, business: { ...formData, id: data.businessId } } });
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to save profile. Is the backend running?');
    }
    setLoading(false);
  };

  if (!user) return <div style={{ padding: '20px' }}>Access Denied. Please login first.</div>;

  // Step 0: Premium Welcome Screen
  if (step === 0) {
    return (
      <div className="onboarding-container">
        {/* Header Section */}
        <div className="ob-header">
          <div className="ob-icon-wrapper">
            <span style={{ fontSize: '32px' }}>🏪</span>
          </div>
          <h1 className="ob-title">Welcome to Billify POS 👋</h1>
          <p className="ob-subtitle">Let's get your business ready. This usually takes less than 2 minutes.</p>
        </div>

        {/* Setup Progress Stepper */}
        <div className="ob-progress-section">
          <div className="ob-progress-header">
            <h3 className="ob-progress-title">Setup Progress</h3>
            <span className="ob-step-count">Step 1 of 4</span>
          </div>
          
          <div className="ob-stepper">
            <div className="ob-step active">
              <div className="ob-step-icon">🏪</div>
              <span className="ob-step-label">Business</span>
            </div>
            <div className="ob-stepper-line"></div>
            <div className="ob-step">
              <div className="ob-step-icon inactive">🍽</div>
              <span className="ob-step-label inactive">Items</span>
            </div>
            <div className="ob-stepper-line inactive"></div>
            <div className="ob-step">
              <div className="ob-step-icon inactive">🖨</div>
              <span className="ob-step-label inactive">Printer</span>
            </div>
            <div className="ob-stepper-line inactive"></div>
            <div className="ob-step">
              <div className="ob-step-icon inactive">🧾</div>
              <span className="ob-step-label inactive">Ready</span>
            </div>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="ob-main-card">
          <div className="ob-card-header">
            <div className="ob-card-icon">🏬</div>
            <div>
              <h2 className="ob-card-title">Create Your Business</h2>
              <div className="ob-time-est">
                <span>⏱️</span> Less than 1 minute
              </div>
            </div>
          </div>
          <p className="ob-card-desc">
            Add your business information so your receipts, billing, and payment QR are personalized.
          </p>
          
          <div className="ob-chips-container">
            <span className="ob-chip">✔ Business Profile</span>
            <span className="ob-chip">✔ Tax Settings</span>
            <span className="ob-chip">✔ Payment QR</span>
          </div>
        </div>

        {/* Actions */}
        <div className="ob-actions">
          <button className="btn-continue" onClick={() => setStep(1)}>
            Continue Setup
          </button>
        </div>

        {/* Informational Note */}
        <div className="ob-info-note">
          <p>Don't worry. You can edit all business information later from Settings.</p>
        </div>

        <style>{`
          .onboarding-container {
            display: flex;
            flex-direction: column;
            min-height: 100vh;
            background-color: var(--bg-main);
            margin: 0 auto;
            max-width: 480px;
            padding: 32px 24px;
            font-family: 'Poppins', sans-serif;
          }
          .ob-header {
            text-align: center;
            margin-bottom: 40px;
            margin-top: 20px;
          }
          .ob-icon-wrapper {
            width: 64px;
            height: 64px;
            background-color: #e0e7ff;
            border-radius: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 0 auto 20px auto;
          }
          .ob-title {
            font-size: 24px;
            font-weight: 700;
            color: #111827;
            margin: 0 0 12px 0;
            letter-spacing: -0.5px;
          }
          .ob-subtitle {
            font-size: 15px;
            color: #6b7280;
            line-height: 1.5;
            margin: 0;
            padding: 0 20px;
          }
          .ob-progress-section {
            margin-bottom: 32px;
          }
          .ob-progress-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
          }
          .ob-progress-title {
            font-size: 14px;
            font-weight: 600;
            color: #374151;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .ob-step-count {
            font-size: 13px;
            color: var(--primary);
            font-weight: 600;
            background-color: #e0e7ff;
            padding: 4px 10px;
            border-radius: 12px;
          }
          .ob-stepper {
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .ob-step {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            z-index: 2;
          }
          .ob-step-icon {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background-color: white;
            border: 2px solid var(--primary);
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 18px;
            box-shadow: 0 2px 8px rgba(26,92,255,0.2);
          }
          .ob-step-icon.inactive {
            border-color: #e5e7eb;
            background-color: #f9fafb;
            box-shadow: none;
            filter: grayscale(100%);
            opacity: 0.5;
          }
          .ob-step-label {
            font-size: 12px;
            font-weight: 600;
            color: var(--primary);
          }
          .ob-step-label.inactive {
            color: #9ca3af;
            font-weight: 500;
          }
          .ob-stepper-line {
            flex: 1;
            height: 2px;
            background-color: var(--primary);
            margin-bottom: 20px;
            margin-left: -10px;
            margin-right: -10px;
            z-index: 1;
          }
          .ob-stepper-line.inactive {
            background-color: #e5e7eb;
          }
          .ob-main-card {
            background-color: white;
            border-radius: 20px;
            padding: 24px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.04);
            margin-bottom: 32px;
            border: 1px solid rgba(0,0,0,0.02);
          }
          .ob-card-header {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 16px;
          }
          .ob-card-icon {
            width: 48px;
            height: 48px;
            background-color: #f3f4f6;
            border-radius: 14px;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 24px;
          }
          .ob-card-title {
            font-size: 18px;
            font-weight: 700;
            color: #111827;
            margin: 0 0 4px 0;
          }
          .ob-time-est {
            font-size: 13px;
            color: #6b7280;
            display: flex;
            align-items: center;
            gap: 4px;
          }
          .ob-card-desc {
            font-size: 14px;
            color: #4b5563;
            line-height: 1.6;
            margin: 0 0 20px 0;
          }
          .ob-chips-container {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
          }
          .ob-chip {
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
            padding: 6px 12px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 600;
            color: #374151;
          }
          .ob-actions {
            margin-top: auto;
          }
          .btn-continue {
            background-color: var(--primary);
            color: white;
            width: 100%;
            padding: 18px;
            border-radius: 14px;
            border: none;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(26,92,255,0.25);
            transition: transform 0.1s, box-shadow 0.1s;
          }
          .btn-continue:active {
            transform: scale(0.98);
            box-shadow: none;
          }
          .ob-info-note {
            margin-top: 24px;
            text-align: center;
            background-color: #f9fafb;
            padding: 16px;
            border-radius: 12px;
            border: 1px dashed #d1d5db;
          }
          .ob-info-note p {
            margin: 0;
            font-size: 12px;
            color: #6b7280;
            line-height: 1.5;
          }
        `}</style>
      </div>
    );
  }

  // Step 1: The Form
  return (
    <div style={{ display: 'flex', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-main)', padding: '24px 20px' }}>
      <div style={{ backgroundColor: 'white', padding: '32px 24px', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', width: '100%', maxWidth: '480px' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '8px', fontSize: '24px', fontWeight: '700' }}>Business Setup</h1>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '14px' }}>
          Tell us about your shop to get started
        </p>
        
        {error && <div style={{ padding: '12px', backgroundColor: 'var(--error)', color: 'white', marginBottom: '16px', borderRadius: '8px', fontSize: '14px' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px', color: '#374151' }}>Business Name *</label>
            <input name="business_name" className="input-field" value={formData.business_name} onChange={handleChange} required style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #d1d5db', outline: 'none' }} />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px', color: '#374151' }}>Outlet Address</label>
            <input name="outlet_address" className="input-field" value={formData.outlet_address} onChange={handleChange} style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #d1d5db', outline: 'none' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px', color: '#374151' }}>Business Type</label>
              <select name="business_type" className="input-field" value={formData.business_type} onChange={handleChange} style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #d1d5db', outline: 'none', background: 'white' }}>
                <option value="Retail">Retail</option>
                <option value="Restaurant">Restaurant</option>
                <option value="Service">Service</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px', color: '#374151' }}>Default Tax (%)</label>
              <input name="tax_slab" type="number" className="input-field" value={formData.tax_slab} onChange={handleChange} style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #d1d5db', outline: 'none' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px', color: '#374151' }}>UPI ID (for bills)</label>
              <input name="upi_id" className="input-field" value={formData.upi_id} onChange={handleChange} placeholder="merchant@upi" style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #d1d5db', outline: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px', color: '#374151' }}>GSTIN (optional)</label>
              <input name="gstin" className="input-field" value={formData.gstin} onChange={handleChange} style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #d1d5db', outline: 'none' }} />
            </div>
          </div>

          <button type="submit" disabled={loading} style={{ marginTop: '24px', backgroundColor: 'var(--primary)', color: 'white', width: '100%', padding: '18px', borderRadius: '14px', border: 'none', fontSize: '16px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 12px rgba(26,92,255,0.25)' }}>
            {loading ? 'Saving...' : 'Complete Setup'}
          </button>
        </form>
      </div>
    </div>
  );
}
