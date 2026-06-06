import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Building2, FileText, Quote, CheckSquare,
  ShoppingCart, Receipt, Activity, BarChart3, LogOut, X
} from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { section: 'Procurement' },
  { to: '/rfq', label: 'RFQs', icon: FileText, roles: ['admin','procurement_officer','manager'] },
  { to: '/quotations', label: 'Quotations', icon: Quote },
  { to: '/approvals', label: 'Approvals', icon: CheckSquare, roles: ['admin','manager','procurement_officer'] },
  { to: '/purchase-orders', label: 'Purchase Orders', icon: ShoppingCart, roles: ['admin','procurement_officer','manager'] },
  { to: '/invoices', label: 'Invoices', icon: Receipt, roles: ['admin','procurement_officer','manager'] },
  { section: 'Management' },
  { to: '/vendors', label: 'Vendors', icon: Building2 },
  { section: 'Analytics' },
  { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['admin','procurement_officer','manager'] },
  { to: '/activity', label: 'Activity Logs', icon: Activity },
];

const roleColors = {
  admin: '#ef4444',
  procurement_officer: '#6366f1',
  manager: '#f59e0b',
  vendor: '#10b981'
};

const roleNames = {
  admin: 'Admin',
  procurement_officer: 'Proc. Officer',
  manager: 'Manager',
  vendor: 'Vendor'
};

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
    onClose && onClose();
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  const canSee = (item) => {
    if (!item.roles) return true;
    return item.roles.includes(user?.role);
  };

  const handleNavClick = () => {
    // Close sidebar on mobile after navigation
    if (window.innerWidth <= 768) onClose && onClose();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="sidebar-overlay show"
          onClick={onClose}
        />
      )}

      <aside className={`sidebar${isOpen ? ' open' : ''}`}>
        {/* Close button for mobile */}
        <button className="sidebar-close-btn" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="sidebar-logo">
          <div className="logo-icon">🔗</div>
          <div>
            <div className="logo-text">VendorBridge</div>
            <div className="logo-sub">Procurement ERP</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item, i) => {
            if (item.section) return <div key={i} className="nav-section-title">{item.section}</div>;
            if (!canSee(item)) return null;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                onClick={handleNavClick}
              >
                <item.icon className="nav-icon" size={18} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-user">
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <div className="user-name">{user?.name}</div>
            <div className="user-role" style={{ color: roleColors[user?.role] }}>
              {roleNames[user?.role] || user?.role}
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </aside>
    </>
  );
}
