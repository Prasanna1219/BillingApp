import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Inventory.css';

interface Item {
  id: number;
  business_id: number;
  category_id: number | null;
  name: string;
  image_url: string | null;
  sales_price: number;
  tax_percentage: number;
  price_includes_tax: boolean;
  current_stock: number;
  is_favorite: boolean;
}

interface BusinessSession {
  id: number;
  owner_id: number;
  business_name: string;
  business_type: string;
  phone_number: string;
  outlet_address: string;
}

const Inventory = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [tax, setTax] = useState('5.00');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  const navigate = useNavigate();
  const [business, setBusiness] = useState<BusinessSession | null>(null);

  // Authenticate and load session parameters
  useEffect(() => {
    const user = localStorage.getItem('session_user');
    const bizStr = localStorage.getItem('session_business');

    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    if (!bizStr) {
      navigate('/onboarding', { replace: true });
      return;
    }

    const parsedBiz = JSON.parse(bizStr);
    setBusiness(parsedBiz);
    fetchItems(parsedBiz.id);
  }, [navigate]);

  // Load products list from database
  const fetchItems = async (businessId: number) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/items/${businessId}`);
      const data = await response.json();
      if (!response.ok || data.status === 'error') {
        throw new Error(data.message || 'Failed to load catalog.');
      }
      setItems(data.items || []);
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login', { replace: true });
  };

  const handleOpenModal = () => {
    setName('');
    setPrice('');
    setTax('5.00');
    setModalError('');
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    if (!modalLoading) {
      setShowAddModal(false);
    }
  };

  // Add item form submit
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;

    if (!name.trim()) {
      setModalError('Product Name is required.');
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setModalError('Please enter a valid sales price.');
      return;
    }

    setModalLoading(true);
    setModalError('');

    try {
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_id: business.id,
          name: name.trim(),
          sales_price: priceNum,
          tax_percentage: parseFloat(tax),
          price_includes_tax: false,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.status === 'error') {
        throw new Error(data.message || 'Failed to save product.');
      }

      // Close modal and refresh list
      setShowAddModal(false);
      fetchItems(business.id);
    } catch (err: any) {
      setModalError(err.message || 'Failed to add item.');
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="inventory-page">
      <div className="inventory-container">
        
        {/* Header section */}
        <div className="inventory-header">
          <div>
            <h1>Inventory</h1>
            <button onClick={handleLogout} className="logout-btn">
              Sign Out
            </button>
          </div>
          {items.length > 0 && (
            <button onClick={handleOpenModal} className="add-btn">
              <span>+</span> Add Item
            </button>
          )}
        </div>

        {/* Content catalog lists */}
        {loading ? (
          <div style={{ display: 'flex', flexGrow: 1, justifyContent: 'center', alignItems: 'center', color: '#4f46e5', fontWeight: 600 }}>
            Loading products...
          </div>
        ) : error ? (
          <div style={{ color: '#ef4444', textAlign: 'center', padding: '20px', flexGrow: 1 }}>
            {error}
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon" role="img" aria-label="package box">📦</span>
            <h3>No items added yet</h3>
            <p>Your store inventory is empty. Tap the button below to add your first product.</p>
            <button onClick={handleOpenModal} className="start-btn">
              Add Your First Item
            </button>
          </div>
        ) : (
          <div className="items-list">
            {items.map((item) => (
              <div key={item.id} className="item-card">
                <div className="item-info">
                  <span className="item-name">{item.name}</span>
                  <div className="item-meta">
                    <span className="tax-badge">GST {parseFloat(String(item.tax_percentage))}%</span>
                    <span className="stock-label">Stock: {item.current_stock}</span>
                  </div>
                </div>
                <div className="item-pricing">
                  <span className="item-price">₹{parseFloat(String(item.sales_price)).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Product Modal Overlay */}
        {showAddModal && (
          <div className="modal-backdrop" onClick={handleCloseModal}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
              
              <div className="modal-header">
                <h3>Add New Item</h3>
                <button onClick={handleCloseModal} className="close-btn" disabled={modalLoading}>
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddProduct}>
                <div className="form-group">
                  <label htmlFor="item-name">Product Name</label>
                  <input
                    id="item-name"
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setModalError('');
                    }}
                    placeholder="Enter item name"
                    className="input-field"
                    autoFocus
                    disabled={modalLoading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="item-price">Sales Price (₹)</label>
                  <input
                    id="item-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => {
                      setPrice(e.target.value);
                      setModalError('');
                    }}
                    placeholder="0.00"
                    className="input-field"
                    disabled={modalLoading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="item-tax">Tax Slab (GST)</label>
                  <select
                    id="item-tax"
                    value={tax}
                    onChange={(e) => setTax(e.target.value)}
                    className="input-field"
                    disabled={modalLoading}
                  >
                    <option value="0.00">Exempt (0%)</option>
                    <option value="5.00">GST 5%</option>
                    <option value="12.00">GST 12%</option>
                    <option value="18.00">GST 18%</option>
                    <option value="28.00">GST 28%</option>
                  </select>
                </div>

                {modalError && <span className="error-text">{modalError}</span>}

                <button type="submit" className="primary-button" disabled={modalLoading}>
                  {modalLoading ? 'Saving...' : 'Save Product'}
                </button>
              </form>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Inventory;
