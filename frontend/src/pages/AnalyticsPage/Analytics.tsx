import React, { useState, useEffect, useRef } from 'react';
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

interface ProductItemData {
  item_id: number;
  item_name: string;
  units_sold: number;
  sales_amount: string;
  ingredient_cost: string;
  profit: string;
}

interface AnalyticsData {
  groupBy: string;
  chartData: ChartItem[];
  productData: ProductItemData[];
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

  // Multi-Series Line Visibility Toggles
  const [showSales, setShowSales] = useState(true);
  const [showProfit, setShowProfit] = useState(true);
  const [showCogs, setShowCogs] = useState(true);
  const [showIngUsed, setShowIngUsed] = useState(true);

  // Active Clicked Point for Wave Tooltip Card
  const [activePoint, setActivePoint] = useState<{
    index: number;
    x: number;
    date: string;
    sales: string;
    profit: string;
    cogs: string;
    ingredients_used: string;
  } | null>(null);

  // Product Search & Sort State
  const [productSearch, setProductSearch] = useState('');
  const [productSort, setProductSort] = useState<'sales' | 'profit' | 'cogs' | 'units'>('sales');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<AnalyticsData | null>(null);

  // Responsive Chart Container Width Observer
  const chartWrapperRef = useRef<HTMLDivElement>(null);
  const [chartContainerWidth, setChartContainerWidth] = useState(600);

  useEffect(() => {
    if (!chartWrapperRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect && entry.contentRect.width > 0) {
          setChartContainerWidth(Math.floor(entry.contentRect.width));
        }
      }
    });
    ro.observe(chartWrapperRef.current);
    return () => ro.disconnect();
  }, [loading]);

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
    setActivePoint(null);
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

  // Handle Preset Selection Pills
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

  // Pixel-Perfect Dynamic Coordinate Calculations
  const chartHeight = 240;
  const baselineY = 190;
  const topPadding = 20;

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
    
    // Dynamic spacing based on container width
    const minPaddingX = 24;
    const availableWidth = Math.max(chartContainerWidth - minPaddingX * 2, 280);
    const numPoints = Math.max(data.chartData.length - 1, 1);
    const spacing = availableWidth / numPoints;

    data.chartData.forEach((day, i) => {
      const x = minPaddingX + i * spacing;
      const label = day.date;

      if (showSales) {
        const val = parseFloat(day.sales);
        const y = baselineY - (val / maxVal) * (baselineY - topPadding);
        pointsSales.push({ x, y, val, label });
      }
      if (showProfit) {
        const val = parseFloat(day.profit);
        const y = baselineY - (Math.max(0, val) / maxVal) * (baselineY - topPadding);
        pointsProfit.push({ x, y, val, label });
      }
      if (showCogs) {
        const val = parseFloat(day.cogs);
        const y = baselineY - (val / maxVal) * (baselineY - topPadding);
        pointsCogs.push({ x, y, val, label });
      }
      if (showIngUsed) {
        const val = parseFloat(day.ingredients_used);
        const y = baselineY - (val / maxVal) * (baselineY - topPadding);
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

  // Product Analysis Calculations
  const rawProductData = data?.productData || [];

  // Filter & Sort Products
  const filteredProducts = rawProductData
    .filter(p => p.item_name.toLowerCase().includes(productSearch.toLowerCase()))
    .sort((a, b) => {
      if (productSort === 'profit') return parseFloat(b.profit) - parseFloat(a.profit);
      if (productSort === 'cogs') return parseFloat(b.ingredient_cost) - parseFloat(a.ingredient_cost);
      if (productSort === 'units') return b.units_sold - a.units_sold;
      return parseFloat(b.sales_amount) - parseFloat(a.sales_amount);
    });

  const maxProductSales = Math.max(...rawProductData.map(p => parseFloat(p.sales_amount)), 100);

  // Key Product Highlights
  const topEarner = [...rawProductData].sort((a, b) => parseFloat(b.sales_amount) - parseFloat(a.sales_amount))[0];
  const topProfitDish = [...rawProductData].sort((a, b) => parseFloat(b.profit) - parseFloat(a.profit))[0];
  const topCogsDish = [...rawProductData].sort((a, b) => parseFloat(b.ingredient_cost) - parseFloat(a.ingredient_cost))[0];

  return (
    <div className="analytics-page" onClick={() => setActivePoint(null)}>
      
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
            <p>Track business revenue, product margins, and ingredient performance.</p>
          </div>
        </div>
      </div>

      {/* Date Pickers & Range Toolbar */}
      <div className="analytics-controls" onClick={e => e.stopPropagation()}>
        
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
          <div className="preset-metric-pills-bar" onClick={e => e.stopPropagation()}>
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

          {/* KPI Summary Strip */}
          <div className="analytics-kpi-grid" onClick={e => e.stopPropagation()}>
            
            {/* KPI 1: Total Revenue */}
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

          {/* MAIN PERFORMANCE GRAPH CARD */}
          <div className="analytics-main-card" onClick={e => e.stopPropagation()}>
            
            {/* Card Header */}
            <div className="card-top-header">
              <div>
                <span className="card-sub-header">Performance Overview</span>
                <div className="overview-value-row">
                  <h2 className="overview-big-price">₹{totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</h2>
                  <span className="trend-pct-tag">↑ 12.5%</span>
                </div>
              </div>

              <button className="icon-action-btn" title="More Options">
                <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '18px', height: '18px' }}>
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                </svg>
              </button>
            </div>

            {/* SVG Wave Graph */}
            {!data || data.chartData.length === 0 ? (
              <div className="empty-chart">No sales data for selected period.</div>
            ) : (
              <div className="chart-scroll-wrapper" ref={chartWrapperRef}>
                
                {/* Floating Interactive Tooltip Popover Card */}
                {activePoint && (
                  <div 
                    className="chart-tooltip-popover"
                    style={{
                      left: Math.min(Math.max(activePoint.x, 110), chartContainerWidth - 110),
                      top: 10
                    }}
                  >
                    <div className="tooltip-header">
                      <span>{formatDateLabel(activePoint.date)}</span>
                      <button className="tooltip-close-btn" onClick={() => setActivePoint(null)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '12px', height: '12px' }}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="tooltip-body">
                      {showSales && (
                        <div className="tooltip-row">
                          <span className="dot sales"></span>
                          <span className="tooltip-label">Sales:</span>
                          <span className="tooltip-val">₹{parseFloat(activePoint.sales).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      {showProfit && (
                        <div className="tooltip-row">
                          <span className="dot profit"></span>
                          <span className="tooltip-label">Net Profit:</span>
                          <span className="tooltip-val">₹{parseFloat(activePoint.profit).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      {showCogs && (
                        <div className="tooltip-row">
                          <span className="dot cogs"></span>
                          <span className="tooltip-label">Ing. Cost:</span>
                          <span className="tooltip-val">₹{parseFloat(activePoint.cogs).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      {showIngUsed && (
                        <div className="tooltip-row">
                          <span className="dot ingused"></span>
                          <span className="tooltip-label">Ing. Used:</span>
                          <span className="tooltip-val">{parseFloat(activePoint.ingredients_used).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <svg width={chartContainerWidth} height={chartHeight} className="analytics-svg-chart">
                  <defs>
                    <linearGradient id="salesWaveGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                    </linearGradient>

                    <linearGradient id="profitWaveGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>

                    <linearGradient id="cogsWaveGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.20" />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                    </linearGradient>

                    <linearGradient id="ingWaveGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ec4899" stopOpacity="0.20" />
                      <stop offset="100%" stopColor="#ec4899" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid Lines */}
                  {yTicks.map((tick) => {
                    const y = baselineY - tick * (baselineY - topPadding);
                    return (
                      <line key={`ygrid-${tick}`} x1="0" y1={y} x2={chartContainerWidth} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                    );
                  })}

                  {/* Vertical Guide Line on Clicked Active Point */}
                  {activePoint && (
                    <line 
                      x1={activePoint.x} 
                      y1={15} 
                      x2={activePoint.x} 
                      y2={baselineY} 
                      stroke="#6366f1" 
                      strokeDasharray="4 3" 
                      strokeWidth="1.5" 
                    />
                  )}

                  {/* 1. Sales Wave */}
                  {showSales && pointsSales.length > 0 && (
                    <g>
                      <path d={buildSmoothAreaPath(pointsSales, baselineY)} fill="url(#salesWaveGrad)" />
                      <path d={buildSmoothPath(pointsSales)} fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      {pointsSales.map((p, idx) => (
                        <g key={`sp-${p.x}`}>
                          {activePoint?.index === idx && (
                            <circle cx={p.x} cy={p.y} r="8" fill="rgba(99, 102, 241, 0.25)" />
                          )}
                          <circle cx={p.x} cy={p.y} r="4.5" fill="#ffffff" stroke="#6366f1" strokeWidth="2.5" />
                        </g>
                      ))}
                    </g>
                  )}

                  {/* 2. Profit Wave */}
                  {showProfit && pointsProfit.length > 0 && (
                    <g>
                      <path d={buildSmoothAreaPath(pointsProfit, baselineY)} fill="url(#profitWaveGrad)" />
                      <path d={buildSmoothPath(pointsProfit)} fill="none" stroke="#10b981" strokeWidth="2.5" strokeDasharray="4 3" strokeLinecap="round" strokeLinejoin="round" />
                      {pointsProfit.map((p, idx) => (
                        <g key={`pp-${p.x}`}>
                          {activePoint?.index === idx && (
                            <circle cx={p.x} cy={p.y} r="8" fill="rgba(16, 185, 129, 0.25)" />
                          )}
                          <circle cx={p.x} cy={p.y} r="4.5" fill="#ffffff" stroke="#10b981" strokeWidth="2.5" />
                        </g>
                      ))}
                    </g>
                  )}

                  {/* 3. Ingredient Cost Wave */}
                  {showCogs && pointsCogs.length > 0 && (
                    <g>
                      <path d={buildSmoothAreaPath(pointsCogs, baselineY)} fill="url(#cogsWaveGrad)" />
                      <path d={buildSmoothPath(pointsCogs)} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      {pointsCogs.map((p, idx) => (
                        <g key={`cp-${p.x}`}>
                          {activePoint?.index === idx && (
                            <circle cx={p.x} cy={p.y} r="7" fill="rgba(245, 158, 11, 0.25)" />
                          )}
                          <circle cx={p.x} cy={p.y} r="4" fill="#ffffff" stroke="#f59e0b" strokeWidth="2" />
                        </g>
                      ))}
                    </g>
                  )}

                  {/* 4. Ingredients Used Wave */}
                  {showIngUsed && pointsIngUsed.length > 0 && (
                    <g>
                      <path d={buildSmoothAreaPath(pointsIngUsed, baselineY)} fill="url(#ingWaveGrad)" />
                      <path d={buildSmoothPath(pointsIngUsed)} fill="none" stroke="#ec4899" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      {pointsIngUsed.map((p, idx) => (
                        <g key={`ip-${p.x}`}>
                          {activePoint?.index === idx && (
                            <circle cx={p.x} cy={p.y} r="7" fill="rgba(236, 72, 153, 0.25)" />
                          )}
                          <circle cx={p.x} cy={p.y} r="4" fill="#ffffff" stroke="#ec4899" strokeWidth="2" />
                        </g>
                      ))}
                    </g>
                  )}

                  {/* Invisible Clickable Hitboxes */}
                  {data.chartData.map((d, i) => {
                    const minPaddingX = 24;
                    const availableWidth = Math.max(chartContainerWidth - minPaddingX * 2, 280);
                    const numPoints = Math.max(data.chartData.length - 1, 1);
                    const spacing = availableWidth / numPoints;
                    const x = minPaddingX + i * spacing;

                    return (
                      <rect
                        key={`hitbox-${i}`}
                        x={x - Math.max(spacing / 2, 16)}
                        y={10}
                        width={Math.max(spacing, 32)}
                        height={baselineY + 20}
                        fill="transparent"
                        style={{ cursor: 'pointer' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePoint({
                            index: i,
                            x,
                            date: d.date,
                            sales: d.sales,
                            profit: d.profit,
                            cogs: d.cogs,
                            ingredients_used: d.ingredients_used
                          });
                        }}
                      />
                    );
                  })}

                  {/* X Axis Time Labels */}
                  {data.chartData.map((d, i) => {
                    const minPaddingX = 24;
                    const availableWidth = Math.max(chartContainerWidth - minPaddingX * 2, 280);
                    const numPoints = Math.max(data.chartData.length - 1, 1);
                    const spacing = availableWidth / numPoints;
                    const x = minPaddingX + i * spacing;
                    return (
                      <text key={`xlabel-${i}`} x={x} y={baselineY + 24} textAnchor="middle" className="x-time-label">
                        {formatDateLabel(d.date)}
                      </text>
                    );
                  })}
                </svg>
              </div>
            )}

            {/* Bottom Color Legend Grid */}
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

          {/* CLEAN SYSTEM-ALIGNED PER-PRODUCT PERFORMANCE SECTION */}
          <div className="analytics-product-card" onClick={e => e.stopPropagation()}>
            
            {/* Header Toolbar */}
            <div className="clean-section-header">
              <div>
                <span className="card-sub-header">Menu Item Breakdown</span>
                <h3 className="product-chart-title">Product Performance</h3>
              </div>
              <div className="product-chart-legend">
                <span className="legend-chip sales"><span className="dot sales"></span> Sales</span>
                <span className="legend-chip profit"><span className="dot profit"></span> Profit</span>
                <span className="legend-chip cogs"><span className="dot cogs"></span> Cost</span>
              </div>
            </div>

            {/* Horizontal Swipeable Top Product Highlights Strip */}
            {rawProductData.length > 0 && (
              <div className="product-highlights-horizontal-strip">
                
                {/* Highlight 1: Top Revenue Dish */}
                {topEarner && (
                  <div className="compact-highlight-item">
                    <div className="highlight-icon-badge purple">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 003-3V8.25a3 3 0 00-3-3h-9a3 3 0 00-3 3v7.5a3 3 0 003 3m9 0v-13.5A2.25 2.25 0 0014.25 3h-4.5A2.25 2.25 0 007.5 5.25v13.5" />
                      </svg>
                    </div>
                    <div className="highlight-text-col">
                      <span className="tag-label">Top Revenue Dish</span>
                      <h4 className="dish-name">{topEarner.item_name}</h4>
                      <span className="val-text">₹{parseFloat(topEarner.sales_amount).toLocaleString('en-IN')} <small>({topEarner.units_sold} sold)</small></span>
                    </div>
                  </div>
                )}

                {/* Highlight 2: Highest Net Profit Dish */}
                {topProfitDish && (
                  <div className="compact-highlight-item">
                    <div className="highlight-icon-badge teal">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 005.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                      </svg>
                    </div>
                    <div className="highlight-text-col">
                      <span className="tag-label">Most Profitable</span>
                      <h4 className="dish-name">{topProfitDish.item_name}</h4>
                      <span className="val-text green">₹{parseFloat(topProfitDish.profit).toLocaleString('en-IN')} <small>({parseFloat(topProfitDish.sales_amount) > 0 ? `${((parseFloat(topProfitDish.profit) / parseFloat(topProfitDish.sales_amount)) * 100).toFixed(0)}%` : '0%'})</small></span>
                    </div>
                  </div>
                )}

                {/* Highlight 3: High Ingredient Cost Warning */}
                {topCogsDish && (
                  <div className="compact-highlight-item">
                    <div className="highlight-icon-badge amber">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                    </div>
                    <div className="highlight-text-col">
                      <span className="tag-label">High Food Cost</span>
                      <h4 className="dish-name">{topCogsDish.item_name}</h4>
                      <span className="val-text amber">₹{parseFloat(topCogsDish.ingredient_cost).toLocaleString('en-IN')} <small>(Raw cost)</small></span>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* Filter Search & Sort Bar */}
            <div className="product-filter-bar">
              <div className="product-search-input-wrapper">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="search-icon">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search product name..."
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                />
              </div>

              <div className="product-sort-strip">
                <span className="sort-label">Sort:</span>
                <button
                  className={`sort-pill ${productSort === 'sales' ? 'active' : ''}`}
                  onClick={() => setProductSort('sales')}
                >
                  Sales
                </button>
                <button
                  className={`sort-pill ${productSort === 'profit' ? 'active' : ''}`}
                  onClick={() => setProductSort('profit')}
                >
                  Profit
                </button>
                <button
                  className={`sort-pill ${productSort === 'cogs' ? 'active' : ''}`}
                  onClick={() => setProductSort('cogs')}
                >
                  Cost
                </button>
                <button
                  className={`sort-pill ${productSort === 'units' ? 'active' : ''}`}
                  onClick={() => setProductSort('units')}
                >
                  Units
                </button>
              </div>
            </div>

            {/* Dynamic Product Bar Chart Rows */}
            {filteredProducts.length === 0 ? (
              <div className="empty-chart">No products match your search.</div>
            ) : (
              <div className="product-bar-chart-container">
                {filteredProducts.map((prod, idx) => {
                  const salesVal = parseFloat(prod.sales_amount);
                  const profitVal = parseFloat(prod.profit);
                  const cogsVal = parseFloat(prod.ingredient_cost);

                  const salesWidth = (salesVal / maxProductSales) * 100;
                  const profitWidth = (Math.max(0, profitVal) / maxProductSales) * 100;
                  const cogsWidth = (cogsVal / maxProductSales) * 100;

                  const marginPctVal = salesVal > 0 ? (profitVal / salesVal) * 100 : 0;
                  const cogsPctVal = salesVal > 0 ? (cogsVal / salesVal) * 100 : 0;

                  return (
                    <div key={prod.item_id} className="product-bar-row">
                      
                      {/* Product Name & Badges */}
                      <div className="product-info-col">
                        <div className="name-rank-row">
                          {idx < 3 && <span className={`rank-badge rank-${idx + 1}`}>#{idx + 1}</span>}
                          <span className="prod-name">{prod.item_name}</span>
                        </div>
                        <span className="prod-badge">{prod.units_sold} sold • {marginPctVal.toFixed(0)}% margin</span>
                      </div>

                      {/* Stacked Group Bars */}
                      <div className="bars-stack-col">
                        
                        {/* 1. Sales Bar (Indigo Gradient) */}
                        <div className="single-bar-container" title={`Total Sales: ₹${salesVal.toFixed(2)}`}>
                          <div className="bar-fill sales" style={{ width: `${salesWidth}%` }}></div>
                          <span className="bar-val">₹{salesVal.toFixed(0)}</span>
                        </div>

                        {/* 2. Net Profit Bar (Emerald Green Gradient) */}
                        <div className="single-bar-container" title={`Net Profit: ₹${profitVal.toFixed(2)}`}>
                          <div className="bar-fill profit" style={{ width: `${profitWidth}%` }}></div>
                          <span className="bar-val profit">₹{profitVal.toFixed(0)}</span>
                        </div>

                        {/* 3. Ingredient Cost Bar (Amber Gradient) */}
                        <div className="single-bar-container" title={`Ingredient Cost: ₹${cogsVal.toFixed(2)}`}>
                          <div className="bar-fill cogs" style={{ width: `${cogsWidth}%` }}></div>
                          <span className="bar-val cogs">₹{cogsVal.toFixed(0)}</span>
                        </div>

                        {/* Segmented Distribution Ratio Bar */}
                        <div className="segmented-ratio-bar" title={`Profit: ${marginPctVal.toFixed(0)}% | Food Cost: ${cogsPctVal.toFixed(0)}%`}>
                          <div className="segment profit" style={{ width: `${marginPctVal}%` }}></div>
                          <div className="segment cogs" style={{ width: `${cogsPctVal}%` }}></div>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Detailed Product Performance Data Table */}
            <div className="product-details-table-wrapper">
              <h4>Product Breakdown Table</h4>
              <table className="product-analytics-table">
                <thead>
                  <tr>
                    <th>Dish Name</th>
                    <th>Units</th>
                    <th>Sales</th>
                    <th>Ingredient Cost</th>
                    <th>Profit</th>
                    <th>Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((prod) => {
                    const salesVal = parseFloat(prod.sales_amount);
                    const profitVal = parseFloat(prod.profit);
                    const cogsVal = parseFloat(prod.ingredient_cost);
                    const marginPct = salesVal > 0 ? ((profitVal / salesVal) * 100).toFixed(1) : '0.0';

                    return (
                      <tr key={`tbl-${prod.item_id}`}>
                        <td className="font-bold">{prod.item_name}</td>
                        <td><span className="units-badge">{prod.units_sold} pcs</span></td>
                        <td className="font-bold">₹{salesVal.toFixed(2)}</td>
                        <td className="cogs-text">₹{cogsVal.toFixed(2)}</td>
                        <td className="profit-text font-bold">₹{profitVal.toFixed(2)}</td>
                        <td>
                          <span className={`margin-pill ${parseFloat(marginPct) >= 50 ? 'high' : 'medium'}`}>
                            {marginPct}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>

        </div>
      )}
    </div>
  );
};

export default Analytics;
