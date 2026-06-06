import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { ShoppingCart, Plus, Eye, FileText, X, Package } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const statusBadgeClass = (status) => {
  const map = {
    issued: 'badge badge-primary',
    completed: 'badge badge-success',
    cancelled: 'badge badge-danger',
    pending: 'badge badge-warning',
  };
  return map[status] || 'badge badge-muted';
};

const formatCurrency = (val) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val ?? 0);

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const PO_STATUSES = ['issued', 'completed', 'cancelled'];

export default function PurchaseOrders() {
  const { user } = useAuth();

  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create PO modal
  const [createOpen, setCreateOpen] = useState(false);
  const [quotations, setQuotations] = useState([]);
  const [quotLoading, setQuotLoading] = useState(false);
  const [form, setForm] = useState({ quotation_id: '', delivery_address: '', notes: '' });
  const [creating, setCreating] = useState(false);

  // Detail modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);

  // Invoice generation
  const [generatingInvoice, setGeneratingInvoice] = useState(null);

  // Status update
  const [updatingStatus, setUpdatingStatus] = useState(null);

  const fetchPOs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/purchase-orders');
      setPos(Array.isArray(data) ? data : data.purchase_orders ?? data.purchaseOrders ?? []);
    } catch {
      toast.error('Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPOs();
  }, [fetchPOs]);

  const openCreate = async () => {
    setCreateOpen(true);
    setForm({ quotation_id: '', delivery_address: '', notes: '' });
    setQuotLoading(true);
    try {
      const { data } = await axios.get('/api/quotations?status=selected');
      setQuotations(Array.isArray(data) ? data : data.quotations ?? []);
    } catch {
      toast.error('Failed to load quotations');
      setQuotations([]);
    } finally {
      setQuotLoading(false);
    }
  };

  const closeCreate = () => {
    setCreateOpen(false);
    setForm({ quotation_id: '', delivery_address: '', notes: '' });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.quotation_id) {
      toast.error('Please select a quotation.');
      return;
    }
    if (!form.delivery_address.trim()) {
      toast.error('Delivery address is required.');
      return;
    }
    setCreating(true);
    try {
      await axios.post('/api/purchase-orders', {
        quotation_id: Number(form.quotation_id),
        delivery_address: form.delivery_address.trim(),
        notes: form.notes.trim(),
      });
      toast.success('Purchase order created successfully');
      closeCreate();
      fetchPOs();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Failed to create purchase order');
    } finally {
      setCreating(false);
    }
  };

  const openDetail = (po) => {
    setSelectedPO(po);
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setSelectedPO(null);
  };

  const generateInvoice = async (po) => {
    setGeneratingInvoice(po.id);
    try {
      await axios.post('/api/invoices', { po_id: po.id, tax_rate: 18 });
      toast.success('Invoice generated successfully');
      fetchPOs();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Failed to generate invoice');
    } finally {
      setGeneratingInvoice(null);
    }
  };

  const updateStatus = async (po, newStatus) => {
    setUpdatingStatus(po.id);
    try {
      await axios.put(`/api/purchase-orders/${po.id}`, { status: newStatus });
      toast.success(`Status updated to "${newStatus}"`);
      fetchPOs();
      if (selectedPO?.id === po.id) setSelectedPO((prev) => ({ ...prev, status: newStatus }));
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Failed to update status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header flex flex-between" style={{ marginBottom: '1.5rem' }}>
        <div className="page-header-left">
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Purchase Orders</h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Manage and track all purchase orders
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={openCreate}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <Plus size={16} />
          Create PO
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="loading-page">
          <div className="spinner" />
        </div>
      ) : pos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <ShoppingCart size={48} />
          </div>
          <div className="empty-state-title">No purchase orders yet</div>
          <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0 1rem' }}>
            Create your first purchase order from an approved quotation.
          </p>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={14} style={{ marginRight: '0.3rem' }} />
            Create PO
          </button>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Vendor</th>
                <th>RFQ</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pos.map((po) => (
                <tr
                  key={po.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => openDetail(po)}
                >
                  <td>
                    <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                      {po.po_number ?? `PO-${po.id}`}
                    </span>
                  </td>
                  <td>{po.vendor_name ?? '—'}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    {po.rfq_number ?? po.rfq_title ?? '—'}
                  </td>
                  <td style={{ fontWeight: 500 }}>{formatCurrency(po.total_amount ?? po.amount)}</td>
                  <td>
                    <span className={statusBadgeClass(po.status)} style={{ textTransform: 'capitalize' }}>
                      {po.status ?? 'issued'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    {formatDate(po.created_at ?? po.date)}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2">
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                        onClick={() => openDetail(po)}
                        title="View Details"
                      >
                        <Eye size={13} />
                        View
                      </button>
                      {!po.has_invoice && po.status !== 'cancelled' && (
                        <button
                          className="btn btn-primary"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                          onClick={() => generateInvoice(po)}
                          disabled={generatingInvoice === po.id}
                          title="Generate Invoice"
                        >
                          {generatingInvoice === po.id ? (
                            <span className="spinner" style={{ width: 12, height: 12 }} />
                          ) : (
                            <FileText size={13} />
                          )}
                          Invoice
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create PO Modal */}
      {createOpen && (
        <div className="modal-overlay" onClick={closeCreate}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShoppingCart size={18} />
                Create Purchase Order
              </h2>
              <button className="modal-close" onClick={closeCreate} aria-label="Close">
                &times;
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">
                    Quotation <span style={{ color: 'var(--danger, #ef4444)' }}>*</span>
                  </label>
                  {quotLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0' }}>
                      <span className="spinner" style={{ width: 16, height: 16 }} />
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Loading quotations…</span>
                    </div>
                  ) : (
                    <select
                      className="form-control"
                      value={form.quotation_id}
                      onChange={(e) => setForm((f) => ({ ...f, quotation_id: e.target.value }))}
                      required
                    >
                      <option value="">— Select a quotation —</option>
                      {quotations.map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.rfq_number ? `${q.rfq_number} — ` : ''}
                          {q.vendor_name ?? 'Unknown Vendor'} —{' '}
                          {formatCurrency(q.total_amount ?? q.amount)}
                        </option>
                      ))}
                    </select>
                  )}
                  {!quotLoading && quotations.length === 0 && (
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--warning, #f59e0b)' }}>
                      No approved quotations available. Please select a quotation first.
                    </p>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Delivery Address <span style={{ color: 'var(--danger, #ef4444)' }}>*</span>
                  </label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Enter full delivery address…"
                    value={form.delivery_address}
                    onChange={(e) => setForm((f) => ({ ...f, delivery_address: e.target.value }))}
                    required
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="Additional notes or instructions…"
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    style={{ resize: 'vertical' }}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeCreate} disabled={creating}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creating || quotLoading}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  {creating ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Plus size={14} />}
                  {creating ? 'Creating…' : 'Create Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailOpen && selectedPO && (
        <div className="modal-overlay" onClick={closeDetail}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 680, maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div className="modal-header">
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Package size={18} />
                Purchase Order Details
              </h2>
              <button className="modal-close" onClick={closeDetail} aria-label="Close">
                &times;
              </button>
            </div>
            <div className="modal-body">
              {/* PO Header Info */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.75rem 1.5rem',
                  marginBottom: '1.25rem',
                  padding: '1rem',
                  background: 'var(--bg-subtle, #f8f9fa)',
                  borderRadius: '8px',
                }}
              >
                <DetailField label="PO Number" value={selectedPO.po_number ?? `PO-${selectedPO.id}`} mono />
                <DetailField label="Status">
                  <span className={statusBadgeClass(selectedPO.status)} style={{ textTransform: 'capitalize' }}>
                    {selectedPO.status ?? 'issued'}
                  </span>
                </DetailField>
                <DetailField label="Vendor" value={selectedPO.vendor_name ?? '—'} />
                <DetailField label="RFQ" value={selectedPO.rfq_number ?? selectedPO.rfq_title ?? '—'} />
                <DetailField label="Total Amount" value={formatCurrency(selectedPO.total_amount ?? selectedPO.amount)} />
                <DetailField label="Created" value={formatDate(selectedPO.created_at)} />
                {selectedPO.delivery_address && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <DetailField label="Delivery Address" value={selectedPO.delivery_address} />
                  </div>
                )}
                {selectedPO.notes && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <DetailField label="Notes" value={selectedPO.notes} />
                  </div>
                )}
              </div>

              {/* Line Items */}
              {selectedPO.items && selectedPO.items.length > 0 && (
                <>
                  <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', fontWeight: 600 }}>Line Items</h4>
                  <div className="table-wrapper" style={{ marginBottom: '1.25rem' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Product / Description</th>
                          <th style={{ textAlign: 'right' }}>Qty</th>
                          <th style={{ textAlign: 'right' }}>Unit Price</th>
                          <th style={{ textAlign: 'right' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPO.items.map((item, idx) => (
                          <tr key={idx}>
                            <td>{item.product_name ?? item.description ?? `Item ${idx + 1}`}</td>
                            <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                            <td style={{ textAlign: 'right' }}>{formatCurrency(item.unit_price)}</td>
                            <td style={{ textAlign: 'right', fontWeight: 500 }}>
                              {formatCurrency((item.quantity ?? 0) * (item.unit_price ?? 0))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* Status Update */}
              {selectedPO.status !== 'cancelled' && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Update Status</label>
                  <div className="flex gap-2">
                    {PO_STATUSES.filter((s) => s !== selectedPO.status).map((s) => (
                      <button
                        key={s}
                        className={`btn ${s === 'completed' ? 'btn-success' : s === 'cancelled' ? 'btn-danger' : 'btn-secondary'}`}
                        style={{ textTransform: 'capitalize', fontSize: '0.85rem' }}
                        disabled={updatingStatus === selectedPO.id}
                        onClick={() => updateStatus(selectedPO, s)}
                      >
                        {updatingStatus === selectedPO.id ? (
                          <span className="spinner" style={{ width: 12, height: 12 }} />
                        ) : (
                          `Mark as ${s}`
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              {!selectedPO.has_invoice && selectedPO.status !== 'cancelled' && (
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    generateInvoice(selectedPO);
                    closeDetail();
                  }}
                  disabled={generatingInvoice === selectedPO.id}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <FileText size={14} />
                  Generate Invoice
                </button>
              )}
              <button className="btn btn-secondary" onClick={closeDetail}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailField({ label, value, mono, children }) {
  return (
    <div>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
        {label}
      </div>
      {children ? (
        children
      ) : (
        <div style={{ fontSize: '0.9rem', fontWeight: 500, fontFamily: mono ? 'monospace' : undefined }}>
          {value ?? '—'}
        </div>
      )}
    </div>
  );
}
