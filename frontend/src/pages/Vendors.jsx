import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Building2, Plus, Search, Star, Edit, Trash2, X, MapPin, Phone, Mail, Hash } from 'lucide-react';

const CATEGORIES = ['Electronics', 'Manufacturing', 'Office Supplies', 'Construction', 'Security Services', 'IT Services', 'Logistics', 'Furniture', 'Healthcare', 'Other'];

function StarRating({ rating, onChange }) {
  return (
    <div className="stars" style={{ cursor: onChange ? 'pointer' : 'default' }}>
      {[1,2,3,4,5].map(s => (
        <span key={s} className={`star${s <= Math.round(rating) ? '' : ' empty'}`}
          onClick={() => onChange && onChange(s)}>★</span>
      ))}
    </div>
  );
}

function VendorModal({ vendor, onClose, onSave }) {
  const [form, setForm] = useState(vendor || { company_name:'', category:'Electronics', gst_number:'', contact_name:'', email:'', phone:'', address:'', city:'', state:'', status:'active', rating:0, notes:'' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.company_name) return toast.error('Company name required');
    setSaving(true);
    try {
      if (vendor?.id) {
        await axios.put(`/api/vendors/${vendor.id}`, form);
        toast.success('Vendor updated!');
      } else {
        await axios.post('/api/vendors', form);
        toast.success('Vendor registered!');
      }
      onSave();
    } catch (err) { toast.error(err.response?.data?.error || 'Error saving vendor'); }
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <span className="modal-title">{vendor?.id ? 'Edit Vendor' : 'Register New Vendor'}</span>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Company Name *</label>
              <input className="form-control" value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="e.g. TechSupply Co" />
            </div>
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select className="form-control" value={form.category} onChange={e => set('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">GST Number</label>
              <input className="form-control" value={form.gst_number} onChange={e => set('gst_number', e.target.value)} placeholder="GSTIN" />
            </div>
            <div className="form-group">
              <label className="form-label">Contact Person</label>
              <input className="form-control" value={form.contact_name} onChange={e => set('contact_name', e.target.value)} placeholder="John Smith" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-control" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="vendor@company.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-control" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91-9999999999" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Address</label>
            <input className="form-control" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Street address" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">City</label>
              <input className="form-control" value={form.city} onChange={e => set('city', e.target.value)} placeholder="Mumbai" />
            </div>
            <div className="form-group">
              <label className="form-label">State</label>
              <input className="form-control" value={form.state} onChange={e => set('state', e.target.value)} placeholder="Maharashtra" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-control" value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="blacklisted">Blacklisted</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Rating</label>
              <StarRating rating={form.rating} onChange={v => set('rating', v)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-control" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Additional notes..." />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <div className="spinner spinner-sm" /> : (vendor?.id ? '💾 Update' : '✨ Register')}
          </button>
        </div>
      </div>
    </div>
  );
}

const statusBadge = (s) => {
  const m = { active: 'success', inactive: 'warning', blacklisted: 'danger' };
  return <span className={`badge badge-${m[s] || 'muted'}`}>{s}</span>;
};

export default function Vendors() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modal, setModal] = useState(null); // null | 'create' | vendor object
  const [deleteId, setDeleteId] = useState(null);

  const fetch = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (filterCat) params.category = filterCat;
      if (filterStatus) params.status = filterStatus;
      const r = await axios.get('/api/vendors', { params });
      setVendors(r.data);
    } catch { toast.error('Failed to load vendors'); }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [search, filterCat, filterStatus]);

  const handleDelete = async () => {
    try {
      await axios.delete(`/api/vendors/${deleteId}`);
      toast.success('Vendor deleted');
      setDeleteId(null);
      fetch();
    } catch { toast.error('Delete failed'); }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Vendor Management</h1>
          <p>Manage your supplier and vendor network ({vendors.length} vendors)</p>
        </div>
        <button id="add-vendor-btn" className="btn btn-primary" onClick={() => setModal('create')}>
          <Plus size={16} /> Add Vendor
        </button>
      </div>

      <div className="search-bar">
        <div className="search-input-wrap" style={{ flex: 2 }}>
          <Search className="search-icon" size={16} />
          <input id="vendor-search" className="form-control" placeholder="Search vendors..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 38 }} />
        </div>
        <select className="form-control" style={{ width: 180 }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select className="form-control" style={{ width: 160 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="blacklisted">Blacklisted</option>
        </select>
      </div>

      {loading ? (
        <div className="loading-page"><div className="spinner" /></div>
      ) : vendors.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">🏢</div>
          <div className="empty-state-title">No vendors found</div>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 16 }}>Add your first vendor to get started</p>
          <button className="btn btn-primary" onClick={() => setModal('create')}><Plus size={16} /> Add Vendor</button>
        </div>
      ) : (
        <div className="grid-3" style={{ gap: 16 }}>
          {vendors.map(v => (
            <div key={v.id} className="card" style={{ transition: 'all 0.2s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, background: 'var(--gradient-primary)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, flexShrink: 0 }}>
                  {v.company_name[0]}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-secondary btn-icon btn-sm" onClick={() => setModal(v)}><Edit size={14} /></button>
                  <button className="btn btn-danger btn-icon btn-sm" onClick={() => setDeleteId(v.id)}><Trash2 size={14} /></button>
                </div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{v.company_name}</div>
              <div style={{ marginBottom: 8 }}>{statusBadge(v.status)} <span className="badge badge-primary" style={{ marginLeft: 4 }}>{v.category}</span></div>
              <StarRating rating={v.rating} />
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 5 }}>
                {v.contact_name && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}><Building2 size={13} />{v.contact_name}</div>}
                {v.email && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}><Mail size={13} />{v.email}</div>}
                {v.phone && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}><Phone size={13} />{v.phone}</div>}
                {v.gst_number && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)' }}><Hash size={13} />GST: {v.gst_number}</div>}
                {v.city && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)' }}><MapPin size={13} />{v.city}, {v.state}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {(modal === 'create' || (modal && modal.id)) && (
        <VendorModal vendor={modal === 'create' ? null : modal} onClose={() => setModal(null)} onSave={() => { setModal(null); fetch(); }} />
      )}

      {deleteId && (
        <div className="modal-overlay">
          <div className="modal modal-sm">
            <div className="modal-header"><span className="modal-title">Confirm Delete</span></div>
            <div className="modal-body"><p>Are you sure you want to delete this vendor? This action cannot be undone.</p></div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>🗑️ Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
