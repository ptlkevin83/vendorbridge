import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { LogIn, UserPlus, Eye, EyeOff } from 'lucide-react';

const DEMO = [
  { role: 'Admin', email: 'admin@vendorbridge.com', pass: 'admin123' },
  { role: 'Proc. Officer', email: 'officer@vendorbridge.com', pass: 'officer123' },
  { role: 'Manager', email: 'manager@vendorbridge.com', pass: 'manager123' },
  { role: 'Vendor', email: 'vendor1@vendorbridge.com', pass: 'vendor123' },
];

export default function Login() {
  const { login } = useAuth();
  const [tab, setTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'procurement_officer' });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error('Please fill all required fields');
    setLoading(true);
    try {
      const url = tab === 'login' ? '/api/auth/login' : '/api/auth/signup';
      const payload = tab === 'login' ? { email: form.email, password: form.password } : form;
      const r = await axios.post(url, payload);
      login(r.data.token, r.data.user);
      toast.success(tab === 'login' ? `Welcome back, ${r.data.user.name}!` : 'Account created! Welcome to VendorBridge!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Something went wrong');
    }
    setLoading(false);
  };

  const fillDemo = (d) => setForm(f => ({ ...f, email: d.email, password: d.pass }));

  return (
    <div className="login-page">
      <div className="login-bg-orbs">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">🔗</div>
          <h1>VendorBridge</h1>
          <p>Procurement & Vendor Management ERP</p>
        </div>

        <div className="login-tabs">
          <button id="tab-login" className={`login-tab${tab === 'login' ? ' active' : ''}`} onClick={() => setTab('login')}>
            <LogIn size={14} style={{ display: 'inline', marginRight: 4 }} /> Sign In
          </button>
          <button id="tab-signup" className={`login-tab${tab === 'signup' ? ' active' : ''}`} onClick={() => setTab('signup')}>
            <UserPlus size={14} style={{ display: 'inline', marginRight: 4 }} /> Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {tab === 'signup' && (
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input id="name-input" className="form-control" placeholder="John Doe" value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input id="email-input" className="form-control" type="email" placeholder="you@company.com" value={form.email} onChange={e => set('email', e.target.value)} required />
          </div>

          <div className="form-group">
            <label className="form-label">Password *</label>
            <div style={{ position: 'relative' }}>
              <input id="password-input" className="form-control" type={showPwd ? 'text' : 'password'} placeholder="••••••••" value={form.password} onChange={e => set('password', e.target.value)} required style={{ paddingRight: 40 }} />
              <button type="button" onClick={() => setShowPwd(!showPwd)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {tab === 'signup' && (
            <div className="form-group">
              <label className="form-label">Role</label>
              <select id="role-select" className="form-control" value={form.role} onChange={e => set('role', e.target.value)}>
                <option value="admin">Admin</option>
                <option value="procurement_officer">Procurement Officer</option>
                <option value="manager">Manager / Approver</option>
                <option value="vendor">Vendor</option>
              </select>
            </div>
          )}

          <button id="submit-btn" type="submit" className="btn btn-primary w-full" style={{ width: '100%', justifyContent: 'center', marginTop: 8, padding: '12px' }} disabled={loading}>
            {loading ? <div className="spinner spinner-sm" /> : (tab === 'login' ? '🚀 Sign In' : '✨ Create Account')}
          </button>
        </form>

        <div className="demo-accounts">
          <h4>🎯 Demo Accounts (click to fill)</h4>
          {DEMO.map(d => (
            <div key={d.role} className="demo-account" onClick={() => fillDemo(d)}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{d.role}</span>
              <span className="creds">{d.email}</span>
            </div>
          ))}
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>Password for all: role + 123 (e.g. admin123)</div>
        </div>
      </div>
    </div>
  );
}
