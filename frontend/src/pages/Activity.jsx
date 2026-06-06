import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Activity, Clock, Filter } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ACTION_CONFIG = {
  CREATE:  { dotClass: 'badge-info',    emoji: '➕', label: 'Created'  },
  APPROVE: { dotClass: 'badge-success', emoji: '✅', label: 'Approved' },
  REJECT:  { dotClass: 'badge-danger',  emoji: '❌', label: 'Rejected' },
  UPDATE:  { dotClass: 'badge-warning', emoji: '✏️', label: 'Updated'  },
  SUBMIT:  { dotClass: 'badge-primary', emoji: '📤', label: 'Submitted'},
  DELETE:  { dotClass: 'badge-danger',  emoji: '🗑️', label: 'Deleted'  },
  LOGIN:   { dotClass: 'badge-muted',   emoji: '🔑', label: 'Login'    },
};

function getActionConfig(action) {
  return ACTION_CONFIG[action?.toUpperCase()] || { dotClass: 'badge-muted', emoji: '📋', label: action };
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr  = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr  / 24);

  if (diffSec < 60)  return 'just now';
  if (diffMin < 60)  return `${diffMin}m ago`;
  if (diffHr  < 24)  return `${diffHr}h ago`;
  if (diffDay === 1) return 'yesterday';
  if (diffDay < 7)   return `${diffDay}d ago`;
  return date.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatFull(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('en-NZ', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function NotificationsSection({ notifications, loading }) {
  if (loading) {
    return (
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Activity size={18} />
          <h3 style={{ margin: 0 }}>Notifications</h3>
        </div>
        <div className="spinner" style={{ margin: '1rem auto' }} />
      </div>
    );
  }

  const unread = notifications.filter(n => !n.is_read);
  const read   = notifications.filter(n =>  n.is_read);

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <div className="flex flex-between" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity size={18} />
          <h3 style={{ margin: 0 }}>Notifications</h3>
          {unread.length > 0 && (
            <span className="badge badge-danger">{unread.length} unread</span>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="empty-state" style={{ padding: '1.5rem 0' }}>
          <div className="empty-state-icon">🔔</div>
          <div className="empty-state-title">No notifications</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[...unread, ...read].map(n => (
            <div
              key={n.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: n.is_read ? 'var(--bg-secondary, #f8fafc)' : 'var(--accent-light, #eef2ff)',
                borderLeft: n.is_read ? '3px solid transparent' : '3px solid #6366f1',
              }}
            >
              <span style={{ fontSize: '1.1rem', marginTop: '2px' }}>
                {n.type === 'APPROVAL_NEEDED' ? '⏳'
                  : n.type === 'APPROVED' ? '✅'
                  : n.type === 'REJECTED' ? '❌'
                  : n.type === 'NEW_QUOTATION' ? '📨'
                  : '🔔'}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: n.is_read ? 400 : 600, fontSize: '0.875rem' }}>
                  {n.message || n.title}
                </div>
                {n.body && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
                    {n.body}
                  </div>
                )}
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={11} />
                  {formatDate(n.created_at)}
                </div>
              </div>
              {!n.is_read && (
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', flexShrink: 0, marginTop: 6 }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const ALL_ACTIONS = ['ALL', 'CREATE', 'APPROVE', 'REJECT', 'UPDATE', 'SUBMIT', 'DELETE', 'LOGIN'];

export default function ActivityPage() {
  const { user } = useAuth();

  const [logs,          setLogs]          = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [logsLoading,   setLogsLoading]   = useState(true);
  const [notifLoading,  setNotifLoading]  = useState(true);
  const [error,         setError]         = useState(null);
  const [filterAction,  setFilterAction]  = useState('ALL');
  const [filterEntity,  setFilterEntity]  = useState('');

  const fetchLogs = useCallback(async () => {
    try {
      setLogsLoading(true);
      const res = await axios.get('/api/activity?limit=100');
      setLogs(res.data?.logs || res.data?.data || res.data || []);
    } catch (err) {
      setError('Failed to load activity logs.');
      console.error(err);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      setNotifLoading(true);
      const res = await axios.get('/api/notifications');
      setNotifications(res.data?.notifications || res.data?.data || res.data || []);
    } catch (err) {
      console.error('Notifications failed:', err);
    } finally {
      setNotifLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    fetchNotifications();
  }, [fetchLogs, fetchNotifications]);

  const entityTypes = [...new Set(logs.map(l => l.entity_type).filter(Boolean))].sort();

  const filtered = logs.filter(log => {
    const matchAction = filterAction === 'ALL' || log.action?.toUpperCase() === filterAction;
    const matchEntity = !filterEntity || log.entity_type === filterEntity;
    return matchAction && matchEntity;
  });

  const dotStyle = (dotClass) => {
    const map = {
      'badge-info':    '#06b6d4',
      'badge-success': '#10b981',
      'badge-danger':  '#ef4444',
      'badge-warning': '#f59e0b',
      'badge-primary': '#6366f1',
      'badge-muted':   '#94a3b8',
    };
    return map[dotClass] || '#94a3b8';
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '1.5rem' }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div className="page-header-left">
          <Activity size={22} style={{ color: '#6366f1' }} />
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Activity & Notifications</h1>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted, #64748b)' }}>
              System-wide activity log and your notifications
            </p>
          </div>
        </div>
        <button className="btn btn-secondary" onClick={() => { fetchLogs(); fetchNotifications(); }}>
          Refresh
        </button>
      </div>

      {error && (
        <div className="badge badge-danger" style={{ display: 'block', padding: '0.75rem 1rem', marginBottom: '1rem', borderRadius: 8, fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* Notifications */}
      <NotificationsSection notifications={notifications} loading={notifLoading} />

      {/* Activity Log */}
      <div className="card">
        {/* Filters */}
        <div className="flex flex-between" style={{ marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={18} style={{ color: '#6366f1' }} />
            <h3 style={{ margin: 0 }}>Activity Log</h3>
            <span className="badge badge-muted">{filtered.length}</span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Filter size={14} style={{ color: '#64748b' }} />
              <select
                className="form-control"
                value={filterAction}
                onChange={e => setFilterAction(e.target.value)}
                style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
              >
                {ALL_ACTIONS.map(a => (
                  <option key={a} value={a}>{a === 'ALL' ? 'All Actions' : getActionConfig(a).label}</option>
                ))}
              </select>
            </div>
            {entityTypes.length > 0 && (
              <select
                className="form-control"
                value={filterEntity}
                onChange={e => setFilterEntity(e.target.value)}
                style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
              >
                <option value="">All Entities</option>
                {entityTypes.map(e => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {logsLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
            <div className="spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">No activity found</div>
            <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.875rem' }}>
              {filterAction !== 'ALL' || filterEntity
                ? 'Try adjusting your filters.'
                : 'Activity will appear here as users interact with the system.'}
            </p>
          </div>
        ) : (
          <div className="timeline">
            {filtered.map((log, idx) => {
              const cfg = getActionConfig(log.action);
              const color = dotStyle(cfg.dotClass);
              return (
                <div
                  key={log.id || idx}
                  className="timeline-item"
                  style={{ display: 'flex', gap: '1rem', position: 'relative', paddingBottom: idx < filtered.length - 1 ? '1.25rem' : 0 }}
                >
                  {/* Vertical line */}
                  {idx < filtered.length - 1 && (
                    <div style={{
                      position: 'absolute',
                      left: 17,
                      top: 36,
                      bottom: 0,
                      width: 2,
                      background: 'var(--border-color, #e2e8f0)',
                      zIndex: 0,
                    }} />
                  )}

                  {/* Dot */}
                  <div
                    className={`timeline-dot ${cfg.dotClass}`}
                    style={{
                      flexShrink: 0,
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: `${color}18`,
                      border: `2px solid ${color}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1rem',
                      position: 'relative',
                      zIndex: 1,
                    }}
                  >
                    {cfg.emoji}
                  </div>

                  {/* Content */}
                  <div className="timeline-content" style={{ flex: 1, minWidth: 0, paddingTop: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span
                          className={`badge ${cfg.dotClass}`}
                          style={{ fontSize: '0.7rem', marginRight: '0.4rem', verticalAlign: 'middle' }}
                        >
                          {cfg.label}
                        </span>
                        {log.entity_type && (
                          <span className="badge badge-muted" style={{ fontSize: '0.7rem', marginRight: '0.4rem', verticalAlign: 'middle' }}>
                            {log.entity_type}
                          </span>
                        )}
                        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                          {log.description || log.message || `${cfg.label} action performed`}
                        </span>
                      </div>
                      <div
                        style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}
                        title={formatFull(log.created_at)}
                      >
                        <Clock size={11} />
                        {formatDate(log.created_at)}
                      </div>
                    </div>

                    <div style={{ marginTop: '0.2rem', fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
                      {log.user_name || log.user?.name ? (
                        <>By <strong>{log.user_name || log.user?.name}</strong></>
                      ) : null}
                      {log.entity_id && (
                        <span style={{ marginLeft: '0.5rem', opacity: 0.7 }}>#{log.entity_id}</span>
                      )}
                    </div>

                    {log.changes && (
                      <div style={{
                        marginTop: '0.4rem',
                        fontSize: '0.78rem',
                        color: 'var(--text-muted, #64748b)',
                        background: 'var(--bg-secondary, #f8fafc)',
                        borderRadius: 6,
                        padding: '0.35rem 0.6rem',
                        fontFamily: 'monospace',
                      }}>
                        {typeof log.changes === 'string' ? log.changes : JSON.stringify(log.changes)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
