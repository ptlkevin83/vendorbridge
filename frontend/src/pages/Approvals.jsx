import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Clock, User, DollarSign, FileText, Filter } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const STATUS_TABS = ['All', 'Pending', 'Approved', 'Rejected'];

const statusBadge = (status) => {
  const map = {
    pending: 'badge badge-warning',
    approved: 'badge badge-success',
    rejected: 'badge badge-danger',
  };
  return map[status] || 'badge badge-muted';
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount ?? 0);

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function Approvals() {
  const { user } = useAuth();
  const isManager = user?.role === 'manager' || user?.role === 'admin';

  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [actionType, setActionType] = useState(''); // 'approve' | 'reject'
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/approvals');
      setApprovals(Array.isArray(data) ? data : data.approvals ?? []);
    } catch (err) {
      toast.error('Failed to load approvals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  const filtered = approvals.filter((a) => {
    if (activeTab === 'All') return true;
    return a.status?.toLowerCase() === activeTab.toLowerCase();
  });

  const openModal = (approval, type) => {
    setSelectedApproval(approval);
    setActionType(type);
    setRemarks('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedApproval(null);
    setActionType('');
    setRemarks('');
  };

  const handleSubmit = async () => {
    if (!selectedApproval) return;
    if (actionType === 'reject' && !remarks.trim()) {
      toast.error('Please provide remarks for rejection.');
      return;
    }
    setSubmitting(true);
    try {
      await axios.put(`/api/approvals/${selectedApproval.id}`, {
        status: actionType === 'approve' ? 'approved' : 'rejected',
        remarks: remarks.trim(),
      });
      toast.success(`Approval ${actionType === 'approve' ? 'approved' : 'rejected'} successfully`);
      closeModal();
      fetchApprovals();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Action failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header flex flex-between" style={{ marginBottom: '1.5rem' }}>
        <div className="page-header-left">
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Approval Workflow</h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Review and manage RFQ approval requests
          </p>
        </div>
        <div className="flex gap-2" style={{ alignItems: 'center' }}>
          <Filter size={16} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            {filtered.length} record{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          borderBottom: '2px solid var(--border-color)',
          paddingBottom: '0',
        }}
      >
        {STATUS_TABS.map((tab) => {
          const count =
            tab === 'All'
              ? approvals.length
              : approvals.filter((a) => a.status?.toLowerCase() === tab.toLowerCase()).length;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '0.625rem 1.25rem',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: activeTab === tab ? 700 : 400,
                color: activeTab === tab ? 'var(--primary)' : 'var(--text-muted)',
                borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
                marginBottom: '-2px',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {tab}
              <span
                style={{
                  marginLeft: '0.4rem',
                  padding: '0.1rem 0.45rem',
                  borderRadius: '999px',
                  fontSize: '0.72rem',
                  background: activeTab === tab ? 'var(--primary)' : 'var(--border-color)',
                  color: activeTab === tab ? '#fff' : 'var(--text-muted)',
                  fontWeight: 600,
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="loading-page">
          <div className="spinner" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <CheckCircle size={48} />
          </div>
          <div className="empty-state-title">No {activeTab !== 'All' ? activeTab.toLowerCase() : ''} approvals found</div>
          <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0 0' }}>
            {activeTab === 'Pending'
              ? 'All caught up! No pending approvals at this time.'
              : 'There are no approval records matching the selected filter.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filtered.map((approval) => (
            <div key={approval.id} className="card" style={{ padding: '1.25rem' }}>
              <div className="flex flex-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                {/* Left Info */}
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div className="flex gap-2" style={{ alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
                      {approval.rfq_title ?? 'Untitled RFQ'}
                    </h3>
                    <span className={statusBadge(approval.status)} style={{ textTransform: 'capitalize' }}>
                      {approval.status}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.5rem 1.5rem' }}>
                    <InfoRow icon={<FileText size={14} />} label="RFQ #" value={approval.rfq_number ?? '—'} />
                    <InfoRow icon={<User size={14} />} label="Vendor" value={approval.vendor_name ?? '—'} />
                    <InfoRow
                      icon={<DollarSign size={14} />}
                      label="Amount"
                      value={formatCurrency(approval.total_amount)}
                    />
                    <InfoRow icon={<User size={14} />} label="Approver" value={approval.approver_name ?? '—'} />
                  </div>

                  {/* Remarks */}
                  {approval.remarks && (
                    <div
                      style={{
                        marginTop: '0.75rem',
                        padding: '0.5rem 0.75rem',
                        background: 'var(--bg-subtle, #f8f9fa)',
                        borderLeft: '3px solid var(--border-color)',
                        borderRadius: '0 4px 4px 0',
                        fontSize: '0.85rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <strong>Remarks:</strong> {approval.remarks}
                    </div>
                  )}
                </div>

                {/* Right: Timeline + Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-end' }}>
                  {/* Timeline */}
                  <div className="timeline" style={{ fontSize: '0.8rem', minWidth: 180 }}>
                    <div className="timeline-item">
                      <div
                        className="timeline-dot"
                        style={{ background: 'var(--primary)' }}
                      />
                      <div className="timeline-content">
                        <span style={{ fontWeight: 500 }}>Submitted</span>
                        <br />
                        <span style={{ color: 'var(--text-muted)' }}>{formatDate(approval.created_at)}</span>
                      </div>
                    </div>
                    {approval.approved_at && (
                      <div className="timeline-item">
                        <div
                          className="timeline-dot"
                          style={{
                            background:
                              approval.status === 'approved'
                                ? 'var(--success, #22c55e)'
                                : 'var(--danger, #ef4444)',
                          }}
                        />
                        <div className="timeline-content">
                          <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>
                            {approval.status}
                          </span>
                          <br />
                          <span style={{ color: 'var(--text-muted)' }}>{formatDate(approval.approved_at)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {isManager && approval.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        className="btn btn-success"
                        onClick={() => openModal(approval, 'approve')}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <CheckCircle size={14} />
                        Approve
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => openModal(approval, 'reject')}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <XCircle size={14} />
                        Reject
                      </button>
                    </div>
                  )}

                  {approval.status === 'pending' && !isManager && (
                    <div className="flex gap-2" style={{ alignItems: 'center' }}>
                      <Clock size={14} style={{ color: 'var(--warning, #f59e0b)' }} />
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Awaiting manager review</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approve / Reject Modal */}
      {modalOpen && selectedApproval && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2 className="modal-title">
                {actionType === 'approve' ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle size={18} style={{ color: 'var(--success, #22c55e)' }} />
                    Approve Request
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <XCircle size={18} style={{ color: 'var(--danger, #ef4444)' }} />
                    Reject Request
                  </span>
                )}
              </h2>
              <button className="modal-close" onClick={closeModal} aria-label="Close">
                &times;
              </button>
            </div>
            <div className="modal-body">
              {/* Summary */}
              <div
                style={{
                  padding: '0.75rem',
                  background: 'var(--bg-subtle, #f8f9fa)',
                  borderRadius: '6px',
                  marginBottom: '1rem',
                  fontSize: '0.875rem',
                }}
              >
                <div>
                  <strong>RFQ:</strong> {selectedApproval.rfq_title} ({selectedApproval.rfq_number})
                </div>
                <div>
                  <strong>Vendor:</strong> {selectedApproval.vendor_name}
                </div>
                <div>
                  <strong>Amount:</strong> {formatCurrency(selectedApproval.total_amount)}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Remarks{actionType === 'reject' && <span style={{ color: 'var(--danger, #ef4444)' }}> *</span>}
                </label>
                <textarea
                  className="form-control"
                  rows={4}
                  placeholder={
                    actionType === 'approve'
                      ? 'Optional remarks (e.g., approved as per policy)…'
                      : 'Please provide a reason for rejection…'
                  }
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

              {actionType === 'reject' && (
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  * Remarks are required when rejecting an approval.
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal} disabled={submitting}>
                Cancel
              </button>
              <button
                className={`btn ${actionType === 'approve' ? 'btn-success' : 'btn-danger'}`}
                onClick={handleSubmit}
                disabled={submitting}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                {submitting ? (
                  <span className="spinner" style={{ width: 14, height: 14 }} />
                ) : actionType === 'approve' ? (
                  <CheckCircle size={14} />
                ) : (
                  <XCircle size={14} />
                )}
                {submitting
                  ? 'Processing…'
                  : actionType === 'approve'
                  ? 'Confirm Approve'
                  : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
      <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{icon}</span>
      <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{label}:</span>
      <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}
