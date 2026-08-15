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

  // Filter Preset Pill Selection ('all' | 'profit' | 'sales' | 'orders' | 'cogs' | 'ingused')
  const [metricPreset, setMetricPreset] = useState<'all' | 'profit' | 'sales' | 'orders' | 'cogs' | 'ingused'>('all');

  // Multi-Series Line Visibility Toggles
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
    } else {
      setGroupBy('daily');
    }
  };

  // Handle Preset Selection Pills (e.g. All Metrics, Profit/Loss, Sales, Orders)
  const handlePresetChange = (preset: 'all' | 'profit' | 'sales' | 'orders' | 'cogs' | 'ingused') => {
    setMetricPreset(preset);
    if (preset === 'all') {
      setShowSales(true);
      setShowProfit(true);
      setShowCogs(false);
      setShowIngUsed(false);
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
    } else if (preset === 'orders') {
      setShowSales(true);
      setShowProfit(true);
      setShowCogs(false);
      setShowIngUsed(false);
    }
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
  const baselineY = 175;
  const chartHeight = 230;
  let pointsSales: Array<{ x: number; y: number; val: number; label: string }> = [];
  let pointsProfit: Array<{ x: number; y: number; val: number; label: string }> = [];
  let pointsCogs: Array<{ x: number; y: number; val: number; label: string }> = [];
  let pointsIngUsed: Array<{ x: number; y: number; val: number; label: string }> = [];

  let maxVal = 100;

  if (data && data.chartData.length > 0) {
    const allVals: number[] = [];
    data.chartData.forEach(d => {
      if (showSales) allVals.push(parseFloat(d.sales));
      if (showProfit) allVals.push(parseFloat(d.profit));
      if (showCogs) allVals.push(parseFloat(d.cogs));
      if (showIngUsed) allVals.push(parseFloat(d.ingredients_used));
    });

    maxVal = Math.max(...allVals, 100);
    const spacing = Math.max(620 / Math.max(data.chartData.length, 1), 65);

    data.chartData.forEach((day, i) => {
      const x = 45 + i * spacing;
      const label = day.date;

      if (showSales) {
        const val = parseFloat(day.sales);
        const y = baselineY - (val / maxVal) * 135;
        pointsSales.push({ x, y, val, label });
      }
      if (showProfit) {
        const val = parseFloat(day.profit);
        const y = baselineY - (Math.max(0, val) / maxVal) * 135;
        pointsProfit.push({ x, y, val, label });
      }
      if (showCogs) {
        const val = parseFloat(day.cogs);
        const y = baselineY - (val / maxVal) * 135;
        pointsCogs.push({ x, y, val, label });
      }
      if (showIngUsed) {
        const val = parseFloat(day.ingredients_used);
        const y = baselineY - (val / maxVal) * 135;
        pointsIngUsed.push({ x, y, val, label });
      }
    });
  }

  const totalRevenue = data ? parseFloat(data.summary.total) : 0;

  return (
    <div className="analytics-page">
      
      {/* Top Controls Header */}
      <div className="analytics-header">
        <div className="title-row">
          <button onClick={() => navigate('/dashboard')} className="back-btn" title="Back to Dashboard">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <div>
            <h1>Analytics Overview</h1>
            <p>Track business revenue, margins, and ingredient performance.</p>
          </div>
        </div>
      </div>

      {/* Date Pickers & Range Strip */}
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
          
          {/* Preset Metric Selection Pills Bar (Matching Design Mockup) */}
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

          {/* MAIN GRAPH CARD (Matching Reference Design) */}
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
                <svg width={Math.max(620, data.chartData.length * 65 + 60)} height={chartHeight} className="analytics-svg-chart">
                  <defs>
                    {/* Indigo Fading Gradient for Sales Wave */}
                    <linearGradient id="salesWaveGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
                    </linearGradient>

                    {/* Emerald Fading Gradient for Profit Wave */}
                    <linearGradient id="profitWaveGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.18" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>

                    {/* Amber Fading Gradient for Ingredient Cost */}
                    <linearGradient id="cogsWaveGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.18" />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                    </linearGradient>

                    {/* Pink Fading Gradient for Ingredients Used */}
                    <linearGradient id="ingWaveGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ec4899" stopOpacity="0.18" />
                      <stop offset="100%" stopColor="#ec4899" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* 1. Sales Wave (Solid Indigo Smooth Curve + Gradient Area Fill) */}
                  {showSales && pointsSales.length > 0 && (
                    <g>
                      <path d={buildSmoothAreaPath(pointsSales, baselineY)} fill="url(#salesWaveGrad)" />
                      <path d={buildSmoothPath(pointsSales)} fill="none" stroke="#4f46e5" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
                    </g>
                  )}

                  {/* 2. Profit Wave (Dotted Green Smooth Curve + Gradient Area Fill) */}
                  {showProfit && pointsProfit.length > 0 && (
                    <g>
                      <path d={buildSmoothAreaPath(pointsProfit, baselineY)} fill="url(#profitWaveGrad)" />
                      <path d={buildSmoothPath(pointsProfit)} fill="none" stroke="#10b981" strokeWidth="2.8" strokeDasharray="3 3" strokeLinecap="round" strokeLinejoin="round" />
                    </g>
                  )}

                  {/* 3. Ingredient Cost Wave (Amber Line) */}
                  {showCogs && pointsCogs.length > 0 && (
                    <g>
                      <path d={buildSmoothAreaPath(pointsCogs, baselineY)} fill="url(#cogsWaveGrad)" />
                      <path d={buildSmoothPath(pointsCogs)} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </g>
                  )}

                  {/* 4. Ingredients Used Wave (Pink Line) */}
                  {showIngUsed && pointsIngUsed.length > 0 && (
                    <g>
                      <path d={buildSmoothAreaPath(pointsIngUsed, baselineY)} fill="url(#ingWaveGrad)" />
                      <path d={buildSmoothPath(pointsIngUsed)} fill="none" stroke="#ec4899" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </g>
                  )}

                  {/* X Axis Time Labels Centered Below Waves */}
                  {data.chartData.map((d, i) => {
                    const spacing = Math.max(620 / Math.max(data.chartData.length, 1), 65);
                    const x = 45 + i * spacing;
                    return (
                      <text key={`xlabel-${i}`} x={x} y={baselineY + 22} textAnchor="middle" className="x-time-label">
                        {d.date}
                      </text>
                    );
                  })}
                </svg>
              </div>
            )}

            {/* Bottom Centered Color Legend (Matching Reference Design) */}
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
