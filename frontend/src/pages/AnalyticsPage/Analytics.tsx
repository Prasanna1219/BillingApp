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
  
  // Quick range state
  const [activeRange, setActiveRange] = useState<'1' | '7' | '30' | 'custom'>('7');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6); // Default: Last 7 days
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Time Granularity state ('hourly' | 'daily' | 'weekly' | 'monthly')
  const [groupBy, setGroupBy] = useState<'hourly' | 'daily' | 'weekly' | 'monthly'>('daily');

  // Filter Preset Pill Selection ('all' | 'profit' | 'sales' | 'cogs' | 'ingused')
  const [metricPreset, setMetricPreset] = useState<'all' | 'profit' | 'sales' | 'cogs' | 'ingused'>('all');

  // Multi-Series Line Visibility Toggles (Default: All 4 enabled when All Metrics is active)
  const [showSales, setShowSales] = useState(true);
  const [showProfit, setShowProfit] = useState(true);
  const [showCogs, setShowCogs] = useState(true);
  const [showIngUsed, setShowIngUsed] = useState(true);

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
    } else {
      setGroupBy('daily');
    }
  };

  // Handle Preset Selection Pills (e.g. All Metrics, Profit/Loss, Sales, Ingredient Cost, Ingredients Used)
  const handlePresetChange = (preset: 'all' | 'profit' | 'sales' | 'cogs' | 'ingused') => {
    setMetricPreset(preset);
    if (preset === 'all') {
      setShowSales(true);
      setShowProfit(true);
      setShowCogs(true);
      setShowIngUsed(true);
    } else if (preset === 'profit') {
      setShowSales(false);
      setShowProfit(true);
      setShowCogs(false);
      setShowIngUsed(false);
    } else if (preset === 'sales') {
      setShowSales(true);
      setShowProfit(false);
      setShowCogs(false);
      setShowIngUsed(false);
    } else if (preset === 'cogs') {
      setShowSales(false);
      setShowProfit(false);
      setShowCogs(true);
      setShowIngUsed(false);
    } else if (preset === 'ingused') {
      setShowSales(false);
      setShowProfit(false);
      setShowCogs(false);
      setShowIngUsed(true);
    }
  };

  // Format YYYY-MM-DD to simple "09 Aug" format
  const formatDateLabel = (dateStr: string) => {
    if (!dateStr) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [, m, d] = dateStr.split('-');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIdx = parseInt(m, 10) - 1;
      return `${parseInt(d, 10)} ${months[monthIdx] || m}`;
    }
    return dateStr;
  };

  // Smooth Cubic Bezier Spline Curve Builder
  const buildSmoothPath = (pts: Array<{ x: number; y: number }>) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    if (pts.length === 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;

    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? i : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x} ${p2.y}`;
    }
    return d;
  };

  const buildSmoothAreaPath = (pts: Array<{ x: number; y: number }>, baselineY: number) => {
    const lineD = buildSmoothPath(pts);
    if (!lineD) return '';
    return `${lineD} L ${pts[pts.length - 1].x} ${baselineY} L ${pts[0].x} ${baselineY} Z`;
  };

  // Multi-Series Graph Calculation
  const baselineY = 165;
  const chartHeight = 220;
  let pointsSales: Array<{ x: number; y: number; val: number; label: string }> = [];
  let pointsProfit: Array<{ x: number; y: number; val: number; label: string }> = [];
  let pointsCogs: Array<{ x: number; y: number; val: number; label: string }> = [];
  let pointsIngUsed: Array<{ x: number; y: number; val: number; label: string }> = [];

  let maxVal = 100;
  const yTicks = [0, 0.33, 0.66, 1];

  if (data && data.chartData.length > 0) {
    const allVals: number[] = [];
    data.chartData.forEach(d => {
      if (showSales) allVals.push(parseFloat(d.sales));
      if (showProfit) allVals.push(parseFloat(d.profit));
      if (showCogs) allVals.push(parseFloat(d.cogs));
      if (showIngUsed) allVals.push(parseFloat(d.ingredients_used));
    });

    maxVal = Math.max(...allVals, 100);
    const numPoints = Math.max(data.chartData.length - 1, 1);
    const spacing = 750 / numPoints;

    data.chartData.forEach((day, i) => {
      const x = 25 + i * spacing;
      const label = day.date;

      if (showSales) {
        const val = parseFloat(day.sales);
        const y = baselineY - (val / maxVal) * 125;
        pointsSales.push({ x, y, val, label });
      }
      if (showProfit) {
        const val = parseFloat(day.profit);
        const y = baselineY - (Math.max(0, val) / maxVal) * 125;
        pointsProfit.push({ x, y, val, label });
      }
      if (showCogs) {
        const val = parseFloat(day.cogs);
        const y = baselineY - (val / maxVal) * 125;
        pointsCogs.push({ x, y, val, label });
      }
      if (showIngUsed) {
        const val = parseFloat(day.ingredients_used);
        const y = baselineY - (val / maxVal) * 125;
        pointsIngUsed.push({ x, y, val, label });
      }
    });
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
            <p>Track business revenue, margins, and ingredient performance.</p>
          </div>
        </div>
      </div>

      {/* Date Pickers & Range Toolbar */}
      <div className="analytics-controls">
        
        {/* Quick Range Pills */}
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

        {/* Time Granularity Selector */}
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

        {/* Date Input Pickers */}
        <div className="date-pickers-grid">
          <div className="date-input-group">
            <label>Start</label>
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
            <label>End</label>
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
          <p>Calculating sales performance...</p>
        </div>
      ) : error ? (
        <div className="analytics-error">{error}</div>
      ) : (
        <div className="analytics-content">
          
          {/* Preset Metric Selection Pills Bar */}
          <div className="preset-metric-pills-bar">
            <button
              className={`preset-pill ${metricPreset === 'all' ? 'active' : ''}`}
              onClick={() => handlePresetChange('all')}
            >
              All Metrics
            </button>
            <button
              className={`preset-pill ${metricPreset === 'profit' ? 'active' : ''}`}
              onClick={() => handlePresetChange('profit')}
            >
              Profit/Loss
            </button>
            <button
              className={`preset-pill ${metricPreset === 'sales' ? 'active' : ''}`}
              onClick={() => handlePresetChange('sales')}
            >
              Sales
            </button>
            <button
              className={`preset-pill ${metricPreset === 'cogs' ? 'active' : ''}`}
              onClick={() => handlePresetChange('cogs')}
            >
              Ingredient Cost
            </button>
            <button
              className={`preset-pill ${metricPreset === 'ingused' ? 'active' : ''}`}
              onClick={() => handlePresetChange('ingused')}
            >
              Ingredients Used
            </button>
          </div>

          {/* KPI Summary Strip (2x2 Grid on Mobile) */}
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

          {/* MAIN GRAPH CARD */}
          <div className="analytics-main-card">
            
            {/* Card Header: Title + Big Value + Trend % + Options Button */}
            <div className="card-top-header">
              <div>
                <span className="card-sub-header">Performance Overview</span>
                <div className="overview-value-row">
                  <h2 className="overview-big-price">₹{totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</h2>
                  <span className="trend-pct-tag">↑ 12.5%</span>
                </div>
              </div>

              <button className="icon-action-btn" title="More Options">
                <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '20px', height: '20px' }}>
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                </svg>
              </button>
            </div>

            {/* Smooth SVG Wave Graph */}
            {!data || data.chartData.length === 0 ? (
              <div className="empty-chart">No sales data for selected period.</div>
            ) : (
              <div className="chart-scroll-wrapper">
                <svg width="100%" height={chartHeight} viewBox="0 0 800 220" preserveAspectRatio="none" className="analytics-svg-chart">
                  <defs>
                    {/* Indigo Fading Gradient for Sales Wave */}
                    <linearGradient id="salesWaveGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                    </linearGradient>

                    {/* Emerald Fading Gradient for Profit Wave */}
                    <linearGradient id="profitWaveGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>

                    {/* Amber Fading Gradient for Ingredient Cost */}
                    <linearGradient id="cogsWaveGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.20" />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                    </linearGradient>

                    {/* Pink Fading Gradient for Ingredients Used */}
                    <linearGradient id="ingWaveGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ec4899" stopOpacity="0.20" />
                      <stop offset="100%" stopColor="#ec4899" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid Lines */}
                  {yTicks.map((tick) => {
                    const y = baselineY - tick * 125;
                    return (
                      <line key={`ygrid-${tick}`} x1="0" y1={y} x2="800" y2={y} stroke="#f1f5f9" strokeWidth="1" />
                    );
                  })}

                  {/* 1. Sales Wave (Solid Indigo Smooth Curve + Gradient Area Fill) */}
                  {showSales && pointsSales.length > 0 && (
                    <g>
                      <path d={buildSmoothAreaPath(pointsSales, baselineY)} fill="url(#salesWaveGrad)" />
                      <path d={buildSmoothPath(pointsSales)} fill="none" stroke="#6366f1" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
                      {pointsSales.map(p => (
                        <circle key={`sp-${p.x}`} cx={p.x} cy={p.y} r="4" fill="#ffffff" stroke="#6366f1" strokeWidth="2.5" />
                      ))}
                    </g>
                  )}

                  {/* 2. Profit Wave (Dotted Green Smooth Curve + Gradient Area Fill) */}
                  {showProfit && pointsProfit.length > 0 && (
                    <g>
                      <path d={buildSmoothAreaPath(pointsProfit, baselineY)} fill="url(#profitWaveGrad)" />
                      <path d={buildSmoothPath(pointsProfit)} fill="none" stroke="#10b981" strokeWidth="2.8" strokeDasharray="3 3" strokeLinecap="round" strokeLinejoin="round" />
                      {pointsProfit.map(p => (
                        <circle key={`pp-${p.x}`} cx={p.x} cy={p.y} r="4" fill="#ffffff" stroke="#10b981" strokeWidth="2.5" />
                      ))}
                    </g>
                  )}

                  {/* 3. Ingredient Cost Wave (Amber Line) */}
                  {showCogs && pointsCogs.length > 0 && (
                    <g>
                      <path d={buildSmoothAreaPath(pointsCogs, baselineY)} fill="url(#cogsWaveGrad)" />
                      <path d={buildSmoothPath(pointsCogs)} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      {pointsCogs.map(p => (
                        <circle key={`cp-${p.x}`} cx={p.x} cy={p.y} r="3.5" fill="#ffffff" stroke="#f59e0b" strokeWidth="2" />
                      ))}
                    </g>
                  )}

                  {/* 4. Ingredients Used Wave (Pink Line) */}
                  {showIngUsed && pointsIngUsed.length > 0 && (
                    <g>
                      <path d={buildSmoothAreaPath(pointsIngUsed, baselineY)} fill="url(#ingWaveGrad)" />
                      <path d={buildSmoothPath(pointsIngUsed)} fill="none" stroke="#ec4899" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      {pointsIngUsed.map(p => (
                        <circle key={`ip-${p.x}`} cx={p.x} cy={p.y} r="3.5" fill="#ffffff" stroke="#ec4899" strokeWidth="2" />
                      ))}
                    </g>
                  )}

                  {/* X Axis Time Labels Centered Below Waves */}
                  {data.chartData.map((d, i) => {
                    const numPoints = Math.max(data.chartData.length - 1, 1);
                    const spacing = 750 / numPoints;
                    const x = 25 + i * spacing;
                    return (
                      <text key={`xlabel-${i}`} x={x} y={baselineY + 22} textAnchor="middle" className="x-time-label">
                        {formatDateLabel(d.date)}
                      </text>
                    );
                  })}
                </svg>
              </div>
            )}

            {/* Bottom Color Legend Grid (Mobile Responsive 2-Column Layout) */}
            <div className="bottom-centered-legend">
              <button 
                className={`legend-item ${showSales ? 'active' : ''}`}
                onClick={() => setShowSales(!showSales)}
              >
                <span className="dot sales"></span>
                Sales
              </button>

              <button 
                className={`legend-item ${showProfit ? 'active' : ''}`}
                onClick={() => setShowProfit(!showProfit)}
              >
                <span className="dot profit"></span>
                Profit
              </button>

              <button 
                className={`legend-item ${showCogs ? 'active' : ''}`}
                onClick={() => setShowCogs(!showCogs)}
              >
                <span className="dot cogs"></span>
                Ingredient Cost
              </button>

              <button 
                className={`legend-item ${showIngUsed ? 'active' : ''}`}
                onClick={() => setShowIngUsed(!showIngUsed)}
              >
                <span className="dot ingused"></span>
                Ingredients Used
              </button>
            </div>

          </div>

        </div>
      )}
    </div>
  );
};

export default Analytics;
