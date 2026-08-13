import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Pos.css';

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

interface CartItem {
  id: number;
  name: string;
  sales_price: number;
  tax_percentage: number;
  quantity: number;
}

interface BusinessSession {
  id: number;
  owner_id: number;
  business_name: string;
  business_type: string;
  phone_number: string;
  outlet_address: string;
  upi_id?: string;
}

const Pos = () => {
  const navigate = useNavigate();
  const [business, setBusiness] = useState<BusinessSession | null>(null);
  const [user, setUser] = useState<any>(null);
  
  // Data states
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search & Cart states
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI'>('Cash');
  
  // Checkout Modal states
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [confirmedOrderId, setConfirmedOrderId] = useState<number | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Reusable Custom Alert state
  const [customAlert, setCustomAlert] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'confirm';
    onConfirm?: () => void;
  } | null>(null);

  const showAlert = (message: string, type: 'success' | 'error' = 'error', title: string = 'Notification') => {
    setCustomAlert({ show: true, title, message, type });
  };

  // Authenticate and load session parameters
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

    const parsedUser = JSON.parse(userStr);
    const parsedBiz = JSON.parse(bizStr);
    setUser(parsedUser);
    setBusiness(parsedBiz);
    fetchCatalog(parsedBiz.id);
  }, [navigate]);

  const fetchCatalog = async (businessId: number) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/items/${businessId}`);
      const data = await response.json();
      if (!response.ok || data.status === 'error') {
        throw new Error(data.message || 'Failed to load catalog items.');
      }
      setItems(data.items || []);
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  // Add to cart logic
  const handleAddToCart = (item: Item) => {
    setCart((prevCart) => {
      const existing = prevCart.find((c) => c.id === item.id);
      if (existing) {
        return prevCart.map((c) =>
          c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      } else {
        return [
          ...prevCart,
          {
            id: item.id,
            name: item.name,
            sales_price: item.sales_price,
            tax_percentage: item.tax_percentage,
            quantity: 1,
          },
        ];
      }
    });
  };

  // Update quantity in cart
  const handleUpdateQty = (itemId: number, change: number) => {
    setCart((prevCart) =>
      prevCart
        .map((c) => {
          if (c.id === itemId) {
            const nextQty = c.quantity + change;
            return nextQty <= 0 ? null : { ...c, quantity: nextQty };
          }
          return c;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  // Calculations
  const calculateCartSubtotal = () => {
    return cart.reduce((acc, c) => acc + c.sales_price * c.quantity, 0);
  };

  const calculateCartTax = () => {
    return cart.reduce((acc, c) => {
      const taxRate = parseFloat(String(c.tax_percentage)) / 100;
      return acc + (c.sales_price * taxRate) * c.quantity;
    }, 0);
  };

  const calculateCartTotal = () => {
    return calculateCartSubtotal() + calculateCartTax();
  };

  // Confirm and Save payment submit
  const handleConfirmPayment = async () => {
    if (cart.length === 0 || !business || !user) return;
    
    setCheckoutLoading(true);
    const finalTotal = calculateCartTotal();
    
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: business.id,
          biller_id: user.id,
          total_amount: finalTotal,
          payment_method: paymentMethod,
          items: cart.map((c) => ({
            item_id: c.id,
            quantity: c.quantity,
            sales_price: c.sales_price,
            tax_percentage: c.tax_percentage
          }))
        })
      });

      const data = await response.json();
      if (!response.ok || data.status === 'error') {
        throw new Error(data.message || 'Failed to complete checkout.');
      }

      setConfirmedOrderId(data.orderId);
      setIsConfirmed(true);
    } catch (err: any) {
      showAlert(err.message || 'Checkout confirmation failed.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleNewBill = () => {
    setCart([]);
    setShowReceiptModal(false);
    setIsConfirmed(false);
    setConfirmedOrderId(null);
    if (business) fetchCatalog(business.id); // Refresh items to reflect stock updates
  };

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Generate UPI Payment URI
  const upiId = business?.upi_id || 'merchant@upi';
  const upiPayName = encodeURIComponent(business?.business_name || 'Biller Shop');
  const upiPayAmount = calculateCartTotal().toFixed(2);
  const upiPayload = `upi://pay?pa=${upiId}&pn=${upiPayName}&am=${upiPayAmount}&cu=INR&tn=Invoice_${confirmedOrderId || 'temp'}`;
  
  // Use public dynamic QR code API to render on screen
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upiPayload)}`;

  return (
    <div className="pos-page">
      <div className="pos-layout">
        
        {/* Left Side: Product Selector Grid */}
        <div className="pos-catalog-panel">
          
          <div className="pos-search-header">
            <input
              type="text"
              placeholder="🔍 Search dishes (e.g. Vadai, Dosa...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pos-search-input"
            />
          </div>

          {loading ? (
            <div className="pos-loading">Loading items catalog...</div>
          ) : error ? (
            <div className="pos-error">{error}</div>
          ) : filteredItems.length === 0 ? (
            <div className="pos-empty-catalog">
              <span className="no-items-emoji">🍽️</span>
              <p>No products match your search.</p>
            </div>
          ) : (
            <div className="products-grid">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleAddToCart(item)}
                  className="product-tile"
                >
                  <span className="tile-name">{item.name}</span>
                  <div className="tile-footer">
                    <span className="tile-price">₹{parseFloat(String(item.sales_price)).toFixed(2)}</span>
                    <span className="tile-badge">+</span>
                  </div>
                </button>
              ))}
            </div>
          )}

        </div>

        {/* Right Side: Cart Panel */}
        <div className="pos-cart-panel">
          <h3 className="cart-header">Current Order</h3>
          
          {cart.length === 0 ? (
            <div className="empty-cart-message">
              <span className="cart-emoji">🛒</span>
              <p>Cart is empty.</p>
              <p className="cart-sub">Tap products on the left to add them to your bill.</p>
            </div>
          ) : (
            <>
              <div className="cart-items-container">
                {cart.map((c) => (
                  <div key={c.id} className="cart-item">
                    <div className="cart-item-details">
                      <span className="cart-item-name">{c.name}</span>
                      <span className="cart-item-price">₹{parseFloat(String(c.sales_price)).toFixed(2)}</span>
                    </div>
                    <div className="cart-qty-controls">
                      <button onClick={() => handleUpdateQty(c.id, -1)} className="qty-btn">-</button>
                      <span className="qty-value">{c.quantity}</span>
                      <button onClick={() => handleAddToCart({ id: c.id, name: c.name, sales_price: c.sales_price, tax_percentage: c.tax_percentage } as Item)} className="qty-btn">+</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="cart-summary">
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>₹{calculateCartSubtotal().toFixed(2)}</span>
                </div>
                <div className="summary-row">
                  <span>GST Tax</span>
                  <span>₹{calculateCartTax().toFixed(2)}</span>
                </div>
                <div className="pos-payment-selector">
                  <span className="selector-title">Select Payment:</span>
                  <div className="selector-options">
                    <button 
                      type="button" 
                      onClick={() => setPaymentMethod('Cash')}
                      className={`payment-opt-btn ${paymentMethod === 'Cash' ? 'active' : ''}`}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ width: '16px', height: '16px' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5h16.5a1.5 1.5 0 011.5 1.5v12a1.5 1.5 0 01-1.5 1.5H3.75a1.5 1.5 0 01-1.5-1.5V6a1.5 1.5 0 011.5-1.5zm0 0V3m16.5 1.5V3M12 11.25a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                      </svg>
                      Cash
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setPaymentMethod('UPI')}
                      className={`payment-opt-btn ${paymentMethod === 'UPI' ? 'active' : ''}`}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ width: '16px', height: '16px' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-6 18.75h12" />
                      </svg>
                      UPI
                    </button>
                  </div>
                </div>

                <div className="summary-row total-row">
                  <span>Total Amount</span>
                  <span>₹{calculateCartTotal().toFixed(2)}</span>
                </div>

                <button 
                  onClick={() => {
                    setShowReceiptModal(true);
                    setIsConfirmed(false);
                    setConfirmedOrderId(null);
                  }} 
                  className="checkout-pay-btn"
                >
                  Generate Bill
                </button>
              </div>
            </>
          )}

        </div>

      </div>

      {/* Checkout Receipt & UPI QR Modal */}
      {showReceiptModal && (
        <div className="modal-backdrop">
          <div className="modal-container receipt-modal">
            
            <div className="receipt-header">
              <h3>{isConfirmed ? 'Invoice Confirmed' : 'Receipt Preview'}</h3>
              <span className="order-id-label">
                {isConfirmed ? `Order #${confirmedOrderId}` : 'Awaiting Payment'}
              </span>
            </div>

            <div className="receipt-body">
              <div className="receipt-store-info">
                <h4>{business?.business_name}</h4>
                <p>{business?.outlet_address}</p>
                <p>Phone: {business?.phone_number}</p>
              </div>

              <div className="receipt-divider"></div>

              <div className="receipt-items">
                {cart.map((c) => (
                  <div key={c.id} className="receipt-item-row">
                    <span>{c.name} x {c.quantity}</span>
                    <span>₹{(c.sales_price * c.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="receipt-divider"></div>

              <div className="receipt-totals">
                <div className="receipt-row">
                  <span>Subtotal:</span>
                  <span>₹{calculateCartSubtotal().toFixed(2)}</span>
                </div>
                <div className="receipt-row">
                  <span>Taxes (GST):</span>
                  <span>₹{calculateCartTax().toFixed(2)}</span>
                </div>
                <div className="receipt-row final-receipt-total">
                  <span>Grand Total:</span>
                  <span>₹{calculateCartTotal().toFixed(2)}</span>
                </div>
                <div className="receipt-row">
                  <span>Paid Via:</span>
                  <span className="receipt-payment-method-badge">{paymentMethod}</span>
                </div>
              </div>

              {/* Conditional Payment Box */}
              {paymentMethod === 'UPI' ? (
                <div className="upi-payment-box">
                  <p className="scan-prompt">{isConfirmed ? 'Payment Complete' : 'Scan QR to pay exactly'}</p>
                  <p className="pay-amount-label">₹{calculateCartTotal().toFixed(2)}</p>
                  
                  {!isConfirmed && (
                    <div className="qr-code-wrapper">
                      <img src={qrCodeUrl} alt="UPI Payment QR Code" className="payment-qr-img" />
                    </div>
                  )}
                  
                  <span className="merchant-upi-label">UPI ID: {upiId}</span>
                </div>
              ) : (
                <div className="cash-payment-box">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ width: '48px', height: '48px', color: '#16a34a', marginBottom: '4px' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5h16.5a1.5 1.5 0 011.5 1.5v12a1.5 1.5 0 01-1.5 1.5H3.75a1.5 1.5 0 01-1.5-1.5V6a1.5 1.5 0 011.5-1.5zm0 0V3m16.5 1.5V3M12 11.25a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                  </svg>
                  <h4>{isConfirmed ? 'Paid via Cash' : 'Cash Payment'}</h4>
                  <p className="cash-amount-received">₹{calculateCartTotal().toFixed(2)} to collect</p>
                </div>
              )}

            </div>

            {isConfirmed ? (
              <div className="bill-saved-status">
                <div className="success-banner">✓ Bill Saved to Database</div>
                <button onClick={handleNewBill} className="primary-button new-bill-btn">
                  Create New Bill
                </button>
              </div>
            ) : (
              <div className="receipt-action-group">
                <button 
                  onClick={handleConfirmPayment} 
                  className="primary-button confirm-payment-btn"
                  disabled={checkoutLoading}
                >
                  {checkoutLoading ? 'Saving...' : 'Confirm Payment & Save'}
                </button>
                <button 
                  onClick={() => setShowReceiptModal(false)} 
                  className="secondary-button cancel-receipt-btn"
                  disabled={checkoutLoading}
                >
                  Cancel & Edit
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Reusable Custom Alert / Confirm Modal */}
      {customAlert && customAlert.show && (
        <div className="modal-backdrop alert-backdrop">
          <div className="modal-container alert-modal-container">
            <div className="alert-modal-header">
              <div className={`alert-icon-circle ${customAlert.type}`}>
                {customAlert.type === 'success' && <span>✓</span>}
                {customAlert.type === 'error' && <span>✕</span>}
                {customAlert.type === 'confirm' && <span>?</span>}
              </div>
              <h3>{customAlert.title}</h3>
            </div>
            <div className="alert-modal-body">
              <p>{customAlert.message}</p>
            </div>
            <div className="alert-modal-actions">
              {customAlert.type === 'confirm' ? (
                <>
                  <button 
                    onClick={() => {
                      if (customAlert.onConfirm) customAlert.onConfirm();
                      setCustomAlert(null);
                    }} 
                    className="primary-button alert-confirm-btn"
                  >
                    Confirm
                  </button>
                  <button 
                    onClick={() => setCustomAlert(null)} 
                    className="secondary-button alert-cancel-btn"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setCustomAlert(null)} 
                  className="primary-button alert-ok-btn"
                >
                  Dismiss
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Pos;
