import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

interface DashboardData {
  today: {
    ordersCount: number;
    revenue: number;
    cash: number;
    upi: number;
  };
  overall: {
    revenue: number;
    cogs: number;
    totalSpent: number;
    netProfit: number;
  };
  weeklySales: Array<{
    date: string;
    total: string;
  }>;
  lifespans: Array<{
    id: number;
    name: string;
    unit: string;
    purchase_cost: number;
    quantity_purchased: number;
    purchase_date: string;
    days_lasted: number | null;
  }>;
  lowStock: Array<{
    id: number;
    name: string;
    unit: string;
    remaining_quantity: number;
    quantity_purchased: number;
  }>;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

    const business = JSON.parse(bizStr);
    fetchReport(business.id);
  }, [navigate]);

  const fetchReport = async (businessId: number) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/reports/dashboard/${businessId}`);
      const resData = await response.json();
      if (!response.ok || resData.status === 'error') {
        throw new Error(resData.message || 'Failed to fetch reports.');
      }
      setData(resData);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="dashboard-loading">Calculating business analytics...</div>;
  }

  if (error || !data) {
    return <div className="dashboard-error">{error || 'No report data found.'}</div>;
  }

  // Calculate split percentages
  const todayTotal = data.today.revenue;
  const cashPercent = todayTotal > 0 ? (data.today.cash / todayTotal) * 100 : 0;
  const upiPercent = todayTotal > 0 ? (data.today.upi / todayTotal) * 100 : 0;

  // Render Circle Progress Ring helper
  const renderCircleProgress = (percent: number, color: string, label: React.ReactNode, value: number) => {
    const radius = 24;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (Math.min(100, Math.max(0, percent)) / 100) * circumference;

    return (
      <div className="radial-progress-item">
        <div className="svg-ring-wrapper">
          <svg width="64" height="64" viewBox="0 0 64 64" className="progress-ring">
            <circle cx="32" cy="32" r={radius} className="ring-bg" />
            <circle 
              cx="32" 
              cy="32" 
              r={radius} 
              className="ring-fill" 
              stroke={color} 
              strokeDasharray={circumference} 
              strokeDashoffset={offset} 
            />
            <text x="32" y="37" textAnchor="middle" className="ring-text">
              {percent.toFixed(0)}%
            </text>
          </svg>
        </div>
        <div className="ring-meta">
          <span className="ring-label">{label}</span>
          <span className="ring-value">₹{value.toFixed(2)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-scrollable-container">
        
        <div className="dashboard-title-header">
          <h1>Analytics Dashboard</h1>
          <p>Real-time overview of sales margins, P&L, and ingredient lifespans.</p>
        </div>

        {/* 1. 2x2 Pastel KPI Card Section (Reordered styling) */}
        <div className="overall-metrics-grid redesigned-pastel-grid">
          
          {/* Card 1: Revenue (Pink) */}
          <div className="metric-card pastel-card pink">
            <div className="card-icon-badge">
              <svg className="card-badge-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2" />
              </svg>
            </div>
            <span className="card-value">₹{data.overall.revenue.toFixed(0)}</span>
            <span className="card-label">Total Sales</span>
            <span className="card-sub-info">+8% from yesterday</span>
          </div>

          {/* Card 2: Orders (Yellow) */}
          <div className="metric-card pastel-card yellow">
            <div className="card-icon-badge">
              <svg className="card-badge-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h10a2 2 0 012 2v14a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="card-value">{data.today.ordersCount}</span>
            <span className="card-label">Total Order</span>
            <span className="card-sub-info">+5% from yesterday</span>
          </div>

          {/* Card 3: Inventory Purchases (Purple) */}
          <div className="metric-card pastel-card purple">
            <div className="card-icon-badge">
              <svg className="card-badge-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <span className="card-value">₹{data.overall.totalSpent.toFixed(0)}</span>
            <span className="card-label">Inventory Purchases</span>
            <span className="card-sub-info">₹{data.overall.cogs.toFixed(0)} consumed in sales</span>
          </div>

          {/* Card 4: Net Profit (Green) */}
          <div className={`metric-card pastel-card green ${data.overall.netProfit >= 0 ? 'positive' : 'negative'}`}>
            <div className="card-icon-badge">
              <svg className="card-badge-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <span className="card-value">
              {data.overall.netProfit >= 0 ? '+' : '-'}₹{Math.abs(data.overall.netProfit).toFixed(0)}
            </span>
            <span className="card-label">Net Profit</span>
            <span className="card-sub-info">Sales minus consumed stock</span>
          </div>

        </div>

        {/* 2. Today's Summary & Line Chart */}
        <div className="today-analytics-section">
          
          {/* Radial splits */}
          <div className="today-sales-card">
            <h3>Today's Payments</h3>
            <div className="today-kpi-row">
              <div className="today-kpi">
                <span className="kpi-label">Sales</span>
                <span className="kpi-value">₹{todayTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="radial-splits-container">
              {renderCircleProgress(
                cashPercent, 
                '#e57c23', 
                <span className="split-label-text">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="split-icon-svg" style={{ width: '14px', height: '14px', color: '#e57c23' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5h16.5a1.5 1.5 0 011.5 1.5v12a1.5 1.5 0 01-1.5 1.5H3.75a1.5 1.5 0 01-1.5-1.5V6a1.5 1.5 0 011.5-1.5zm0 0V3m16.5 1.5V3M12 11.25a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                  </svg>
                  Cash
                </span>, 
                data.today.cash
              )}
              {renderCircleProgress(
                upiPercent, 
                '#6366f1', 
                <span className="split-label-text">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="split-icon-svg" style={{ width: '14px', height: '14px', color: '#6366f1' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-6 18.75h12" />
                  </svg>
                  UPI
                </span>, 
                data.today.upi
              )}
            </div>
          </div>

          {/* Link to new Analytics Page */}
          <div className="sales-chart-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '40px 20px', gap: '16px' }}>
            <div className="card-icon-badge" style={{ background: '#e0e7ff', color: '#4f46e5', width: '56px', height: '56px' }}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ width: '28px', height: '28px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </div>
            <h3>Advanced Analytics</h3>
            <p style={{ color: '#64748b', margin: 0, fontSize: '14px', maxWidth: '250px' }}>Explore detailed sales trends, date-filtered metrics, and historical performance.</p>
            <button onClick={() => navigate('/analytics')} className="primary-button" style={{ marginTop: '10px' }}>
              Open Analytics Dashboard
            </button>
          </div>

        </div>

        {/* 3. Ingredient Stock Alerts & Lifespan */}
        <div className="inventory-reports-section">
          
          {/* Low Stock Alerts */}
          <div className="stock-report-card">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ width: '20px', height: '20px', color: '#f59e0b' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Low Stock Ingredients
            </h3>
            <div className="report-list-container">
              {data.lowStock.length === 0 ? (
                <div className="healthy-stock-message">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '20px', height: '20px', color: '#16a34a' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <p>All ingredient stocks are healthy.</p>
                </div>
              ) : (
                <div className="report-list">
                  {data.lowStock.map((ing) => (
                    <div key={ing.id} className="stock-alert-item">
                      <div className="alert-meta">
                        <span className="alert-name">{ing.name}</span>
                        <span className="alert-qty-desc">
                          Remaining: {ing.remaining_quantity} {ing.unit}
                        </span>
                      </div>
                      <span className="alert-badge">
                        Under 20%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Ingredient Lifespan Log */}
          <div className="stock-report-card">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ width: '20px', height: '20px', color: '#0369a1' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Ingredient Lifespan Log
            </h3>
            <div className="report-list-container">
              {data.lifespans.length === 0 ? (
                <div className="healthy-stock-message">
                  <p>No batches fully consumed yet.</p>
                </div>
              ) : (
                <div className="report-list">
                  {data.lifespans.map((ing) => (
                    <div key={ing.id} className="lifespan-log-item">
                      <div className="lifespan-meta">
                        <span className="lifespan-name">{ing.name}</span>
                        <span className="lifespan-purchase">
                          Purchased: {ing.quantity_purchased} {ing.unit} (₹{parseFloat(String(ing.purchase_cost)).toFixed(0)})
                        </span>
                        <span className="lifespan-date">Bought: {ing.purchase_date.split('T')[0]}</span>
                      </div>
                      <div className="lifespan-duration-tag">
                        Lasted: {ing.days_lasted || 1} {ing.days_lasted === 1 ? 'day' : 'days'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default Dashboard;
