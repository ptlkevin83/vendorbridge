import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, X, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const pageTitles = {
  '/': { title: 'Dashboard', sub: 'Procurement overview & analytics' },
  '/vendors': { title: 'Vendors', sub: 'Manage your vendor network' },
  '/rfq': { title: 'RFQs', sub: 'Request for Quotations' },
  '/quotations': { title: 'Quotations', sub: 'Vendor quotation management' },
  '/approvals': { title: 'Approvals', sub: 'Review procurement requests' },
  '/purchase-orders': { title: 'Purchase Orders', sub: 'Manage purchase orders' },
  '/invoices': { title: 'Invoices', sub: 'Invoice management' },
  '/activity': { title: 'Activity Logs', sub: 'Audit trail & history' },
  '/reports': { title: 'Reports', sub: 'Procurement insights' },
};

export default function Header({ onMenuClick }) {
  const location = useLocation();
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);

  const path = Object.keys(pageTitles).find(p => {
    if (p === '/') return location.pathname === '/';
    return location.pathname.startsWith(p);
  });
  const pageInfo = pageTitles[path] || { title: 'VendorBridge', sub: '' };

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchUnread = async () => {
    try {
      const r = await axios.get('/api/notifications/unread-count');
      setUnread(r.data.count || 0);
    } catch {}
  };

  const fetchNotifs = async () => {
    try {
      const r = await axios.get('/api/notifications');
      setNotifs(r.data);
    } catch {}
  };

  const toggleNotifs = () => {
    if (!showNotifs) fetchNotifs();
    setShowNotifs(!showNotifs);
  };

  const markAllRead = async () => {
    try {
      await axios.put('/api/notifications/read-all');
      setUnread(0);
      setNotifs(notifs.map(n => ({ ...n, is_read: 1 })));
    } catch {}
  };

  const formatTime = (t) => {
    if (!t) return '';
    try {
      const d = new Date(t);
      const diffMins = Math.floor((new Date() - d) / 60000);
      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch { return ''; }
  };

  const typeIcon = (type) => ({ success: '✅', warning: '⚠️', danger: '❌', info: 'ℹ️' })[type] || 'ℹ️';

  return (
    <>
      <header className="header">
        <button className="header-menu-btn" onClick={onMenuClick} aria-label="Open sidebar">
          <Menu size={22} />
        </button>

        <div className="header-title-wrap">
          <div className="header-title">{pageInfo.title}</div>
          <div className="header-subtitle">{pageInfo.sub}</div>
        </div>

        <div className="header-actions">
          <button id="notif-bell" className="notif-btn" onClick={toggleNotifs} aria-label="Notifications">
            <Bell size={17} />
            {unread > 0 && <span className="notif-dot" />}
          </button>
        </div>
      </header>

      {showNotifs && (
        <div className="notif-panel">
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--bg-glass)' }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>
              Notifications {unread > 0 && <span className="badge badge-danger" style={{ marginLeft: 8 }}>{unread}</span>}
            </span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {unread > 0 && <button className="btn btn-sm btn-secondary" onClick={markAllRead}>Mark read</button>}
              <button onClick={() => setShowNotifs(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}><X size={16} /></button>
            </div>
          </div>
          {notifs.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <div className="empty-state-icon">🔔</div>
              <div className="empty-state-title">No notifications</div>
            </div>
          ) : notifs.map(n => (
            <div key={n.id} className={`notif-item${!n.is_read ? ' unread' : ''}`}>
              <div className="notif-title">{typeIcon(n.type)} {n.title}</div>
              <div className="notif-message">{n.message}</div>
              <div className="notif-time">{formatTime(n.created_at)}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
