import { useLocation, useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = location.state?.user;
  const business = location.state?.business;

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
          <button className="nav-btn active">Dashboard</button>
          <button className="nav-btn" onClick={() => alert('Coming soon: POS')}>Point of Sale</button>
          <button className="nav-btn" onClick={() => alert('Coming soon: Inventory')}>Inventory</button>
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
        <h1 style={{ marginBottom: '8px' }}>Welcome back, {user.username || user.phone_number}!</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Here's what's happening at {business.business_name} today.</p>
        
        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '40px' }}>
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid var(--border)' }}>
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>Today's Sales</h3>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--text-main)' }}>₹ 0.00</div>
          </div>
          
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid var(--border)' }}>
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>Today's Orders</h3>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--text-main)' }}>0</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', gap: '16px' }}>
          <button className="btn-primary" style={{ width: 'auto', padding: '16px 32px' }}>+ New Bill (POS)</button>
          <button className="btn-primary" style={{ width: 'auto', padding: '16px 32px', backgroundColor: 'var(--bg-selected)', color: 'var(--text-main)' }}>+ Add Item</button>
        </div>
      </main>

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
