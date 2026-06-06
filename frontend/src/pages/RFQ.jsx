import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Plus, Search, Eye, Trash2, X, FileText, Calendar, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const statusBadge = (s) => {
  const m = { draft: 'muted', open: 'info', closed: 'warning', awarded: 'success', cancelled: 'danger' };
  return <span className={`badge badge-${m[s] || 'muted'}`}>{s}</span>;
};

function RFQModal({ onClose, onSave }) {
  const [step, setStep] = useState(1);
  const [vendors, setVendors] = useState([]);
  const [form, setForm] = useState({ title: '', description: '', deadline: '', items: [{ product_name: '', quantity: 1, unit: 'pcs', specifications: '' }], vendorIds: [] });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    axios.get('/api/vendors?status=active').then(r => setVendors(r.data));
  }, []);

  const addItem = () => set('items', [...form.items, { product_name: '', quantity: 1, unit: 'pcs', specifications: '' }]);
  const removeItem = (i) => set('items', form.items.filter((_, idx) => idx !== i));
  const updateItem = (i, k, v) => {
    const items = [...form.items];
    items[i] = { ...items[i], [k]: v };
    set('items', items);
  };

  const toggleVendor = (id) => {
    const ids = form.vendorIds.includes(id) ? form.vendorIds.filter(x => x !== id) : [...form.vendorIds, id];
    set('vendorIds', ids);
  };

  const handleSave = async () => {
    if (!form.title) return toast.error('RFQ title required');
    if (form.items.some(i => !i.product_name)) return toast.error('All items need a product name');
    setSaving(true);
    try {
      await axios.post('/api/rfq', form);
      toast.success('RFQ created successfully!');
      onSave();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <span className="modal-title">Create New RFQ</span>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Step indicators */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', padding: '0 24px' }}>
          {['Details', 'Items', 'Vendors'].map((s, i) => (
            <button key={s} onClick={() => setStep(i+1)}
              style={{ padding: '12px 20px', background: 'none', border: 'none', borderBottom: step === i+1 ? '2px solid var(--primary)' : '2px solid transparent', color: step === i+1 ? 'var(--primary-light)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', fontSize: 14, marginBottom: -1 }}>
              {i+1}. {s}
            </button>
          ))}
        </div>

        <div className="modal-body">
          {step === 1 && (
            <>
              <div className="form-group">
                <label className="form-label">RFQ Title *</label>
                <input className="form-control" value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Laptop Procurement Q2 2024" />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-control" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe the procurement requirement..." rows={4} />
              </div>
              <div className="form-group">
                <label className="form-label">Deadline *</label>
                <input className="form-control" type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)} min={new Date().toISOString().split('T')[0]} />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontWeight: 600 }}>Line Items ({form.items.length})</span>
                <button className="btn btn-secondary btn-sm" onClick={addItem}><Plus size={14} /> Add Item</button>
              </div>
              {form.items.map((item, i) => (
                <div key={i} style={{ padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 10, marginBottom: 12, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Item {i+1}</span>
                    {form.items.length > 1 && <button className="btn btn-danger btn-icon btn-sm" onClick={() => removeItem(i)}><X size={13} /></button>}
                  </div>
                  <div className="form-row">
                    <div className="form-group" style={{ marginBottom: 8 }}>
                      <label className="form-label">Product/Service *</label>
                      <input className="form-control" value={item.product_name} onChange={e => updateItem(i, 'product_name', e.target.value)} placeholder="e.g. Dell Laptop" />
                    </div>
                    <div className="form-row" style={{ gap: 8 }}>
                      <div className="form-group" style={{ marginBottom: 8 }}>
                        <label className="form-label">Quantity</label>
                        <input className="form-control" type="number" min="1" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} />
                      </div>
                      <div className="form-group" style={{ marginBottom: 8 }}>
                        <label className="form-label">Unit</label>
                        <select className="form-control" value={item.unit} onChange={e => updateItem(i, 'unit', e.target.value)}>
                          {['pcs','kg','L','m','box','set','pair','unit'].map(u => <option key={u}>{u}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Specifications</label>
                    <input className="form-control" value={item.specifications} onChange={e => updateItem(i, 'specifications', e.target.value)} placeholder="Technical specifications..." />
                  </div>
                </div>
              ))}
            </>
          )}

          {step === 3 && (
            <>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Select Vendors to Invite ({form.vendorIds.length} selected)</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Choose which vendors to send this RFQ to</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
                {vendors.map(v => (
                  <div key={v.id} onClick={() => toggleVendor(v.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: form.vendorIds.includes(v.id) ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${form.vendorIds.includes(v.id) ? 'rgba(99,102,241,0.4)' : 'var(--border)'}`, borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s' }}>
                    <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${form.vendorIds.includes(v.id) ? 'var(--primary)' : 'var(--border-strong)'}`, background: form.vendorIds.includes(v.id) ? 'var(--primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {form.vendorIds.includes(v.id) && <span style={{ color: 'white', fontSize: 12 }}>✓</span>}
                    </div>
                    <div style={{ width: 36, height: 36, background: 'var(--gradient-primary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{v.company_name[0]}</div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{v.company_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{v.category} • ★ {v.rating}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          {step > 1 && <button className="btn btn-secondary" onClick={() => setStep(s => s-1)}>← Back</button>}
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          {step < 3
            ? <button className="btn btn-primary" onClick={() => { if (step === 1 && !form.title) return toast.error('Title required'); setStep(s => s+1); }}>Next →</button>
            : <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? <div className="spinner spinner-sm" /> : '🚀 Create RFQ'}</button>
          }
        </div>
      </div>
    </div>
  );
}

export default function RFQ() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rfqs, setRFQs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [detail, setDetail] = useState(null);

  const fetch = async () => {
    setLoading(true);
    try {
      const r = await axios.get('/api/rfq');
      setRFQs(r.data);
    } catch { toast.error('Failed to load RFQs'); }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const filtered = rfqs.filter(r => r.title?.toLowerCase().includes(search.toLowerCase()) || r.rfq_number?.toLowerCase().includes(search.toLowerCase()));

  const openDetail = async (rfq) => {
    const r = await axios.get(`/api/rfq/${rfq.id}`);
    setDetail(r.data);
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>RFQ Management</h1>
          <p>Request for Quotations — {rfqs.length} total</p>
        </div>
        {['admin','procurement_officer'].includes(user?.role) && (
          <button id="create-rfq-btn" className="btn btn-primary" onClick={() => setModal(true)}>
            <Plus size={16} /> Create RFQ
          </button>
        )}
      </div>

      <div className="search-bar">
        <div className="search-input-wrap">
          <Search className="search-icon" size={16} />
          <input className="form-control" placeholder="Search RFQs..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 38 }} />
        </div>
      </div>

      {loading ? <div className="loading-page"><div className="spinner" /></div> : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>RFQ Number</th>
                <th>Title</th>
                <th>Status</th>
                <th>Deadline</th>
                <th>Vendors</th>
                <th>Quotations</th>
                <th>Created By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>No RFQs found
                </td></tr>
              )}
              {filtered.map(r => (
                <tr key={r.id}>
                  <td><span className="text-primary-color font-bold">{r.rfq_number}</span></td>
                  <td><div style={{ fontWeight: 600 }}>{r.title}</div><div style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description}</div></td>
                  <td>{statusBadge(r.status)}</td>
                  <td style={{ color: new Date(r.deadline) < new Date() ? 'var(--danger)' : 'var(--text-secondary)', fontSize: 13 }}>
                    {r.deadline ? new Date(r.deadline).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td><span className="badge badge-muted"><Users size={11} style={{ display: 'inline', marginRight: 3 }} />{r.vendor_count || 0}</span></td>
                  <td><span className="badge badge-info">{r.quotation_count || 0} quotes</span></td>
                  <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{r.created_by_name}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-secondary btn-sm btn-icon" onClick={() => openDetail(r)} title="View"><Eye size={14} /></button>
                      {r.quotation_count > 0 && (
                        <button className="btn btn-primary btn-sm" onClick={() => navigate(`/quotations/compare/${r.id}`)} title="Compare">⚖️</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && <RFQModal onClose={() => setModal(false)} onSave={() => { setModal(false); fetch(); }} />}

      {detail && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDetail(null)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <div>
                <div className="modal-title">{detail.rfq_number}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{detail.title}</div>
              </div>
              <button className="modal-close" onClick={() => setDetail(null)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-row" style={{ marginBottom: 16 }}>
                <div><span className="form-label">Status</span> {statusBadge(detail.status)}</div>
                <div><span className="form-label">Deadline</span> <span style={{ fontSize: 14 }}>{detail.deadline ? new Date(detail.deadline).toLocaleDateString('en-IN') : '—'}</span></div>
              </div>
              <div style={{ marginBottom: 16 }}><span className="form-label">Description</span><p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>{detail.description || '—'}</p></div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Line Items ({detail.items?.length || 0})</div>
                <div className="table-wrapper">
                  <table className="table">
                    <thead><tr><th>Product</th><th>Qty</th><th>Unit</th><th>Specifications</th></tr></thead>
                    <tbody>
                      {(detail.items || []).map(item => (
                        <tr key={item.id}><td>{item.product_name}</td><td>{item.quantity}</td><td>{item.unit}</td><td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{item.specifications}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Invited Vendors ({detail.vendors?.length || 0})</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(detail.vendors || []).map(v => (
                    <span key={v.id} className={`badge ${v.invite_status === 'quoted' ? 'badge-success' : v.invite_status === 'selected' ? 'badge-primary' : 'badge-muted'}`}>
                      🏢 {v.company_name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDetail(null)}>Close</button>
              {detail.quotation_count > 0 && <button className="btn btn-primary" onClick={() => { setDetail(null); navigate(`/quotations/compare/${detail.id}`); }}>⚖️ Compare Quotations</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
