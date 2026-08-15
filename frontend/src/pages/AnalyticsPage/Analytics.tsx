import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Analytics.css';

interface AnalyticsData {
  chartData: Array<{ date: string; total: string }>;
  summary: { count: number; total: string };
  splits: Array<{ payment_method: string; total: string }>;
}

const Analytics: React.FC = () => {
  const navigate = useNavigate();
  const [businessId, setBusinessId] = useState<number | null>(null);
  
  // Quick range state: '1' | '7' | '30' | 'custom'
  const [activeRange, setActiveRange] = useState<'1' | '7' | '30' | 'custom'>('7');

  // Date states
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6); // Default: Last 7 days
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    const bizStr = localStorage.getItem('session_business');
    if (!bizStr) {
      navigate('/onboarding', { replace: true });
      return;
    }
    const business = JSON.parse(bizStr);
    setBusinessId(business.id);
  }, [navigate]);

  useEffect(() => {
    if (businessId && startDate && endDate) {
      fetchAnalytics();
    }
  }, [businessId, startDate, endDate]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/reports/analytics/${businessId}?startDate=${startDate}&endDate=${endDate}`);
      const resData = await res.json();
      if (!res.ok || resData.status === 'error') throw new Error(resData.message);
      setData(resData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch analytics.');
    } finally {
      setLoading(false);
    }
  };

  const setQuickRange = (days: number) => {
    setActiveRange(String(days) as any);
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  };

  // SVG Chart Logic
  let points: Array<{ x: number; y: number; label: string; amount: number }> = [];
  let maxSales = 0;
  let chartHeight = 220;
  let linePath = '';
  let areaPath = '';
  let yTicks = [0, 0.25, 0.5, 0.75, 1];

  if (data && data.chartData.length > 0) {
    maxSales = Math.max(...data.chartData.map(d => parseFloat(d.total)), 0) || 1000;
    
    // Dynamic X spacing based on number of points
    const spacing = Math.max(700 / Math.max(data.chartData.length, 1), 60); 
    
    points = data.chartData.map((day, i) => {
      const amount = parseFloat(day.total);
      const x = 50 + i * spacing;
      const y = 170 - (amount / maxSales) * 140; // Max height is 140px
      const parts = day.date.split('-');
      const label = `${parts[2]}/${parts[1]}`;
      return { x, y, label, amount };
    });

    if (points.length > 0) {
      linePath = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
      areaPath = `M ${points[0].x} 170 L ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ') + ` L ${points[points.length - 1].x} 170 Z`;
    }
  }

  const totalRevenue = data ? parseFloat(data.summary.total) : 0;
  let cashTotal = 0;
  let upiTotal = 0;
  if (data) {
    data.splits.forEach(s => {
      if (s.payment_method === 'Cash') cashTotal = parseFloat(s.total);
      if (s.payment_method === 'UPI') upiTotal = parseFloat(s.total);
    });
  }

  return (
    <div className="analytics-page">
      
      {/* Header */}
      <div className="analytics-header">
        <div className="title-row">
          <button onClick={() => navigate('/dashboard')} className="back-btn" title="Back to Dashboard">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <div>
            <h1>Sales Analytics</h1>
            <p>Filter revenue, order volume, and payment channels by date.</p>
          </div>
        </div>
      </div>

      {/* Date Pickers & Range Toolbar */}
      <div className="analytics-controls">
        
        {/* Quick Filter Pills */}
        <div className="quick-ranges-strip">
          <button 
            className={`range-pill ${activeRange === '1' ? 'active' : ''}`}
            onClick={() => setQuickRange(1)}
          >
            Today
          </button>
          <button 
            className={`range-pill ${activeRange === '7' ? 'active' : ''}`}
            onClick={() => setQuickRange(7)}
          >
            Last 7 Days
          </button>
          <button 
            className={`range-pill ${activeRange === '30' ? 'active' : ''}`}
            onClick={() => setQuickRange(30)}
          >
            Last 30 Days
          </button>
        </div>

        {/* Date Pickers Grid */}
        <div className="date-pickers-grid">
          <div className="date-input-group">
            <label>Start Date</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={e => {
                setStartDate(e.target.value);
                setActiveRange('custom');
              }} 
            />
          </div>
          <div className="date-input-group">
            <label>End Date</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => {
                setEndDate(e.target.value);
                setActiveRange('custom');
              }} 
            />
          </div>
        </div>

      </div>

      {loading ? (
        <div className="analytics-loading">
          <div className="analytics-spinner"></div>
          <p>Calculating sales performance...</p>
        </div>
      ) : error ? (
        <div className="analytics-error">{error}</div>
      ) : (
        <div className="analytics-content">
          
          {/* Summary KPIs (2x2 Grid on Mobile) */}
          <div className="analytics-kpi-grid">
            
            {/* KPI 1: Total Revenue (Purple Highlight) */}
            <div className="kpi-card highlight-purple">
              <div className="kpi-card-header">
                <span className="kpi-card-title">Total Revenue</span>
                <div className="kpi-icon-badge purple">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-6h6m4.5 0a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z" />
                  </svg>
                </div>
              </div>
              <h2 className="kpi-card-value">₹{totalRevenue.toFixed(2)}</h2>
              <span className="kpi-sub-tag">{data?.summary.count || 0} Orders Completed</span>
            </div>

            {/* KPI 2: Total Orders */}
            <div className="kpi-card teal">
              <div className="kpi-card-header">
                <span className="kpi-card-title">Total Orders</span>
                <div className="kpi-icon-badge teal">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h10a2 2 0 012 2v14a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <h2 className="kpi-card-value">{data?.summary.count || 0}</h2>
              <span className="kpi-sub-text">Paid Transactions</span>
            </div>

            {/* KPI 3: Cash Sales */}
            <div className="kpi-card amber">
              <div className="kpi-card-header">
                <span className="kpi-card-title">Cash Sales</span>
                <div className="kpi-icon-badge amber">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5h16.5a1.5 1.5 0 011.5 1.5v12a1.5 1.5 0 01-1.5 1.5H3.75a1.5 1.5 0 01-1.5-1.5V6a1.5 1.5 0 011.5-1.5zm0 0V3m16.5 1.5V3M12 11.25a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                  </svg>
                </div>
              </div>
              <h2 className="kpi-card-value">₹{cashTotal.toFixed(2)}</h2>
              <span className="kpi-sub-text">
                {totalRevenue > 0 ? `${((cashTotal / totalRevenue) * 100).toFixed(0)}% of total` : '0%'}
              </span>
            </div>

            {/* KPI 4: UPI Sales */}
            <div className="kpi-card indigo">
              <div className="kpi-card-header">
                <span className="kpi-card-title">UPI Sales</span>
                <div className="kpi-icon-badge indigo">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-6 18.75h12" />
                  </svg>
                </div>
              </div>
              <h2 className="kpi-card-value">₹{upiTotal.toFixed(2)}</h2>
              <span className="kpi-sub-text">
                {totalRevenue > 0 ? `${((upiTotal / totalRevenue) * 100).toFixed(0)}% of total` : '0%'}
              </span>
            </div>

          </div>

          {/* Revenue Trend Chart Card */}
          <div className="analytics-chart-card">
            <div className="chart-card-header">
              <h3>Daily Revenue Trend</h3>
              <span className="chart-range-badge">{startDate} to {endDate}</span>
            </div>

            {points.length === 0 ? (
              <div className="empty-chart">No sales records found for the selected dates.</div>
            ) : (
              <div className="chart-scroll-wrapper">
                <svg width={Math.max(600, points.length * 70 + 80)} height={chartHeight} className="analytics-svg-chart">
                  <defs>
                    <linearGradient id="chart-grad-indigo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid Lines */}
                  {yTicks.map((tick) => {
                    const y = 170 - tick * 140;
                    return (
                      <line key={`ygrid-${tick}`} x1="45" y1={y} x2={Math.max(600, points.length * 70 + 80)} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                    );
                  })}

                  {/* Y Axis Labels */}
                  {yTicks.map((tick) => {
                    const val = tick * maxSales;
                    const y = 170 - tick * 140;
                    return (
                      <text key={tick} x="40" y={y + 4} className="y-axis-label" textAnchor="end">
                        ₹{val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(0)}
                      </text>
                    );
                  })}

                  <path d={areaPath} fill="url(#chart-grad-indigo)" />
                  <path d={linePath} fill="none" stroke="#6366f1" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />

                  {/* Data Points & X Labels */}
                  {points.map((p) => (
                    <g key={p.x} className="chart-point-group">
                      <circle cx={p.x} cy={p.y} r="5" fill="#ffffff" stroke="#6366f1" strokeWidth="2.5" />
                      <text x={p.x} y={195} textAnchor="middle" className="x-axis-label">{p.label}</text>
                      <text x={p.x} y={p.y - 10} textAnchor="middle" className="chart-hover-val">₹{p.amount.toFixed(0)}</text>
                    </g>
                  ))}
                </svg>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};

export default Analytics;
