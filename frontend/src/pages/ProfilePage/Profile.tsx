import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Profile.css';

interface BusinessProfile {
  id: number;
  owner_id: number;
  business_name: string;
  phone_number: string;
  outlet_address: string;
  upi_id: string;
  fssai_number: string;
  tax_slab: number;
  seating_capacity: number;
  business_type: string;
  business_category: string;
  gstin: string;
  footer_message: string;
  google_link: string;
  swiggy_link: string;
  zomato_link: string;
}

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  // Form fields state
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [upiId, setUpiId] = useState('');
  const [fssai, setFssai] = useState('');
  const [taxSlab, setTaxSlab] = useState<number>(0);
  const [seating, setSeating] = useState<number>(0);
  const [type, setType] = useState('');
  const [category, setCategory] = useState('');
  const [gstin, setGstin] = useState('');
  const [footer, setFooter] = useState('');
  const [google, setGoogle] = useState('');
  const [swiggy, setSwiggy] = useState('');
  const [zomato, setZomato] = useState('');

  useEffect(() => {
    const userStr = localStorage.getItem('session_user');
    const bizStr = localStorage.getItem('session_business');

    if (!userStr) {
      navigate('/login', { replace: true });
      return;
    }

    if (!bizStr) {
      navigate('/onboarding', { replace: true });
      return;
    }

    const parsedBiz = JSON.parse(bizStr) as BusinessProfile;
    setBusiness(parsedBiz);
    
    // Set form fields
    setBusinessName(parsedBiz.business_name || '');
    setPhone(parsedBiz.phone_number || '');
    setAddress(parsedBiz.outlet_address || '');
    setUpiId(parsedBiz.upi_id || '');
    setFssai(parsedBiz.fssai_number || '');
    setTaxSlab(parsedBiz.tax_slab || 0);
    setSeating(parsedBiz.seating_capacity || 0);
    setType(parsedBiz.business_type || '');
    setCategory(parsedBiz.business_category || '');
    setGstin(parsedBiz.gstin || '');
    setFooter(parsedBiz.footer_message || '');
    setGoogle(parsedBiz.google_link || '');
    setSwiggy(parsedBiz.swiggy_link || '');
    setZomato(parsedBiz.zomato_link || '');

    setFetchLoading(false);
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/business/${business.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_name: businessName,
          phone_number: phone,
          outlet_address: address,
          upi_id: upiId,
          fssai_number: fssai,
          tax_slab: taxSlab,
          seating_capacity: seating,
          business_type: type,
          business_category: category,
          gstin,
          footer_message: footer,
          google_link: google,
          swiggy_link: swiggy,
          zomato_link: zomato,
        }),
      });

      const data = await response.json();
      if (!response.ok || data.status === 'error') {
        throw new Error(data.message || 'Failed to update business profile.');
      }

      // Update local storage
      localStorage.setItem('session_business', JSON.stringify(data.business));
      
      // Update local state
      setBusiness(data.business);
      setShowSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <div className="profile-loading-screen">
        <div className="spinner"></div>
        <p>Loading Profile...</p>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        
        {/* Header */}
        <div className="profile-header">
          <div>
            <h1>Business Profile</h1>
            <p className="profile-subtitle">Manage billing parameters, taxes, and UPI merchant accounts.</p>
          </div>
        </div>

        {error && (
          <div className="profile-error-alert" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '16px', height: '16px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="profile-form">
          <div className="profile-grid">
            
            {/* Left Column: Form Fields */}
            <div className="profile-form-fields-container">
              
              {/* Section 1: Core Business Info */}
              <div className="profile-section-card">
                <h3>Business Details</h3>
                <div className="form-row-grid">
                  <div className="form-group">
                    <label htmlFor="biz-name">Business Name</label>
                    <input
                      id="biz-name"
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="My Restaurant"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="biz-phone">Business Phone</label>
                    <input
                      id="biz-phone"
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="10-digit number"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="biz-address">Outlet Address</label>
                  <textarea
                    id="biz-address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter complete physical address"
                    rows={3}
                  />
                </div>

                <div className="form-row-grid">
                  <div className="form-group">
                    <label htmlFor="biz-type">Business Type</label>
                    <select id="biz-type" value={type} onChange={(e) => setType(e.target.value)}>
                      <option value="">Select Type</option>
                      <option value="Restaurant">Restaurant</option>
                      <option value="Cafe">Cafe</option>
                      <option value="Food Truck">Food Truck</option>
                      <option value="QSR">Quick Service Restaurant (QSR)</option>
                      <option value="Grocery">Grocery / Retail</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="biz-cat">Category</label>
                    <input
                      id="biz-cat"
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="Fast Food, Desserts"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: UPI & Tax details */}
              <div className="profile-section-card highlight-card">
                <div className="card-header-icon-row">
                  <h3>Payment & Taxes</h3>
                  <span className="pay-tag">Active QR</span>
                </div>
                
                <div className="form-group upi-input-highlight">
                  <label htmlFor="biz-upi" className="upi-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="label-icon">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v14.25c0 .621-.504 1.125-1.125 1.125h-4.5c-.621 0-1.125-.504-1.125-1.125V4.875Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6h7.5A1.5 1.5 0 0 1 18 7.5v11.25m-9-6h6m-6 3h6" />
                    </svg>
                    Merchant UPI ID
                  </label>
                  <input
                    id="biz-upi"
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. storename@upi"
                    className="upi-input"
                  />
                  <small className="helper-text">Used to dynamically generate custom UPI QR codes for POS checkouts.</small>
                </div>

                <div className="form-row-grid">
                  <div className="form-group">
                    <label htmlFor="biz-gstin">GSTIN (Optional)</label>
                    <input
                      id="biz-gstin"
                      type="text"
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value)}
                      placeholder="15-digit GST number"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="biz-tax">Default Tax Slab (%)</label>
                    <input
                      id="biz-tax"
                      type="number"
                      step="0.01"
                      value={taxSlab}
                      onChange={(e) => setTaxSlab(parseFloat(e.target.value) || 0)}
                      placeholder="e.g. 5"
                    />
                  </div>
                </div>

                <div className="form-row-grid">
                  <div className="form-group">
                    <label htmlFor="biz-fssai">FSSAI License</label>
                    <input
                      id="biz-fssai"
                      type="text"
                      value={fssai}
                      onChange={(e) => setFssai(e.target.value)}
                      placeholder="14-digit FSSAI"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="biz-seating">Seating Capacity</label>
                    <input
                      id="biz-seating"
                      type="number"
                      value={seating}
                      onChange={(e) => setSeating(parseInt(e.target.value) || 0)}
                      placeholder="0 for takeaway only"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Extra settings */}
              <div className="profile-section-card">
                <h3>Bill Layout Settings</h3>
                <div className="form-group">
                  <label htmlFor="biz-footer">Invoice Footer Message</label>
                  <textarea
                    id="biz-footer"
                    value={footer}
                    onChange={(e) => setFooter(e.target.value)}
                    placeholder="Thank you for dining with us! Come back soon."
                    rows={2}
                  />
                </div>
              </div>

              {/* Section 4: Social / Third Party links */}
              <div className="profile-section-card">
                <h3>Online Listings</h3>
                <div className="form-group">
                  <label htmlFor="biz-google">Google Business Link</label>
                  <input
                    id="biz-google"
                    type="url"
                    value={google}
                    onChange={(e) => setGoogle(e.target.value)}
                    placeholder="https://g.page/r/your-id"
                  />
                </div>
                <div className="form-row-grid">
                  <div className="form-group">
                    <label htmlFor="biz-swiggy">Swiggy Link</label>
                    <input
                      id="biz-swiggy"
                      type="url"
                      value={swiggy}
                      onChange={(e) => setSwiggy(e.target.value)}
                      placeholder="https://swiggy.com/restaurants/..."
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="biz-zomato">Zomato Link</label>
                    <input
                      id="biz-zomato"
                      type="url"
                      value={zomato}
                      onChange={(e) => setZomato(e.target.value)}
                      placeholder="https://zomato.com/..."
                    />
                  </div>
                </div>
              </div>

              <div className="profile-submit-row">
                <button type="submit" className="save-profile-btn" disabled={loading}>
                  {loading ? 'Saving Changes...' : 'Save Profile Details'}
                </button>
              </div>

            </div>

            {/* Right Column: Visual Brand Preview */}
            <div className="profile-preview-column">
              <div className="preview-sticky-card">
                <h3>Live QR Code Preview</h3>
                <p className="preview-desc">This is how your UPI payment code renders on the mobile checkout screen.</p>
                
                <div className="mock-payment-qr-container">
                  <div className="mock-qr-header">
                    <h4>{businessName || 'Your Business Name'}</h4>
                    <span className="mock-method">UPI PAYMENT</span>
                  </div>
                  
                  <div className="mock-qr-graphic">
                    {upiId ? (
                      <div className="qr-wrapper-mock">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=upi://pay?pa=${upiId}&pn=${encodeURIComponent(businessName)}&am=0.00&cu=INR`} 
                          alt="Dynamic QR Code" 
                        />
                      </div>
                    ) : (
                      <div className="qr-placeholder">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v14.25c0 .621-.504 1.125-1.125 1.125h-4.5c-.621 0-1.125-.504-1.125-1.125V4.875Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 9h6m-6 3h6m-6 3h6" />
                        </svg>
                        <p>Enter a UPI ID to generate live QR</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="mock-qr-footer">
                    <span className="upi-id-mock-text">{upiId || 'No UPI ID Set'}</span>
                  </div>
                </div>

                <div className="mock-invoice-banner">
                  <div className="banner-logo-preview">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '16px', height: '16px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                    </svg>
                  </div>
                  <div>
                    <h5>Header Branding</h5>
                    <p className="sub">{businessName || 'Business Title'} • {phone || 'Phone'}</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </form>

      </div>

      {/* Custom Success Modal */}
      {showSuccess && (
        <div className="confirm-modal-backdrop" onClick={() => setShowSuccess(false)}>
          <div className="confirm-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-header">
              <div className="confirm-icon-circle success-circle">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="confirm-svg">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <h3>Profile Updated</h3>
            </div>
            <div className="confirm-modal-body">
              <p>Your business profile details and UPI ID have been successfully updated in the database!</p>
            </div>
            <div className="confirm-modal-actions">
              <button onClick={() => setShowSuccess(false)} className="confirm-ok-btn success-btn">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Profile;
