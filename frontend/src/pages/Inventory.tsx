import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface Item {
  id: number;
  name: string;
  sales_price: string;
  tax_percentage: string;
  price_includes_tax: number;
  current_stock: number;
}

export default function Inventory() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const stateUser = location.state?.user;
  const localUserStr = localStorage.getItem('session_user');
  const user = stateUser || (localUserStr ? JSON.parse(localUserStr) : null);

  const stateBusiness = location.state?.business;
  const localBusinessStr = localStorage.getItem('session_business');
  const business = stateBusiness || (localBusinessStr ? JSON.parse(localBusinessStr) : null);

  const [items, setItems] = useState<Item[]>([]);
  const [showModal, setShowModal] = useState(false);
  
  // New Item Form State
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemTax, setNewItemTax] = useState(business?.tax_slab || '0');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (business?.id) {
      fetchItems();
    }
  }, [business?.id]);

  const fetchItems = async () => {
    try {
      const res = await fetch(`/api/items/${business.id}`);
      const data = await res.json();
      if (data.status === 'success') {
        setItems(data.items);
      }
    } catch (err) {
      console.error('Failed to fetch items', err);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: business.id,
          name: newItemName,
          sales_price: newItemPrice,
          tax_percentage: newItemTax,
          price_includes_tax: false
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setShowModal(false);
        setNewItemName('');
        setNewItemPrice('');
        fetchItems(); // Refresh list
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Failed to add item');
    }
    setLoading(false);
  };

  if (!user || !business) {
    return <div style={{ padding: '20px' }}>Access Denied. Please login.</div>;
  }

  return (
    <div style={{ backgroundColor: 'var(--bg-element)', minHeight: '100vh', display: 'flex' }}>
      
      {/* Sidebar Navigation */}
      <aside style={{ width: '250px', backgroundColor: 'var(--primary-dark)', color: 'white', padding: '20px', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ color: 'white', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '16px', marginBottom: '24px' }}>
          {business.business_name}
        </h2>
        
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button className="nav-btn" onClick={() => navigate('/dashboard', { state: { user, business } })}>Dashboard</button>
          <button className="nav-btn" onClick={() => alert('Coming soon: POS')}>Point of Sale</button>
          <button className="nav-btn active">Inventory</button>
          <button className="nav-btn" onClick={() => alert('Coming soon: Customers')}>Customers</button>
        </nav>

        <div style={{ marginTop: 'auto' }}>
          <button onClick={() => navigate('/login')} style={{ width: '100%', padding: '10px', backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h1>Inventory Items</h1>
          <button className="btn-primary" style={{ width: 'auto' }} onClick={() => setShowModal(true)}>+ Add New Item</button>
        </div>
        
        {/* Items Table */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: 'var(--bg-element)' }}>
              <tr>
                <th style={{ textAlign: 'left', padding: '16px', borderBottom: '1px solid var(--border)' }}>Item Name</th>
                <th style={{ textAlign: 'left', padding: '16px', borderBottom: '1px solid var(--border)' }}>Price (₹)</th>
                <th style={{ textAlign: 'left', padding: '16px', borderBottom: '1px solid var(--border)' }}>Tax (%)</th>
                <th style={{ textAlign: 'left', padding: '16px', borderBottom: '1px solid var(--border)' }}>Stock</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No items added yet. Click "+ Add New Item" to start.
                  </td>
                </tr>
              ) : (
                items.map(item => (
                  <tr key={item.id}>
                    <td style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>{item.name}</td>
                    <td style={{ padding: '16px', borderBottom: '1px solid var(--border)', fontWeight: 'bold' }}>{item.sales_price}</td>
                    <td style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>{item.tax_percentage}%</td>
                    <td style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>{item.current_stock}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Add Item Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '12px', width: '100%', maxWidth: '400px' }}>
            <h2 style={{ marginBottom: '24px' }}>Add New Item</h2>
            <form onSubmit={handleAddItem}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Item Name</label>
                <input type="text" className="input-field" value={newItemName} onChange={e => setNewItemName(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Price (₹)</label>
                  <input type="number" step="0.01" className="input-field" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Tax Slab (%)</label>
                  <input type="number" step="0.01" className="input-field" value={newItemTax} onChange={e => setNewItemTax(e.target.value)} />
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
                <button type="button" className="btn-primary" style={{ backgroundColor: 'var(--bg-element)', color: 'var(--text-main)' }} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Item'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Embedded CSS for nav-btn just for this component */}
      <style>{`
        .nav-btn {
          background: transparent;
          color: rgba(255,255,255,0.7);
          border: none;
          text-align: left;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
          transition: 0.2s;
        }
        .nav-btn:hover {
          background: rgba(255,255,255,0.1);
          color: white;
        }
        .nav-btn.active {
          background: var(--primary);
          color: white;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
}
