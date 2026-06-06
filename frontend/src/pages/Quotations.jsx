import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Plus, Eye, X, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const statusBadge = (s) => {
  const m = { submitted: 'info', under_review: 'warning', selected: 'success', rejected: 'danger' };
  return <span className={`badge badge-${m[s] || 'muted'}`}>{s?.replace('_',' ')}</span>;
};

function SubmitModal({ onClose, onSave }) {
  const { user } = useAuth();
  const [rfqs, setRFQs] = useState([]);
  const [rfqItems, setRFQItems] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [form, setForm] = useState({ rfq_id: '', vendor_id: '', total_amount: 0, delivery_days: 7, validity_days: 30, notes: '', items: [] });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    axios.get('/api/rfq?status=open').then(r => setRFQs(r.data));
    axios.get('/api/vendors?status=active').then(r => setVendors(r.data));
  }, []);

  const loadRFQItems = async (rfqId) => {
    if (!rfqId) return;
    const r = await axios.get(`/api/rfq/${rfqId}`);
    const items = (r.data.items || []).map(i => ({ rfq_item_id: i.id, product_name: i.product_name, quantity: i.quantity, unit: i.unit, unit_price: 0, total_price: 0 }));
    setRFQItems(items);
    set('items', items);
  };

  const updateItem = (i, k, v) => {
    const items = [...rfqItems];
    items[i] = { ...items[i], [k]: v };
    if (k === 'unit_price') items[i].total_price = parseFloat(v || 0) * parseFloat(items[i].quantity || 0);
    setRFQItems(items);
    set('items', items);
    const total = items.reduce((s, item) => s + (parseFloat(item.total_price) || 0), 0);
    set('total_amount', total);
  };

  const handleSave = async () => {
    if (!form.rfq_id || !form.vendor_id) return toast.error('RFQ and Vendor required');
    setSaving(true);
    try {
      await axios.post('/api/quotations', { ...form, rfq_id: parseInt(form.rfq_id), vendor_id: parseInt(form.vendor_id) });
      toast.success('Quotation submitted!');
      onSave();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <span className="modal-title">Submit Quotation</span>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">RFQ *</label>
              <select className="form-control" value={form.rfq_id} onChange={e => { set('rfq_id', e.target.value); loadRFQItems(e.target.value); }}>
                <option value="">Select RFQ...</option>
                {rfqs.map(r => <option key={r.id} value={r.id}>{r.rfq_number} — {r.title}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Vendor *</label>
              <select className="form-control" value={form.vendor_id} onChange={e => set('vendor_id', e.target.value)}>
                <option value="">Select Vendor...</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.company_name}</option>)}
              </select>
            </div>
          </div>

          {rfqItems.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 10 }}>Item Pricing</div>
              <div className="table-wrapper">
                <table className="table">
                  <thead><tr><th>Product</th><th>Qty</th><th>Unit</th><th>Unit Price (₹)</th><th>Total (₹)</th></tr></thead>
                  <tbody>
                    {rfqItems.map((item, i) => (
                      <tr key={i}>
                        <td>{item.product_name}</td>
                        <td>{item.quantity}</td>
                        <td>{item.unit}</td>
                        <td><input type="number" min="0" className="form-control" style={{ width: 120 }} value={item.unit_price} onChange={e => updateItem(i, 'unit_price', e.target.value)} /></td>
                        <td style={{ fontWeight: 600 }}>₹{parseFloat(item.total_price || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Delivery Days *</label>
              <input type="number" min="1" className="form-control" value={form.delivery_days} onChange={e => set('delivery_days', parseInt(e.target.value))} />
            </div>
            <div className="form-group">
              <label className="form-label">Total Amount (₹)</label>
              <input type="number" className="form-control" value={form.total_amount} onChange={e => set('total_amount', parseFloat(e.target.value))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes / Terms</label>
            <textarea className="form-control" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Payment terms, warranty info, etc." />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <div className="spinner spinner-sm" /> : <><Send size={14} /> Submit Quotation</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Quotations() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [detail, setDetail] = useState(null);

  const fetch = async () => {
    setLoading(true);
    try {
      const r = await axios.get('/api/quotations');
      setQuotations(r.data);
    } catch { toast.error('Failed to load quotations'); }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const openDetail = async (q) => {
    const r = await axios.get(`/api/quotations/${q.id}`);
    setDetail(r.data);
  };

  // Group by RFQ for comparison view
  const rfqGroups = quotations.reduce((acc, q) => {
    if (!acc[q.rfq_id]) acc[q.rfq_id] = { rfq_title: q.rfq_title, rfq_number: q.rfq_number, rfq_id: q.rfq_id, quotes: [] };
    acc[q.rfq_id].quotes.push(q);
    return acc;
  }, {});

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Quotations</h1>
          <p>Vendor quotation management — {quotations.length} total</p>
        </div>
        {['admin','procurement_officer','vendor'].includes(user?.role) && (
          <button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={16} /> Submit Quotation</button>
        )}
      </div>

      {loading ? <div className="loading-page"><div className="spinner" /></div> : quotations.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">💬</div>
          <div className="empty-state-title">No quotations yet</div>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Quotations will appear here once vendors submit them</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {Object.values(rfqGroups).map(group => (
            <div key={group.rfq_id} className="card">
              <div className="card-header" style={{ marginBottom: 12 }}>
                <div>
                  <div className="card-title">{group.rfq_number} — {group.rfq_title}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{group.quotes.length} quotations received</div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => navigate(`/quotations/compare/${group.rfq_id}`)}>⚖️ Compare</button>
              </div>
              <div className="table-wrapper">
                <table className="table">
                  <thead><tr><th>Vendor</th><th>Total Amount</th><th>Delivery (Days)</th><th>Rating</th><th>Status</th><th>Submitted</th><th>Actions</th></tr></thead>
                  <tbody>
                    {group.quotes.map(q => (
                      <tr key={q.id}>
                        <td><div style={{ fontWeight: 600 }}>{q.vendor_name}</div></td>
                        <td><span style={{ fontWeight: 700, color: 'var(--primary-light)' }}>₹{parseFloat(q.total_amount || 0).toLocaleString()}</span></td>
                        <td>{q.delivery_days} days</td>
                        <td><span style={{ color: 'var(--warning)' }}>★</span> {q.vendor_rating}</td>
                        <td>{statusBadge(q.status)}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{q.submitted_at ? new Date(q.submitted_at).toLocaleDateString('en-IN') : '—'}</td>
                        <td><button className="btn btn-secondary btn-sm btn-icon" onClick={() => openDetail(q)}><Eye size={14} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && <SubmitModal onClose={() => setModal(false)} onSave={() => { setModal(false); fetch(); }} />}

      {detail && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDetail(null)}>
          <div className="modal">
            <div className="modal-header">
              <div><div className="modal-title">Quotation Details</div><div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{detail.company_name}</div></div>
              <button className="modal-close" onClick={() => setDetail(null)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="grid-2" style={{ marginBottom: 16 }}>
                <div><div className="form-label">Total Amount</div><div style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary-light)' }}>₹{parseFloat(detail.total_amount || 0).toLocaleString()}</div></div>
                <div><div className="form-label">Delivery</div><div style={{ fontSize: 22, fontWeight: 800 }}>{detail.delivery_days} days</div></div>
              </div>
              {statusBadge(detail.status)}
              {detail.notes && <div style={{ marginTop: 12, padding: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}><div className="form-label">Notes</div><p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{detail.notes}</p></div>}
              {detail.items?.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Item Breakdown</div>
                  <div className="table-wrapper">
                    <table className="table">
                      <thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
                      <tbody>
                        {detail.items.map((i, idx) => (
                          <tr key={idx}><td>{i.product_name}</td><td>{i.quantity} {i.unit}</td><td>₹{parseFloat(i.unit_price || 0).toLocaleString()}</td><td style={{ fontWeight: 600 }}>₹{parseFloat(i.total_price || 0).toLocaleString()}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setDetail(null)}>Close</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
