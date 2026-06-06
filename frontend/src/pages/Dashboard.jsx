import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, ArcElement, BarElement
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { ShoppingCart, Building2, FileText, CheckSquare, TrendingUp, Receipt, ArrowRight, Plus } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, BarElement);

const CHART_OPTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { labels: { color: '#94a3b8', font: { size: 12 } } } },
  scales: {
    x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } },
    y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } }
  }
};

const DOUGHNUT_OPTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 12, font: { size: 12 } } } }
};

function formatINR(n) {
  if (!n) return '₹0';
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n}`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    Promise.all([
      axios.get('/api/reports/dashboard'),
      axios.get('/api/activity?limit=5')
    ]).then(([r1, r2]) => {
      setData(r1.data);
      setActivity(r2.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;
  if (!data) return <div>Failed to load dashboard</div>;

  const { kpis, monthlyTrend, topVendors, rfqStatus, categorySpend } = data;

  const lineData = {
    labels: monthlyTrend.map(m => m.month),
    datasets: [{
      label: 'Procurement Spend (₹)',
      data: monthlyTrend.map(m => m.spend),
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99,102,241,0.1)',
      tension: 0.4,
      fill: true,
      pointBackgroundColor: '#6366f1',
    }]
  };

  const statusColors = { draft: '#64748b', open: '#3b82f6', closed: '#f59e0b', awarded: '#10b981', cancelled: '#ef4444' };
  const doughnutData = {
    labels: rfqStatus.map(r => r.status),
    datasets: [{
      data: rfqStatus.map(r => r.count),
      backgroundColor: rfqStatus.map(r => statusColors[r.status] || '#6366f1'),
      borderWidth: 0,
    }]
  };

  const barData = {
    labels: categorySpend.map(c => c.category),
    datasets: [{
      label: 'Spend by Category',
      data: categorySpend.map(c => c.spend),
      backgroundColor: ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444'],
      borderRadius: 6,
    }]
  };

  const kpiCards = [
    { label: 'Pending Approvals', value: kpis.pendingApprovals, icon: '⚡', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', link: '/approvals' },
    { label: 'Active RFQs', value: kpis.activeRFQs, icon: '📋', color: '#6366f1', bg: 'rgba(99,102,241,0.1)', link: '/rfq' },
    { label: 'Total POs', value: kpis.totalPOs, icon: '🛒', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)', link: '/purchase-orders' },
    { label: 'Vendors', value: kpis.totalVendors, icon: '🏢', color: '#10b981', bg: 'rgba(16,185,129,0.1)', link: '/vendors' },
    { label: 'Total Spend', value: formatINR(kpis.totalSpend), icon: '💰', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', link: '/reports' },
    { label: 'Unpaid Invoices', value: kpis.unpaidInvoices, icon: '📄', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', link: '/invoices' },
  ];

  const actionColor = (a) => {
    const m = { CREATE: '#6366f1', APPROVE: '#10b981', REJECT: '#ef4444', SUBMIT: '#06b6d4', UPDATE: '#f59e0b' };
    return m[a] || '#64748b';
  };

  return (
    <div>
      {/* KPI Cards */}
      <div className="kpi-grid">
        {kpiCards.map(k => (
          <div key={k.label} className="kpi-card" style={{ cursor: 'pointer' }} onClick={() => navigate(k.link)}>
            <div className="kpi-icon" style={{ background: k.bg }}>
              <span style={{ fontSize: 22 }}>{k.icon}</span>
            </div>
            <div className="kpi-value" style={{ color: k.color }}>{k.value}</div>
            <div className="kpi-label">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid-2 mb-6">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Monthly Procurement Trend</div>
              <div className="card-subtitle">Spending over the last 6 months</div>
            </div>
            <TrendingUp size={20} color="var(--primary-light)" />
          </div>
          <div style={{ height: 220 }}>
            <Line data={lineData} options={CHART_OPTS} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">RFQ Status Breakdown</div>
              <div className="card-subtitle">Current status distribution</div>
            </div>
          </div>
          <div style={{ height: 220 }}>
            <Doughnut data={doughnutData} options={DOUGHNUT_OPTS} />
          </div>
        </div>
      </div>

      <div className="grid-2 mb-6">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Spend by Category</div>
              <div className="card-subtitle">Procurement distribution by category</div>
            </div>
          </div>
          <div style={{ height: 220 }}>
            <Bar data={barData} options={{ ...CHART_OPTS, scales: { x: { ticks: { color: '#64748b', maxRotation: 45 }, grid: { color: 'rgba(255,255,255,0.05)' } }, y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } } } }} />
          </div>
        </div>

        {/* Top Vendors */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Top Vendors by Spend</div>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/vendors')}>View All <ArrowRight size={14} /></button>
          </div>
          {topVendors.length === 0 ? (
            <div className="empty-state" style={{ padding: 30 }}><div className="empty-state-icon">🏢</div><div className="empty-state-title">No vendor data yet</div></div>
          ) : topVendors.map((v, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{i + 1}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{v.company_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{v.po_count} orders</div>
                </div>
              </div>
              <div style={{ color: 'var(--primary-light)', fontWeight: 700 }}>{formatINR(v.total_spend)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions + Recent Activity */}
      <div className="grid-2">
        <div className="card">
          <div className="card-header"><div className="card-title">Quick Actions</div></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'New RFQ', icon: '📋', color: '#6366f1', to: '/rfq' },
              { label: 'New Vendor', icon: '🏢', color: '#10b981', to: '/vendors' },
              { label: 'View Approvals', icon: '✅', color: '#f59e0b', to: '/approvals' },
              { label: 'Generate Invoice', icon: '📄', color: '#06b6d4', to: '/invoices' },
              { label: 'Compare Quotes', icon: '⚖️', color: '#8b5cf6', to: '/quotations' },
              { label: 'View Reports', icon: '📊', color: '#ef4444', to: '/reports' },
            ].map(a => (
              <button key={a.label} onClick={() => navigate(a.to)}
                style={{ padding: '14px', background: `rgba(${a.color === '#6366f1' ? '99,102,241' : a.color === '#10b981' ? '16,185,129' : a.color === '#f59e0b' ? '245,158,11' : a.color === '#06b6d4' ? '6,182,212' : a.color === '#8b5cf6' ? '139,92,246' : '239,68,68'},0.1)`, border: `1px solid ${a.color}33`, borderRadius: 10, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <span style={{ fontSize: 22 }}>{a.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Recent Activity</div>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/activity')}>View All</button>
          </div>
          <div className="timeline">
            {activity.length === 0 && <div className="empty-state" style={{ padding: 20 }}><div>No activity yet</div></div>}
            {activity.map((log, i) => (
              <div key={log.id} className="timeline-item">
                <div className={`timeline-dot`} style={{ background: actionColor(log.action) }} />
                <div className="timeline-content">
                  <div className="timeline-title" style={{ fontSize: 13 }}>{log.description}</div>
                  <div className="timeline-meta">{log.user_name} • {new Date(log.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
