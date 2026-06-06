import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Receipt, Download, Printer, Send, Eye, X, CheckCircle, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const statusBadgeClass = (status) => {
  const map = {
    draft: 'badge badge-muted',
    sent: 'badge badge-info',
    paid: 'badge badge-success',
    overdue: 'badge badge-danger',
  };
  return map[status] || 'badge badge-muted';
};

const formatCurrency = (val) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val ?? 0);

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

const formatDateShort = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export default function Invoices() {
  const { user } = useAuth();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Detail / invoice view modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const invoiceRef = useRef(null);

  // Email modal
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailForm, setEmailForm] = useState({ recipient_email: '', recipient_name: '' });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailInvoice, setEmailInvoice] = useState(null);

  // Mark as paid
  const [markingPaid, setMarkingPaid] = useState(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/invoices');
      setInvoices(Array.isArray(data) ? data : data.invoices ?? []);
    } catch {
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const openDetail = (invoice) => {
    setSelectedInvoice(invoice);
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setSelectedInvoice(null);
  };

  // PDF generation using jsPDF + html2canvas
  const handleDownloadPDF = async () => {
    if (!invoiceRef.current) return;
    setDownloadingPDF(true);
    try {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      let posY = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();
      if (pdfHeight > pageHeight) {
        // Multi-page support
        let remainingHeight = pdfHeight;
        while (remainingHeight > 0) {
          pdf.addImage(imgData, 'PNG', 0, posY === 0 ? 0 : -(pdfHeight - remainingHeight), pdfWidth, pdfHeight);
          remainingHeight -= pageHeight;
          if (remainingHeight > 0) {
            pdf.addPage();
            posY += pageHeight;
          }
        }
      } else {
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      }
      const fileName = `Invoice-${selectedInvoice?.invoice_number ?? selectedInvoice?.id ?? 'download'}.pdf`;
      pdf.save(fileName);
      toast.success('PDF downloaded successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF');
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const openEmailModal = (invoice) => {
    setEmailInvoice(invoice);
    setEmailForm({ recipient_email: invoice.vendor_email ?? '', recipient_name: invoice.vendor_name ?? '' });
    setEmailOpen(true);
  };

  const closeEmailModal = () => {
    setEmailOpen(false);
    setEmailInvoice(null);
    setEmailForm({ recipient_email: '', recipient_name: '' });
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!emailForm.recipient_email.trim()) {
      toast.error('Recipient email is required.');
      return;
    }
    setSendingEmail(true);
    try {
      await axios.post(`/api/invoices/${emailInvoice.id}/send-email`, {
        recipient_email: emailForm.recipient_email.trim(),
        recipient_name: emailForm.recipient_name.trim(),
      });
      toast.success('Invoice sent via email successfully');
      closeEmailModal();
      fetchInvoices();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleMarkPaid = async (invoice) => {
    setMarkingPaid(invoice.id);
    try {
      await axios.put(`/api/invoices/${invoice.id}`, { status: 'paid' });
      toast.success('Invoice marked as paid');
      fetchInvoices();
      if (selectedInvoice?.id === invoice.id) {
        setSelectedInvoice((prev) => ({ ...prev, status: 'paid' }));
      }
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Failed to update invoice');
    } finally {
      setMarkingPaid(null);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header flex flex-between" style={{ marginBottom: '1.5rem' }}>
        <div className="page-header-left">
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Invoices</h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            View and manage all invoices
          </p>
        </div>
        <div className="flex gap-2" style={{ alignItems: 'center' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="loading-page">
          <div className="spinner" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Receipt size={48} />
          </div>
          <div className="empty-state-title">No invoices found</div>
          <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0 0' }}>
            Invoices are generated automatically from purchase orders.
          </p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>PO #</th>
                <th>Vendor</th>
                <th style={{ textAlign: 'right' }}>Subtotal</th>
                <th style={{ textAlign: 'right' }}>Tax</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th>Status</th>
                <th>Due Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr
                  key={inv.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => openDetail(inv)}
                >
                  <td>
                    <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                      {inv.invoice_number ?? `INV-${inv.id}`}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    {inv.po_number ?? '—'}
                  </td>
                  <td>{inv.vendor_name ?? '—'}</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(inv.subtotal)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
                    {formatCurrency(inv.tax_amount ?? inv.tax)}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    {formatCurrency(inv.total_amount ?? inv.total)}
                  </td>
                  <td>
                    <span className={statusBadgeClass(inv.status)} style={{ textTransform: 'capitalize' }}>
                      {inv.status ?? 'draft'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    {formatDateShort(inv.due_date)}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2">
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                        onClick={() => openDetail(inv)}
                        title="View Invoice"
                      >
                        <Eye size={13} />
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                        onClick={() => openEmailModal(inv)}
                        title="Send Email"
                      >
                        <Send size={13} />
                      </button>
                      {inv.status !== 'paid' && (
                        <button
                          className="btn btn-success"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                          onClick={() => handleMarkPaid(inv)}
                          disabled={markingPaid === inv.id}
                          title="Mark as Paid"
                        >
                          {markingPaid === inv.id ? (
                            <span className="spinner" style={{ width: 12, height: 12 }} />
                          ) : (
                            <CheckCircle size={13} />
                          )}
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

      {/* Invoice Detail / Template Modal */}
      {detailOpen && selectedInvoice && (
        <div className="modal-overlay" onClick={closeDetail}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 760, maxHeight: '95vh', overflowY: 'auto', padding: 0 }}
          >
            {/* Modal Actions Bar */}
            <div
              className="modal-header"
              style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-card, #fff)', borderBottom: '1px solid var(--border-color)' }}
            >
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Receipt size={18} />
                Invoice {selectedInvoice.invoice_number ?? `#${selectedInvoice.id}`}
              </h2>
              <div className="flex gap-2" style={{ alignItems: 'center' }}>
                <button
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                  onClick={handleDownloadPDF}
                  disabled={downloadingPDF}
                  title="Download PDF"
                >
                  {downloadingPDF ? (
                    <span className="spinner" style={{ width: 13, height: 13 }} />
                  ) : (
                    <Download size={14} />
                  )}
                  PDF
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                  onClick={handlePrint}
                  title="Print"
                >
                  <Printer size={14} />
                  Print
                </button>
                <button
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                  onClick={() => openEmailModal(selectedInvoice)}
                  title="Send Email"
                >
                  <Send size={14} />
                  Send
                </button>
                {selectedInvoice.status !== 'paid' && (
                  <button
                    className="btn btn-success"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                    onClick={() => handleMarkPaid(selectedInvoice)}
                    disabled={markingPaid === selectedInvoice.id}
                  >
                    {markingPaid === selectedInvoice.id ? (
                      <span className="spinner" style={{ width: 13, height: 13 }} />
                    ) : (
                      <CheckCircle size={14} />
                    )}
                    Mark Paid
                  </button>
                )}
                <button className="modal-close" onClick={closeDetail} aria-label="Close">
                  &times;
                </button>
              </div>
            </div>

            {/* Invoice Template */}
            <div style={{ padding: '1.5rem' }}>
              <div
                ref={invoiceRef}
                className="invoice-template"
                style={{
                  background: '#fff',
                  color: '#1a1a2e',
                  fontFamily: "'Segoe UI', system-ui, sans-serif",
                  padding: '2.5rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              >
                {/* Invoice Header */}
                <div
                  className="invoice-header"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '2.5rem',
                    paddingBottom: '1.5rem',
                    borderBottom: '2px solid #e5e7eb',
                  }}
                >
                  {/* Company */}
                  <div>
                    <div
                      style={{
                        fontSize: '1.75rem',
                        fontWeight: 800,
                        color: 'var(--primary, #6366f1)',
                        letterSpacing: '-0.02em',
                        marginBottom: '0.25rem',
                      }}
                    >
                      VendorBridge
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280', lineHeight: 1.6 }}>
                      Enterprise Resource Planning
                      <br />
                      procurement@vendorbridge.com
                    </div>
                  </div>

                  {/* Invoice Meta */}
                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        color: '#111827',
                        marginBottom: '0.5rem',
                      }}
                    >
                      INVOICE
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.8 }}>
                      <div>
                        <strong style={{ color: '#374151' }}>Invoice #:</strong>{' '}
                        <span style={{ fontFamily: 'monospace' }}>
                          {selectedInvoice.invoice_number ?? `INV-${selectedInvoice.id}`}
                        </span>
                      </div>
                      <div>
                        <strong style={{ color: '#374151' }}>PO #:</strong>{' '}
                        <span style={{ fontFamily: 'monospace' }}>
                          {selectedInvoice.po_number ?? '—'}
                        </span>
                      </div>
                      <div>
                        <strong style={{ color: '#374151' }}>Date:</strong>{' '}
                        {formatDate(selectedInvoice.created_at)}
                      </div>
                      <div>
                        <strong style={{ color: '#374151' }}>Due Date:</strong>{' '}
                        {formatDate(selectedInvoice.due_date)}
                      </div>
                    </div>
                    <div style={{ marginTop: '0.5rem' }}>
                      <span
                        className={statusBadgeClass(selectedInvoice.status)}
                        style={{ textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.07em' }}
                      >
                        {selectedInvoice.status ?? 'draft'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Vendor / Bill To */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1.5rem',
                    marginBottom: '2rem',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: '#9ca3af',
                        marginBottom: '0.5rem',
                      }}
                    >
                      Bill From
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '1rem', color: '#111827', marginBottom: '0.25rem' }}>
                      {selectedInvoice.vendor_name ?? 'Vendor Name'}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.6 }}>
                      {selectedInvoice.vendor_email && <div>{selectedInvoice.vendor_email}</div>}
                      {selectedInvoice.vendor_address && <div>{selectedInvoice.vendor_address}</div>}
                      {selectedInvoice.vendor_phone && <div>{selectedInvoice.vendor_phone}</div>}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: '#9ca3af',
                        marginBottom: '0.5rem',
                      }}
                    >
                      Bill To
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '1rem', color: '#111827', marginBottom: '0.25rem' }}>
                      VendorBridge Inc.
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.6 }}>
                      {selectedInvoice.delivery_address
                        ? selectedInvoice.delivery_address
                        : 'Procurement Department'}
                    </div>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="invoice-table" style={{ marginBottom: '1.5rem', overflowX: 'auto' }}>
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '0.875rem',
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          background: 'var(--primary, #6366f1)',
                          color: '#fff',
                        }}
                      >
                        <th style={{ padding: '0.625rem 0.875rem', textAlign: 'left', fontWeight: 600 }}>
                          Product / Description
                        </th>
                        <th style={{ padding: '0.625rem 0.875rem', textAlign: 'center', fontWeight: 600 }}>
                          Qty
                        </th>
                        <th style={{ padding: '0.625rem 0.875rem', textAlign: 'right', fontWeight: 600 }}>
                          Unit Price
                        </th>
                        <th style={{ padding: '0.625rem 0.875rem', textAlign: 'right', fontWeight: 600 }}>
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedInvoice.items ?? []).length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            style={{
                              padding: '1.5rem',
                              textAlign: 'center',
                              color: '#9ca3af',
                              fontStyle: 'italic',
                              borderBottom: '1px solid #f3f4f6',
                            }}
                          >
                            No line items available
                          </td>
                        </tr>
                      ) : (
                        (selectedInvoice.items ?? []).map((item, idx) => (
                          <tr
                            key={idx}
                            style={{
                              background: idx % 2 === 0 ? '#ffffff' : '#f9fafb',
                              borderBottom: '1px solid #f3f4f6',
                            }}
                          >
                            <td style={{ padding: '0.625rem 0.875rem', color: '#374151' }}>
                              <div style={{ fontWeight: 500 }}>
                                {item.product_name ?? item.name ?? `Item ${idx + 1}`}
                              </div>
                              {item.description && (
                                <div style={{ fontSize: '0.775rem', color: '#9ca3af', marginTop: '0.15rem' }}>
                                  {item.description}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '0.625rem 0.875rem', textAlign: 'center', color: '#374151' }}>
                              {item.quantity ?? 1}
                            </td>
                            <td style={{ padding: '0.625rem 0.875rem', textAlign: 'right', color: '#374151' }}>
                              {formatCurrency(item.unit_price)}
                            </td>
                            <td
                              style={{
                                padding: '0.625rem 0.875rem',
                                textAlign: 'right',
                                fontWeight: 600,
                                color: '#111827',
                              }}
                            >
                              {formatCurrency((item.quantity ?? 1) * (item.unit_price ?? 0))}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div
                  className="invoice-totals"
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    marginBottom: '2rem',
                  }}
                >
                  <div style={{ width: '100%', maxWidth: 320 }}>
                    <TotalRow label="Subtotal" value={formatCurrency(selectedInvoice.subtotal)} />
                    <TotalRow
                      label={`Tax (${selectedInvoice.tax_rate ?? 18}%)`}
                      value={formatCurrency(selectedInvoice.tax_amount ?? selectedInvoice.tax)}
                    />
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '0.75rem 0',
                        borderTop: '2px solid #111827',
                        marginTop: '0.25rem',
                      }}
                    >
                      <span style={{ fontWeight: 700, fontSize: '1rem', color: '#111827' }}>Grand Total</span>
                      <span
                        style={{
                          fontWeight: 800,
                          fontSize: '1.1rem',
                          color: 'var(--primary, #6366f1)',
                        }}
                      >
                        {formatCurrency(selectedInvoice.total_amount ?? selectedInvoice.total)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer / Notes */}
                <div
                  style={{
                    borderTop: '1px solid #e5e7eb',
                    paddingTop: '1rem',
                    fontSize: '0.775rem',
                    color: '#9ca3af',
                    textAlign: 'center',
                  }}
                >
                  Thank you for your business. Please remit payment by the due date.
                  <br />
                  For queries, contact procurement@vendorbridge.com
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send Email Modal */}
      {emailOpen && emailInvoice && (
        <div className="modal-overlay" onClick={closeEmailModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Mail size={18} />
                Send Invoice via Email
              </h2>
              <button className="modal-close" onClick={closeEmailModal} aria-label="Close">
                &times;
              </button>
            </div>
            <form onSubmit={handleSendEmail}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div
                  style={{
                    padding: '0.625rem 0.875rem',
                    background: 'var(--bg-subtle, #f8f9fa)',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                  }}
                >
                  <strong>Invoice:</strong>{' '}
                  {emailInvoice.invoice_number ?? `INV-${emailInvoice.id}`} —{' '}
                  {formatCurrency(emailInvoice.total_amount ?? emailInvoice.total)}
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Recipient Email <span style={{ color: 'var(--danger, #ef4444)' }}>*</span>
                  </label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="vendor@example.com"
                    value={emailForm.recipient_email}
                    onChange={(e) => setEmailForm((f) => ({ ...f, recipient_email: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Recipient Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Contact person name"
                    value={emailForm.recipient_name}
                    onChange={(e) => setEmailForm((f) => ({ ...f, recipient_name: e.target.value }))}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeEmailModal} disabled={sendingEmail}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={sendingEmail}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  {sendingEmail ? (
                    <span className="spinner" style={{ width: 14, height: 14 }} />
                  ) : (
                    <Send size={14} />
                  )}
                  {sendingEmail ? 'Sending…' : 'Send Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function TotalRow({ label, value }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '0.4rem 0',
        borderBottom: '1px solid #f3f4f6',
        fontSize: '0.875rem',
      }}
    >
      <span style={{ color: '#6b7280' }}>{label}</span>
      <span style={{ color: '#374151', fontWeight: 500 }}>{value}</span>
    </div>
  );
}
