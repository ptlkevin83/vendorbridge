import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { BarChart3, TrendingUp, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
);

const THEME = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

const TABS = ['Overview', 'Vendor Performance', 'Procurement Stats'];

function formatCurrency(val) {
  if (val === undefined || val === null) return '—';
  const num = Number(val);
  if (isNaN(num)) return '—';
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000)     return `$${(num / 1_000).toFixed(1)}k`;
  return `$${num.toFixed(2)}`;
}

function StarRating({ rating, max = 5 }) {
  const r = Math.round(Number(rating) * 2) / 2;
  return (
    <span style={{ color: '#f59e0b', fontSize: '1rem', letterSpacing: 1 }}>
      {Array.from({ length: max }).map((_, i) => {
        if (i + 1 <= r) return <span key={i}>★</span>;
        if (i + 0.5 === r) return <span key={i} style={{ opacity: 0.6 }}>★</span>;
        return <span key={i} style={{ opacity: 0.2 }}>★</span>;
      })}
      <span style={{ color: '#64748b', fontSize: '0.78rem', marginLeft: 4 }}>({Number(rating || 0).toFixed(1)})</span>
    </span>
  );
}

function KPICard({ icon, label, value, sub, color }) {
  return (
    <div className="kpi-card">
      <div className="kpi-icon" style={{ background: `${color}18`, color }}>
        {icon}
      </div>
      <div>
        <div className="kpi-value">{value}</div>
        <div className="kpi-label">{label}</div>
        {sub && <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

function downloadCSV(data) {
  if (!data) return;
  const rows = [];
  rows.push(['Report', 'VendorBridge ERP — Generated', new Date().toLocaleString()]);
  rows.push([]);

  rows.push(['=== KPI Summary ===']);
  rows.push(['Metric', 'Value']);
  const { kpis = {} } = data;
  rows.push(['Total Spend',        kpis.total_spend        ?? '']);
  rows.push(['Active Vendors',     kpis.active_vendors     ?? '']);
  rows.push(['Total POs',          kpis.total_pos          ?? '']);
  rows.push(['Active RFQs',        kpis.active_rfqs        ?? '']);
  rows.push(['Pending Approvals',  kpis.pending_approvals  ?? '']);
  rows.push(['Unpaid Invoices',    kpis.unpaid_invoices    ?? '']);
  rows.push([]);

  if (Array.isArray(data.monthlyTrend)) {
    rows.push(['=== Monthly Spend Trend ===']);
    rows.push(['Month', 'Spend']);
    data.monthlyTrend.forEach(m => rows.push([m.month || m.label, m.spend || m.amount || m.value]));
    rows.push([]);
  }

  if (Array.isArray(data.categorySpend)) {
    rows.push(['=== Category Spend ===']);
    rows.push(['Category', 'Amount']);
    data.categorySpend.forEach(c => rows.push([c.category || c.label, c.amount || c.value]));
    rows.push([]);
  }

  const csv = rows.map(r => r.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `vendorbridge-report-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/* ─── Overview Tab ─────────────────────────────────────────────────────────── */
function OverviewTab({ dashboard, loading }) {
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}><div className="spinner" /></div>;
  if (!dashboard) return null;

  const kpis = dashboard.kpis || {};

  /* Monthly trend chart */
  const monthlyLabels  = (dashboard.monthlyTrend || []).map(m => m.month || m.label || '');
  const monthlyValues  = (dashboard.monthlyTrend || []).map(m => Number(m.spend || m.amount || m.value || 0));
  const lineData = {
    labels: monthlyLabels,
    datasets: [{
      label: 'Procurement Spend',
      data: monthlyValues,
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99,102,241,0.12)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#6366f1',
      pointRadius: 4,
    }],
  };
  const lineOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title:  { display: true, text: 'Monthly Procurement Spend', font: { size: 13 } },
      tooltip: { callbacks: { label: ctx => formatCurrency(ctx.parsed.y) } },
    },
    scales: {
      y: { ticks: { callback: v => formatCurrency(v) } },
    },
  };

  /* RFQ status doughnut */
  const rfqStatus = dashboard.rfqStatus || {};
  const rfqLabels = Object.keys(rfqStatus);
  const rfqValues = Object.values(rfqStatus).map(Number);
  const doughnutData = {
    labels: rfqLabels,
    datasets: [{
      data: rfqValues,
      backgroundColor: THEME,
      borderWidth: 2,
      borderColor: '#fff',
    }],
  };
  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'bottom' },
      title:  { display: true, text: 'RFQ Status Breakdown', font: { size: 13 } },
    },
  };

  /* Category spend bar */
  const catSpend  = dashboard.categorySpend || [];
  const catLabels = catSpend.map(c => c.category || c.label || '');
  const catValues = catSpend.map(c => Number(c.amount || c.value || 0));
  const barData = {
    labels: catLabels,
    datasets: [{
      label: 'Spend by Category',
      data: catValues,
      backgroundColor: THEME,
      borderRadius: 6,
    }],
  };
  const barOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title:  { display: true, text: 'Spend by Category', font: { size: 13 } },
      tooltip: { callbacks: { label: ctx => formatCurrency(ctx.parsed.y) } },
    },
    scales: {
      y: { ticks: { callback: v => formatCurrency(v) } },
    },
  };

  return (
    <div>
      {/* KPI Grid */}
      <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
        <KPICard icon={<TrendingUp size={20} />} label="Total Spend"       value={formatCurrency(kpis.total_spend)}                color="#6366f1" />
        <KPICard icon={<BarChart3  size={20} />} label="Active Vendors"    value={kpis.active_vendors    ?? '—'}                   color="#8b5cf6" />
        <KPICard icon={<BarChart3  size={20} />} label="Total POs"         value={kpis.total_pos         ?? '—'}                   color="#06b6d4" />
        <KPICard icon={<BarChart3  size={20} />} label="Active RFQs"       value={kpis.active_rfqs       ?? '—'}                   color="#10b981" />
        <KPICard icon={<BarChart3  size={20} />} label="Pending Approvals" value={kpis.pending_approvals ?? '—'}                   color="#f59e0b" />
        <KPICard icon={<BarChart3  size={20} />} label="Unpaid Invoices"   value={kpis.unpaid_invoices   ?? '—'} sub={formatCurrency(kpis.unpaid_amount)} color="#ef4444" />
      </div>

      {/* Charts row */}
      <div className="grid-2" style={{ marginBottom: '1.5rem', gap: '1.25rem' }}>
        <div className="card" style={{ padding: '1.25rem' }}>
          <Line data={lineData} options={lineOptions} />
        </div>
        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {rfqLabels.length > 0
            ? <Doughnut data={doughnutData} options={doughnutOptions} />
            : <div className="empty-state"><div className="empty-state-icon">📊</div><div className="empty-state-title">No RFQ status data</div></div>
          }
        </div>
      </div>

      {/* Category bar */}
      <div className="card" style={{ padding: '1.25rem' }}>
        {catLabels.length > 0
          ? <Bar data={barData} options={barOptions} />
          : <div className="empty-state"><div className="empty-state-icon">📊</div><div className="empty-state-title">No category spend data</div></div>
        }
      </div>
    </div>
  );
}

/* ─── Vendor Performance Tab ────────────────────────────────────────────────── */
function VendorPerformanceTab({ vendors, loading }) {
  const [sort, setSort] = useState({ key: 'total_spend', dir: 'desc' });

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}><div className="spinner" /></div>;

  const sorted = [...(vendors || [])].sort((a, b) => {
    const av = a[sort.key] ?? 0;
    const bv = b[sort.key] ?? 0;
    return sort.dir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
  });

  const toggleSort = (key) =>
    setSort(s => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }));

  const sortIcon = (key) => sort.key === key ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : '';

  if (sorted.length === 0)
    return <div className="empty-state"><div className="empty-state-icon">🏢</div><div className="empty-state-title">No vendor performance data</div></div>;

  return (
    <div className="table-wrapper">
      <table className="table">
        <thead>
          <tr>
            <th>Company Name</th>
            <th>Category</th>
            <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('rating')}>Rating{sortIcon('rating')}</th>
            <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('quotations_submitted')}>Quotations{sortIcon('quotations_submitted')}</th>
            <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('pos_received')}>POs Received{sortIcon('pos_received')}</th>
            <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('total_spend')}>Total Spend{sortIcon('total_spend')}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((v, idx) => (
            <tr key={v.vendor_id || v.id || idx}>
              <td><strong>{v.company_name || v.name || '—'}</strong></td>
              <td>
                <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>
                  {v.category || '—'}
                </span>
              </td>
              <td><StarRating rating={v.rating || 0} /></td>
              <td>{v.quotations_submitted ?? v.quotations ?? '—'}</td>
              <td>{v.pos_received ?? v.pos ?? '—'}</td>
              <td style={{ fontWeight: 600 }}>{formatCurrency(v.total_spend)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Procurement Stats Tab ─────────────────────────────────────────────────── */
function ProcurementStatsTab({ stats, loading }) {
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}><div className="spinner" /></div>;
  if (!stats) return <div className="empty-state"><div className="empty-state-icon">📈</div><div className="empty-state-title">No procurement stats available</div></div>;

  const sections = [
    {
      title: 'RFQ Statistics',
      emoji: '📋',
      color: '#6366f1',
      items: [
        { label: 'Total RFQs',      value: stats.rfq?.total       ?? stats.total_rfqs      ?? '—' },
        { label: 'Open RFQs',       value: stats.rfq?.open        ?? stats.open_rfqs       ?? '—' },
        { label: 'Closed RFQs',     value: stats.rfq?.closed      ?? stats.closed_rfqs     ?? '—' },
        { label: 'Avg Quotations',  value: stats.rfq?.avg_quotes  ?? stats.avg_quotations  ?? '—' },
      ],
    },
    {
      title: 'Invoice Statistics',
      emoji: '🧾',
      color: '#10b981',
      items: [
        { label: 'Total Invoices',   value: stats.invoice?.total         ?? stats.total_invoices  ?? '—' },
        { label: 'Paid',             value: stats.invoice?.paid          ?? stats.paid_invoices   ?? '—' },
        { label: 'Unpaid',           value: stats.invoice?.unpaid        ?? stats.unpaid_invoices ?? '—' },
        { label: 'Total Invoiced',   value: formatCurrency(stats.invoice?.total_amount ?? stats.total_invoiced) },
      ],
    },
    {
      title: 'Quotation Statistics',
      emoji: '💬',
      color: '#f59e0b',
      items: [
        { label: 'Total Quotations',  value: stats.quotation?.total          ?? stats.total_quotations  ?? '—' },
        { label: 'Accepted',          value: stats.quotation?.accepted       ?? stats.accepted_quotes   ?? '—' },
        { label: 'Rejected',          value: stats.quotation?.rejected       ?? stats.rejected_quotes   ?? '—' },
        { label: 'Total Value',       value: formatCurrency(stats.quotation?.total_amount ?? stats.total_quote_value) },
      ],
    },
  ];

  return (
    <div className="grid-3" style={{ gap: '1.25rem' }}>
      {sections.map(sec => (
        <div key={sec.title} className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.25rem' }}>{sec.emoji}</span>
            <h4 style={{ margin: 0, color: sec.color }}>{sec.title}</h4>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {sec.items.map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color, #e2e8f0)', paddingBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{item.label}</span>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────────────────────────── */
export default function Reports() {
  const { user } = useAuth();

  const [activeTab, setActiveTab]           = useState('Overview');
  const [dashboard, setDashboard]           = useState(null);
  const [vendors,   setVendors]             = useState([]);
  const [procStats, setProcStats]           = useState(null);
  const [dashLoading,  setDashLoading]      = useState(true);
  const [vendorLoading, setVendorLoading]   = useState(true);
  const [statsLoading, setStatsLoading]     = useState(true);
  const [error, setError]                   = useState(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    setDashLoading(true);
    setVendorLoading(true);
    setStatsLoading(true);

    try {
      const [dashRes, vendorRes, statsRes] = await Promise.allSettled([
        axios.get('/api/reports/dashboard'),
        axios.get('/api/reports/vendor-performance'),
        axios.get('/api/reports/procurement-stats'),
      ]);

      if (dashRes.status === 'fulfilled') {
        setDashboard(dashRes.value.data?.data || dashRes.value.data);
      } else {
        console.error('Dashboard fetch failed:', dashRes.reason);
        setError('Some report data could not be loaded.');
      }

      if (vendorRes.status === 'fulfilled') {
        const d = vendorRes.value.data;
        setVendors(d?.vendors || d?.data || d || []);
      } else {
        console.error('Vendor performance fetch failed:', vendorRes.reason);
      }

      if (statsRes.status === 'fulfilled') {
        const d = statsRes.value.data;
        setProcStats(d?.stats || d?.data || d);
      } else {
        console.error('Proc stats fetch failed:', statsRes.reason);
      }
    } finally {
      setDashLoading(false);
      setVendorLoading(false);
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1.5rem' }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div className="page-header-left">
          <BarChart3 size={22} style={{ color: '#6366f1' }} />
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Reports & Analytics</h1>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted, #64748b)' }}>
              Procurement insights, vendor performance and spend analytics
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={fetchAll}>
            <TrendingUp size={15} /> Refresh
          </button>
          <button
            className="btn btn-primary"
            onClick={() => downloadCSV(dashboard)}
            disabled={!dashboard}
          >
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="badge badge-warning" style={{ display: 'block', padding: '0.75rem 1rem', marginBottom: '1rem', borderRadius: 8, fontSize: '0.875rem' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', borderBottom: '2px solid var(--border-color, #e2e8f0)', overflowX: 'auto' }}>
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '0.6rem 1.25rem',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontWeight: activeTab === tab ? 700 : 400,
              color: activeTab === tab ? '#6366f1' : '#64748b',
              borderBottom: `2px solid ${activeTab === tab ? '#6366f1' : 'transparent'}`,
              marginBottom: -2,
              whiteSpace: 'nowrap',
              transition: 'color 0.15s',
              fontSize: '0.875rem',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'Overview' && (
        <OverviewTab dashboard={dashboard} loading={dashLoading} />
      )}
      {activeTab === 'Vendor Performance' && (
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <BarChart3 size={18} style={{ color: '#6366f1' }} />
            <h3 style={{ margin: 0 }}>Vendor Performance</h3>
            {!vendorLoading && <span className="badge badge-muted">{vendors.length} vendors</span>}
          </div>
          <VendorPerformanceTab vendors={vendors} loading={vendorLoading} />
        </div>
      )}
      {activeTab === 'Procurement Stats' && (
        <ProcurementStatsTab stats={procStats} loading={statsLoading} />
      )}
    </div>
  );
}
