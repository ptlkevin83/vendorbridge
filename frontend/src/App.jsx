import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Vendors from './pages/Vendors';
import RFQ from './pages/RFQ';
import Quotations from './pages/Quotations';
import QuotationComparison from './pages/QuotationComparison';
import Approvals from './pages/Approvals';
import PurchaseOrders from './pages/PurchaseOrders';
import Invoices from './pages/Invoices';
import Activity from './pages/Activity';
import Reports from './pages/Reports';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-page"><div className="spinner" /></div>;
  return user ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="vendors" element={<Vendors />} />
        <Route path="rfq" element={<RFQ />} />
        <Route path="quotations" element={<Quotations />} />
        <Route path="quotations/compare/:rfqId" element={<QuotationComparison />} />
        <Route path="approvals" element={<Approvals />} />
        <Route path="purchase-orders" element={<PurchaseOrders />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="activity" element={<Activity />} />
        <Route path="reports" element={<Reports />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
