import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, TrendingDown, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/* ─── Helpers ───────────────────────────────────────────────────────────────── */
function formatCurrency(val) {
  if (val === undefined || val === null) return '—';
  const num = Number(val);
  if (isNaN(num)) return '—';
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(num);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' });
}

function StarRating({ rating, max = 5 }) {
  const r = Math.round(Number(rating || 0) * 2) / 2;
  return (
    <span title={`${Number(rating || 0).toFixed(1)} / ${max}`}>
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          size={14}
          fill={i + 1 <= r ? '#f59e0b' : i + 0.5 === r ? '#f59e0b' : 'none'}
          color={i + 1 <= r || i + 0.5 === r ? '#f59e0b' : '#d1d5db'}
          style={{ display: 'inline', opacity: i + 0.5 === r ? 0.6 : 1 }}
        />
      ))}
      <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: 4 }}>
        {Number(rating || 0).toFixed(1)}
      </span>
    </span>
  );
}

/* ─── Toast ─────────────────────────────────────────────────────────────────── */
function Toast({ toasts }) {
  return (
    <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {toasts.map(t => (
        <div
          key={t.id}
          style={{
            background: t.type === 'success' ? '#10b981' : t.type === 'error' ? '#ef4444' : '#6366f1',
            color: '#fff',
            padding: '0.75rem 1.25rem',
            borderRadius: 10,
            boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            minWidth: 240,
            animation: 'slideIn 0.25s ease',
          }}
        >
          {t.type === 'success' ? <CheckCircle size={16} /> : t.type === 'error' ? '❌' : 'ℹ️'}
          {t.message}
        </div>
      ))}
    </div>
  );
}

let toastCounter = 0;

/* ─── Main Component ────────────────────────────────────────────────────────── */
export default function QuotationComparison() {
  const { rfqId }  = useParams();
  const navigate   = useNavigate();
  const { user }   = useAuth();

  const [rfq,        setRfq]        = useState(null);
  const [quotations, setQuotations] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [sortBy,     setSortBy]     = useState('price');      // price | delivery | rating
  const [submitting, setSubmitting] = useState({});           // { [quotation_id]: bool }
  const [submitted,  setSubmitted]  = useState({});           // { [quotation_id]: bool }
  const [toasts,     setToasts]     = useState([]);

  /* ── Toast helper ── */
  const addToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = ++toastCounter;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  /* ── Fetch ── */
  const fetchData = useCallback(async () => {
    if (!rfqId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`/api/quotations/compare/${rfqId}`);
      const data = res.data?.data || res.data;
      setRfq(data?.rfq || null);
      setQuotations(data?.quotations || data || []);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || 'Failed to load quotation comparison.');
    } finally {
      setLoading(false);
    }
  }, [rfqId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Submit for approval ── */
  const handleSubmitApproval = async (quotation) => {
    if (submitted[quotation.id]) return;
    const confirmed = window.confirm(
      `Submit quotation from "${quotation.vendor_name || quotation.vendor?.company_name || 'this vendor'}" for approval?`
    );
    if (!confirmed) return;

    setSubmitting(prev => ({ ...prev, [quotation.id]: true }));
    try {
      await axios.post('/api/approvals', {
        rfq_id:       rfqId,
        quotation_id: quotation.id,
      });
      setSubmitted(prev => ({ ...prev, [quotation.id]: true }));
      addToast(`Quotation submitted for approval successfully!`, 'success');
    } catch (err) {
      console.error(err);
      addToast(err?.response?.data?.message || 'Failed to submit for approval.', 'error');
    } finally {
      setSubmitting(prev => ({ ...prev, [quotation.id]: false }));
    }
  };

  /* ── Sort quotations ── */
  const sorted = [...quotations].sort((a, b) => {
    if (sortBy === 'price')    return (Number(a.total_amount || 0)) - (Number(b.total_amount || 0));
    if (sortBy === 'delivery') return (Number(a.delivery_days || 999)) - (Number(b.delivery_days || 999));
    if (sortBy === 'rating')   return (Number(b.vendor_rating || b.vendor?.rating || 0)) - (Number(a.vendor_rating || a.vendor?.rating || 0));
    return 0;
  });

  /* ── Find best values for highlighting ── */
  const lowestPrice    = Math.min(...quotations.map(q => Number(q.total_amount    || Infinity)));
  const fastestDel     = Math.min(...quotations.map(q => Number(q.delivery_days   || Infinity)));
  const highestRating  = Math.max(...quotations.map(q => Number(q.vendor_rating   || q.vendor?.rating || 0)));

  /* ── Collect all distinct item names across all quotations ── */
  const allItems = [];
  const itemKeySet = new Set();
  quotations.forEach(q => {
    (q.items || q.line_items || []).forEach(item => {
      const key = item.item_name || item.description || item.name || item.rfq_item_id;
      if (key && !itemKeySet.has(key)) {
        itemKeySet.add(key);
        allItems.push(key);
      }
    });
  });

  /* Lowest unit price per item for highlighting */
  const lowestItemPrice = {};
  allItems.forEach(itemKey => {
    const prices = quotations.map(q => {
      const itm = (q.items || q.line_items || []).find(
        i => (i.item_name || i.description || i.name || i.rfq_item_id) === itemKey
      );
      return itm ? Number(itm.unit_price || itm.price || 0) : Infinity;
    });
    lowestItemPrice[itemKey] = Math.min(...prices);
  });

  /* ── Cell style helper ── */
  const bestCell = {
    background: '#d1fae5',
    color: '#065f46',
    fontWeight: 700,
    borderRadius: 6,
    padding: '2px 6px',
    display: 'inline-block',
  };

  /* ── Status badge ── */
  const statusBadge = (status) => {
    const map = {
      SUBMITTED:  'badge-info',
      ACCEPTED:   'badge-success',
      REJECTED:   'badge-danger',
      PENDING:    'badge-warning',
      AWARDED:    'badge-primary',
    };
    return map[(status || '').toUpperCase()] || 'badge-muted';
  };

  /* ─── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div style={{ maxWidth: 1300, margin: '0 auto', padding: '1.5rem' }}>
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <Toast toasts={toasts} />

      {/* Back + Header */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div className="page-header-left">
          <button
            className="btn btn-secondary"
            onClick={() => navigate(-1)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Quotation Comparison</h1>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
              RFQ #{rfqId} — {quotations.length} quotation{quotations.length !== 1 ? 's' : ''} received
            </p>
          </div>
        </div>
        <button className="btn btn-secondary" onClick={fetchData}>Refresh</button>
      </div>

      {/* Error */}
      {error && (
        <div className="badge badge-danger" style={{ display: 'block', padding: '0.75rem 1rem', marginBottom: '1rem', borderRadius: 8, fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
          <div className="spinner" />
        </div>
      )}

      {!loading && (
        <>
          {/* RFQ Details Card */}
          {rfq && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: 2 }}>RFQ TITLE</div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>{rfq.title || `RFQ #${rfqId}`}</div>
                  {rfq.description && (
                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4, maxWidth: 500 }}>{rfq.description}</div>
                  )}
                </div>
                <div className="grid-3" style={{ gap: '1.5rem' }}>
                  {rfq.category && (
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>CATEGORY</div>
                      <span className="badge badge-info">{rfq.category}</span>
                    </div>
                  )}
                  {rfq.status && (
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>STATUS</div>
                      <span className={`badge ${statusBadge(rfq.status)}`}>{rfq.status}</span>
                    </div>
                  )}
                  {rfq.deadline && (
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>DEADLINE</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{formatDate(rfq.deadline)}</div>
                    </div>
                  )}
                  {rfq.budget && (
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>BUDGET</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#6366f1' }}>{formatCurrency(rfq.budget)}</div>
                    </div>
                  )}
                  {rfq.created_by_name && (
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>CREATED BY</div>
                      <div style={{ fontSize: '0.85rem' }}>{rfq.created_by_name}</div>
                    </div>
                  )}
                  {rfq.created_at && (
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>CREATED</div>
                      <div style={{ fontSize: '0.85rem' }}>{formatDate(rfq.created_at)}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Empty state */}
          {quotations.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">📭</div>
                <div className="empty-state-title">No quotations received yet</div>
                <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
                  Vendors have not submitted quotations for this RFQ yet.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Sort + Legend */}
              <div className="flex flex-between" style={{ marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>Sort by:</span>
                  {[
                    { key: 'price',    icon: <TrendingDown size={13} />, label: 'Price'    },
                    { key: 'delivery', icon: <Star size={13} />,         label: 'Delivery' },
                    { key: 'rating',   icon: <Star size={13} />,         label: 'Rating'   },
                  ].map(s => (
                    <button
                      key={s.key}
                      className={`btn ${sortBy === s.key ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.78rem', padding: '0.3rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                      onClick={() => setSortBy(s.key)}
                    >
                      {s.icon} {s.label}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.78rem', color: '#64748b' }}>
                  <span><span style={{ background: '#d1fae5', color: '#065f46', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>Best</span> = lowest price / fastest delivery</span>
                </div>
              </div>

              {/* Comparison Table */}
              <div className="table-wrapper" style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
                <table className="table" style={{ minWidth: Math.max(700, sorted.length * 220 + 160) }}>
                  <thead>
                    <tr>
                      <th style={{ minWidth: 140, position: 'sticky', left: 0, background: 'var(--bg-card, #fff)', zIndex: 2 }}>
                        Metric
                      </th>
                      {sorted.map((q, idx) => (
                        <th key={q.id || idx} style={{ minWidth: 200, textAlign: 'center' }}>
                          <div style={{ fontWeight: 700 }}>
                            {q.vendor_name || q.vendor?.company_name || `Vendor ${idx + 1}`}
                          </div>
                          {q.status && (
                            <span className={`badge ${statusBadge(q.status)}`} style={{ fontSize: '0.7rem', marginTop: 2 }}>
                              {q.status}
                            </span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Total Amount */}
                    <tr>
                      <td style={{ fontWeight: 600, position: 'sticky', left: 0, background: 'var(--bg-card, #fff)', zIndex: 1 }}>
                        💰 Total Amount
                      </td>
                      {sorted.map((q, idx) => {
                        const amt = Number(q.total_amount || 0);
                        const isBest = amt === lowestPrice && isFinite(lowestPrice);
                        return (
                          <td key={q.id || idx} style={{ textAlign: 'center' }}>
                            {isBest
                              ? <span style={bestCell}>{formatCurrency(amt)} ✓</span>
                              : <span>{formatCurrency(amt)}</span>
                            }
                          </td>
                        );
                      })}
                    </tr>

                    {/* Delivery Days */}
                    <tr>
                      <td style={{ fontWeight: 600, position: 'sticky', left: 0, background: 'var(--bg-card, #fff)', zIndex: 1 }}>
                        🚚 Delivery Days
                      </td>
                      {sorted.map((q, idx) => {
                        const days = Number(q.delivery_days || 0);
                        const isBest = days === fastestDel && isFinite(fastestDel) && days > 0;
                        return (
                          <td key={q.id || idx} style={{ textAlign: 'center' }}>
                            {isBest
                              ? <span style={bestCell}>{days}d ✓</span>
                              : <span>{q.delivery_days != null ? `${q.delivery_days}d` : '—'}</span>
                            }
                          </td>
                        );
                      })}
                    </tr>

                    {/* Validity Days */}
                    <tr>
                      <td style={{ fontWeight: 600, position: 'sticky', left: 0, background: 'var(--bg-card, #fff)', zIndex: 1 }}>
                        📅 Validity (Days)
                      </td>
                      {sorted.map((q, idx) => (
                        <td key={q.id || idx} style={{ textAlign: 'center' }}>
                          {q.validity_days != null ? `${q.validity_days}d` : '—'}
                        </td>
                      ))}
                    </tr>

                    {/* Rating */}
                    <tr>
                      <td style={{ fontWeight: 600, position: 'sticky', left: 0, background: 'var(--bg-card, #fff)', zIndex: 1 }}>
                        ⭐ Vendor Rating
                      </td>
                      {sorted.map((q, idx) => {
                        const rating = Number(q.vendor_rating || q.vendor?.rating || 0);
                        const isBest = rating === highestRating && rating > 0;
                        return (
                          <td key={q.id || idx} style={{ textAlign: 'center' }}>
                            <span style={isBest ? { border: '1.5px solid #f59e0b', borderRadius: 6, padding: '2px 6px', display: 'inline-block' } : {}}>
                              <StarRating rating={rating} />
                            </span>
                          </td>
                        );
                      })}
                    </tr>

                    {/* Notes */}
                    <tr>
                      <td style={{ fontWeight: 600, position: 'sticky', left: 0, background: 'var(--bg-card, #fff)', zIndex: 1 }}>
                        📝 Notes
                      </td>
                      {sorted.map((q, idx) => (
                        <td key={q.id || idx} style={{ textAlign: 'center', fontSize: '0.82rem', color: '#64748b', maxWidth: 200 }}>
                          {q.notes || q.remarks || '—'}
                        </td>
                      ))}
                    </tr>

                    {/* Per-item prices */}
                    {allItems.length > 0 && (
                      <tr>
                        <td colSpan={sorted.length + 1} style={{ background: 'var(--bg-secondary, #f8fafc)', fontWeight: 700, fontSize: '0.8rem', color: '#6366f1', padding: '0.5rem 1rem' }}>
                          📦 LINE ITEMS — Unit Prices
                        </td>
                      </tr>
                    )}
                    {allItems.map(itemKey => (
                      <tr key={itemKey}>
                        <td style={{ fontWeight: 500, fontSize: '0.85rem', position: 'sticky', left: 0, background: 'var(--bg-card, #fff)', zIndex: 1, paddingLeft: '1.25rem' }}>
                          {itemKey}
                        </td>
                        {sorted.map((q, idx) => {
                          const itm = (q.items || q.line_items || []).find(
                            i => (i.item_name || i.description || i.name || i.rfq_item_id) === itemKey
                          );
                          const price = itm ? Number(itm.unit_price || itm.price || 0) : null;
                          const isBest = price !== null && price === lowestItemPrice[itemKey] && isFinite(lowestItemPrice[itemKey]);
                          return (
                            <td key={q.id || idx} style={{ textAlign: 'center' }}>
                              {price !== null
                                ? isBest
                                  ? <span style={bestCell}>{formatCurrency(price)} ✓</span>
                                  : formatCurrency(price)
                                : <span style={{ color: '#cbd5e1' }}>—</span>
                              }
                              {itm?.quantity && (
                                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>qty: {itm.quantity}</div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}

                    {/* Submit for Approval row */}
                    <tr style={{ background: 'var(--bg-secondary, #f8fafc)' }}>
                      <td style={{ fontWeight: 600, position: 'sticky', left: 0, background: 'var(--bg-secondary, #f8fafc)', zIndex: 1 }}>
                        Action
                      </td>
                      {sorted.map((q, idx) => (
                        <td key={q.id || idx} style={{ textAlign: 'center', padding: '0.75rem' }}>
                          {submitted[q.id] ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: '#10b981', fontWeight: 600, fontSize: '0.85rem' }}>
                              <CheckCircle size={15} /> Submitted
                            </div>
                          ) : (
                            <button
                              className="btn btn-success"
                              style={{ fontSize: '0.78rem', padding: '0.35rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                              disabled={!!submitting[q.id]}
                              onClick={() => handleSubmitApproval(q)}
                            >
                              {submitting[q.id]
                                ? <><span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> Submitting…</>
                                : <><CheckCircle size={13} /> Submit for Approval</>
                              }
                            </button>
                          )}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Individual Quotation Cards */}
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: '#374151' }}>
                Quotation Details
              </h3>
              <div className="grid-2" style={{ gap: '1rem' }}>
                {sorted.map((q, idx) => (
                  <div key={q.id || idx} className="card" style={{ borderTop: `3px solid ${['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b'][idx % 5]}` }}>
                    <div className="flex flex-between" style={{ marginBottom: '0.75rem' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                          {q.vendor_name || q.vendor?.company_name || `Vendor ${idx + 1}`}
                        </div>
                        <StarRating rating={q.vendor_rating || q.vendor?.rating || 0} />
                      </div>
                      <span className={`badge ${statusBadge(q.status)}`}>{q.status || 'SUBMITTED'}</span>
                    </div>

                    <div className="grid-2" style={{ gap: '0.6rem', marginBottom: '0.75rem' }}>
                      <div style={{ background: 'var(--bg-secondary,#f8fafc)', borderRadius: 8, padding: '0.5rem 0.75rem' }}>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>TOTAL AMOUNT</div>
                        <div style={{ fontWeight: 700, color: '#6366f1' }}>{formatCurrency(q.total_amount)}</div>
                      </div>
                      <div style={{ background: 'var(--bg-secondary,#f8fafc)', borderRadius: 8, padding: '0.5rem 0.75rem' }}>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>DELIVERY</div>
                        <div style={{ fontWeight: 600 }}>{q.delivery_days != null ? `${q.delivery_days} days` : '—'}</div>
                      </div>
                      <div style={{ background: 'var(--bg-secondary,#f8fafc)', borderRadius: 8, padding: '0.5rem 0.75rem' }}>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>VALID FOR</div>
                        <div style={{ fontWeight: 600 }}>{q.validity_days != null ? `${q.validity_days} days` : '—'}</div>
                      </div>
                      <div style={{ background: 'var(--bg-secondary,#f8fafc)', borderRadius: 8, padding: '0.5rem 0.75rem' }}>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>SUBMITTED</div>
                        <div style={{ fontWeight: 500, fontSize: '0.82rem' }}>{formatDate(q.submitted_at || q.created_at)}</div>
                      </div>
                    </div>

                    {q.notes && (
                      <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '0.75rem', padding: '0.4rem 0.6rem', background: 'var(--bg-secondary,#f8fafc)', borderRadius: 6 }}>
                        📝 {q.notes}
                      </div>
                    )}

                    {(q.items || q.line_items || []).length > 0 && (
                      <div style={{ marginBottom: '0.75rem' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem' }}>LINE ITEMS</div>
                        {(q.items || q.line_items).map((item, iIdx) => (
                          <div key={iIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '3px 0', borderBottom: '1px solid var(--border-color,#e2e8f0)' }}>
                            <span>{item.item_name || item.description || item.name}</span>
                            <span style={{ fontWeight: 600 }}>{formatCurrency(item.unit_price || item.price)} × {item.quantity || 1}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ marginTop: '0.75rem' }}>
                      {submitted[q.id] ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#10b981', fontWeight: 600, fontSize: '0.875rem' }}>
                          <CheckCircle size={16} /> Submitted for Approval
                        </div>
                      ) : (
                        <button
                          className="btn btn-success"
                          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                          disabled={!!submitting[q.id]}
                          onClick={() => handleSubmitApproval(q)}
                        >
                          {submitting[q.id]
                            ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Submitting…</>
                            : <><CheckCircle size={15} /> Submit for Approval</>
                          }
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
