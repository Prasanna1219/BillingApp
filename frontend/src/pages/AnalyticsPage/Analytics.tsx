import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Analytics.css';

interface ChartItem {
  date: string;
  sales: string;
  profit: string;
  cogs: string;
  ingredients_used: string;
  total?: string;
}

interface AnalyticsData {
  groupBy: string;
  chartData: ChartItem[];
  summary: { count: number; total: string };
  splits: Array<{ payment_method: string; total: string }>;
}

const Analytics: React.FC = () => {
  const navigate = useNavigate();
  const [businessId, setBusinessId] = useState<number | null>(null);
  
  // Date states
  const [activeRange, setActiveRange] = useState<'1' | '7' | '30' | 'custom'>('7');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6); // Default: Last 7 days
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Group By state ('hourly' | 'daily' | 'weekly' | 'monthly')
  const [groupBy, setGroupBy] = useState<'hourly' | 'daily' | 'weekly' | 'monthly'>('daily');

  // Multi-Series Toggle States (User selects which metric lines appear on the graph)
  const [showSales, setShowSales] = useState(true);
  const [showProfit, setShowProfit] = useState(true);
  const [showCogs, setShowCogs] = useState(false);
  const [showIngUsed, setShowIngUsed] = useState(false);

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
  }, [businessId, startDate, endDate, groupBy]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/reports/analytics/${businessId}?startDate=${startDate}&endDate=${endDate}&groupBy=${groupBy}`);
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

    const endStr = end.toISOString().split('T')[0];
    const startStr = start.toISOString().split('T')[0];

    setEndDate(endStr);
    setStartDate(startStr);

    if (days === 1) {
      setGroupBy('hourly');
    } else if (days <= 7) {
      setGroupBy('daily');
    } else {
      setGroupBy('daily');
    }
  };

  // Multi-Series SVG Chart Calculation
  const chartHeight = 220;
  let pointsSales: Array<{ x: number; y: number; val: number; label: string }> = [];
  let pointsProfit: Array<{ x: number; y: number; val: number; label: string }> = [];
  let pointsCogs: Array<{ x: number; y: number; val: number; label: string }> = [];
  let pointsIngUsed: Array<{ x: number; y: number; val: number; label: string }> = [];

  let maxVal = 100;
  let yTicks = [0, 0.25, 0.5, 0.75, 1];

  if (data && data.chartData.length > 0) {
    const allVals: number[] = [];
    data.chartData.forEach(d => {
      if (showSales) allVals.push(parseFloat(d.sales));
      if (showProfit) allVals.push(parseFloat(d.profit));
      if (showCogs) allVals.push(parseFloat(d.cogs));
      if (showIngUsed) allVals.push(parseFloat(d.ingredients_used));
    });

    maxVal = Math.max(...allVals, 100);
    const spacing = Math.max(700 / Math.max(data.chartData.length, 1), 60);

    data.chartData.forEach((day, i) => {
      const x = 55 + i * spacing;
      const label = day.date;

      if (showSales) {
        const val = parseFloat(day.sales);
        const y = 170 - (val / maxVal) * 140;
        pointsSales.push({ x, y, val, label });
      }
      if (showProfit) {
        const val = parseFloat(day.profit);
        const y = 170 - (Math.max(0, val) / maxVal) * 140;
        pointsProfit.push({ x, y, val, label });
      }
      if (showCogs) {
        const val = parseFloat(day.cogs);
        const y = 170 - (val / maxVal) * 140;
        pointsCogs.push({ x, y, val, label });
      }
      if (showIngUsed) {
        const val = parseFloat(day.ingredients_used);
        const y = 170 - (val / maxVal) * 140;
        pointsIngUsed.push({ x, y, val, label });
      }
    });
  }

  const buildPath = (pts: Array<{ x: number; y: number }>) => {
    if (pts.length === 0) return '';
    return `M ${pts[0].x} ${pts[0].y} ` + pts.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
  };

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
            <p>Analyze sales, profit, ingredient costs, and usage trends across time.</p>
          </div>
        </div>
      </div>

      {/* Date Pickers & Grouping Toolbar */}
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

        {/* Time Granularity Selector (Hourly, Daily, Weekly, Monthly) */}
        <div className="group-by-selector-strip">
          <span className="granularity-label">Group By:</span>
          <button 
            className={`granularity-pill ${groupBy === 'hourly' ? 'active' : ''}`}
            onClick={() => setGroupBy('hourly')}
          >
            Hourly
          </button>
          <button 
            className={`granularity-pill ${groupBy === 'daily' ? 'active' : ''}`}
            onClick={() => setGroupBy('daily')}
          >
            Daily
          </button>
          <button 
            className={`granularity-pill ${groupBy === 'weekly' ? 'active' : ''}`}
            onClick={() => setGroupBy('weekly')}
          >
            Weekly
          </button>
          <button 
            className={`granularity-pill ${groupBy === 'monthly' ? 'active' : ''}`}
            onClick={() => setGroupBy('monthly')}
          >
            Monthly
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
                const val = e.target.value;
                setStartDate(val);
                setActiveRange('custom');
                if (val === endDate) setGroupBy('hourly');
              }} 
            />
          </div>
          <div className="date-input-group">
            <label>End Date</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => {
                const val = e.target.value;
                setEndDate(val);
                setActiveRange('custom');
                if (startDate === val) setGroupBy('hourly');
              }} 
            />
          </div>
        </div>

      </div>

      {loading ? (
        <div className="analytics-loading">
          <div className="analytics-spinner"></div>
          <p>Calculating multi-series analytics...</p>
        </div>
      ) : error ? (
        <div className="analytics-error">{error}</div>
      ) : (
        <div className="analytics-content">
          
          {/* Summary KPIs */}
          <div className="analytics-kpi-grid">
            
            {/* KPI 1: Total Revenue (Indigo Highlight) */}
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

          {/* Multi-Metric Graph Section */}
          <div className="analytics-chart-card">
            
            <div className="chart-card-header">
              <div>
                <h3>Multi-Metric Trend Graph</h3>
                <span className="chart-range-badge">
                  {groupBy.toUpperCase()} view: {startDate} to {endDate}
                </span>
              </div>

              {/* Metric Line Color Legend Toggles */}
              <div className="metric-legend-toggles">
                
                {/* 1. Sales Amount (Violet #6366f1) */}
                <button 
                  className={`legend-toggle-pill sales ${showSales ? 'active' : ''}`}
                  onClick={() => setShowSales(!showSales)}
                >
                  <span className="legend-dot sales"></span>
                  Sales Amount
                </button>

                {/* 2. Profit (Green #10b981) */}
                <button 
                  className={`legend-toggle-pill profit ${showProfit ? 'active' : ''}`}
                  onClick={() => setShowProfit(!showProfit)}
                >
                  <span className="legend-dot profit"></span>
                  Net Profit
                </button>

                {/* 3. Ingredient Cost (Amber #f59e0b) */}
                <button 
                  className={`legend-toggle-pill cogs ${showCogs ? 'active' : ''}`}
                  onClick={() => setShowCogs(!showCogs)}
                >
                  <span className="legend-dot cogs"></span>
                  Ingredient Cost
                </button>

                {/* 4. Ingredient Used (Pink #ec4899) */}
                <button 
                  className={`legend-toggle-pill ingused ${showIngUsed ? 'active' : ''}`}
                  onClick={() => setShowIngUsed(!showIngUsed)}
                >
                  <span className="legend-dot ingused"></span>
                  Ingredients Used
                </button>

              </div>
            </div>

            {!data || data.chartData.length === 0 ? (
              <div className="empty-chart">No sales records found for the selected period.</div>
            ) : (
              <div className="chart-scroll-wrapper">
                <svg width={Math.max(650, data.chartData.length * 70 + 80)} height={chartHeight} className="analytics-svg-chart">
                  
                  {/* Grid Lines */}
                  {yTicks.map((tick) => {
                    const y = 170 - tick * 140;
                    return (
                      <line key={`ygrid-${tick}`} x1="50" y1={y} x2={Math.max(650, data.chartData.length * 70 + 80)} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                    );
                  })}

                  {/* Y Axis Labels */}
                  {yTicks.map((tick) => {
                    const val = tick * maxVal;
                    const y = 170 - tick * 140;
                    return (
                      <text key={tick} x="45" y={y + 4} className="y-axis-label" textAnchor="end">
                        ₹{val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(0)}
                      </text>
                    );
                  })}

                  {/* Metric Line 1: Sales Amount (Violet #6366f1) */}
                  {showSales && pointsSales.length > 0 && (
                    <g>
                      <path d={buildPath(pointsSales)} fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      {pointsSales.map(p => (
                        <g key={`s-${p.x}`}>
                          <circle cx={p.x} cy={p.y} r="4.5" fill="#ffffff" stroke="#6366f1" strokeWidth="2.5" />
                          <text x={p.x} y={p.y - 8} textAnchor="middle" className="chart-hover-val sales">₹{p.val.toFixed(0)}</text>
                        </g>
                      ))}
                    </g>
                  )}

                  {/* Metric Line 2: Net Profit (Green #10b981) */}
                  {showProfit && pointsProfit.length > 0 && (
                    <g>
                      <path d={buildPath(pointsProfit)} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5,2" />
                      {pointsProfit.map(p => (
                        <g key={`p-${p.x}`}>
                          <circle cx={p.x} cy={p.y} r="4.5" fill="#ffffff" stroke="#10b981" strokeWidth="2.5" />
                          <text x={p.x} y={p.y - 8} textAnchor="middle" className="chart-hover-val profit">₹{p.val.toFixed(0)}</text>
                        </g>
                      ))}
                    </g>
                  )}

                  {/* Metric Line 3: Ingredient Cost (Amber #f59e0b) */}
                  {showCogs && pointsCogs.length > 0 && (
                    <g>
                      <path d={buildPath(pointsCogs)} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      {pointsCogs.map(p => (
                        <g key={`c-${p.x}`}>
                          <circle cx={p.x} cy={p.y} r="4" fill="#ffffff" stroke="#f59e0b" strokeWidth="2.5" />
                          <text x={p.x} y={p.y - 8} textAnchor="middle" className="chart-hover-val cogs">₹{p.val.toFixed(0)}</text>
                        </g>
                      ))}
                    </g>
                  )}

                  {/* Metric Line 4: Ingredients Used (Pink #ec4899) */}
                  {showIngUsed && pointsIngUsed.length > 0 && (
                    <g>
                      <path d={buildPath(pointsIngUsed)} fill="none" stroke="#ec4899" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      {pointsIngUsed.map(p => (
                        <g key={`u-${p.x}`}>
                          <circle cx={p.x} cy={p.y} r="4" fill="#ffffff" stroke="#ec4899" strokeWidth="2.5" />
                          <text x={p.x} y={p.y - 8} textAnchor="middle" className="chart-hover-val ingused">{p.val.toFixed(1)}</text>
                        </g>
                      ))}
                    </g>
                  )}

                  {/* X Axis Labels */}
                  {data.chartData.map((d, i) => {
                    const spacing = Math.max(700 / Math.max(data.chartData.length, 1), 60);
                    const x = 55 + i * spacing;
                    return (
                      <text key={`x-${i}`} x={x} y={195} textAnchor="middle" className="x-axis-label">{d.date}</text>
                    );
                  })}

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
