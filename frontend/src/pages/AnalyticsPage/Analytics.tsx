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
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  };

  // SVG Chart Logic
  let points: Array<{ x: number; y: number; label: string; amount: number }> = [];
  let maxSales = 0;
  let chartHeight = 250;
  let linePath = '';
  let areaPath = '';
  let yTicks = [0, 0.25, 0.5, 0.75, 1];

  if (data && data.chartData.length > 0) {
    maxSales = Math.max(...data.chartData.map(d => parseFloat(d.total)), 0) || 1000;
    
    // Dynamic X spacing based on number of points
    const spacing = Math.max(800 / (data.chartData.length + 1), 50); 
    
    points = data.chartData.map((day, i) => {
      const amount = parseFloat(day.total);
      const x = 60 + i * spacing;
      const y = 200 - (amount / maxSales) * 160; // Max height is 160px
      const parts = day.date.split('-');
      const label = `${parts[2]}/${parts[1]}`;
      return { x, y, label, amount };
    });

    if (points.length > 0) {
      linePath = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
      areaPath = `M ${points[0].x} 200 L ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ') + ` L ${points[points.length - 1].x} 200 Z`;
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
      <div className="analytics-header">
        <h1>Sales Analytics</h1>
        <p>Analyze your business performance over custom date ranges.</p>
      </div>

      <div className="analytics-controls">
        <div className="date-pickers">
          <div className="date-input-group">
            <label>Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <span className="date-sep">to</span>
          <div className="date-input-group">
            <label>End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>
        <div className="quick-ranges">
          <button onClick={() => setQuickRange(1)}>Today</button>
          <button onClick={() => setQuickRange(7)}>Last 7 Days</button>
          <button onClick={() => setQuickRange(30)}>Last 30 Days</button>
        </div>
      </div>

      {loading ? (
        <div className="analytics-loading">Loading report data...</div>
      ) : error ? (
        <div className="analytics-error">{error}</div>
      ) : (
        <div className="analytics-content">
          
          {/* Summary KPIs */}
          <div className="analytics-kpi-row">
            <div className="kpi-card highlight">
              <h4>Total Revenue</h4>
              <h2>₹{totalRevenue.toFixed(2)}</h2>
              <span>{data?.summary.count} Orders completed</span>
            </div>
            <div className="kpi-card">
              <h4>Cash Sales</h4>
              <h2>₹{cashTotal.toFixed(2)}</h2>
            </div>
            <div className="kpi-card">
              <h4>UPI Sales</h4>
              <h2>₹{upiTotal.toFixed(2)}</h2>
            </div>
          </div>

          {/* Large Trend Chart */}
          <div className="analytics-chart-container">
            <h3>Revenue Trend</h3>
            {points.length === 0 ? (
              <div className="empty-chart">No sales data for the selected period.</div>
            ) : (
              <div className="chart-scroll-wrapper">
                <svg width={Math.max(800, points.length * 60 + 100)} height={chartHeight} className="analytics-svg-chart">
                  <defs>
                    <linearGradient id="chart-grad-large" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {/* Grid Lines */}
                  {points.map((p) => (
                    <line key={`grid-${p.x}`} x1={p.x} y1={20} x2={p.x} y2={200} stroke="#f1f5f9" strokeWidth="1" />
                  ))}

                  {/* Y Axis Labels */}
                  {yTicks.map((tick) => {
                    const val = tick * maxSales;
                    const y = 200 - tick * 160;
                    return (
                      <text key={tick} x="45" y={y + 4} className="y-axis-label" textAnchor="end">
                        ₹{val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(0)}
                      </text>
                    );
                  })}

                  <path d={areaPath} fill="url(#chart-grad-large)" />
                  <path d={linePath} fill="none" stroke="#8b5cf6" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

                  {/* Data Points and X Axis Labels */}
                  {points.map((p) => (
                    <g key={p.x}>
                      <circle cx={p.x} cy={p.y} r="5" fill="#fff" stroke="#8b5cf6" strokeWidth="2.5" />
                      <text x={p.x} y={230} textAnchor="middle" className="x-axis-label">{p.label}</text>
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
