import { useState, useEffect, useCallback } from 'react';

const fetchAlerts = async () => {
  const token = localStorage.getItem('token');
  const res = await fetch('/api/analytics/alerts', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed');
  return res.json();
};

const approveAlert = async (exchange) => {
  const token = localStorage.getItem('token');
  const res = await fetch(`/api/analytics/alerts/${exchange}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed');
  return res.json();
};

const rejectAlert = async (exchange) => {
  const token = localStorage.getItem('token');
  const res = await fetch(`/api/analytics/alerts/${exchange}/reject`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed');
  return res.json();
};

const statusColors = {
  pending:  { bg: '#fff3e0', border: '#ffb74d', text: '#e65100', dot: '#f57c00' },
  approved: { bg: '#e8f5e9', border: '#81c784', text: '#2e7d32', dot: '#388e3c' },
  rejected: { bg: '#f5f5f5', border: '#e0e0e0', text: '#888',    dot: '#bbb'    },
  executed: { bg: '#e3f2fd', border: '#64b5f6', text: '#1565c0', dot: '#1976d2' },
};

const AlertCard = ({ alert, onAction }) => {
  const [expanded, setExpanded] = useState(true);
  const [acting, setActing] = useState(false);
  const colors = statusColors[alert.status] || statusColors.pending;

  const handleApprove = async () => {
    if (!window.confirm(
      `Approve position reductions on ${alert.exchange}?\n\n` +
      `This will reduce ${alert.proposed_cuts?.length} position(s) ` +
      `to recover ~$${alert.proposed_cuts?.reduce((s, c) => s + c.expected_recovery, 0).toFixed(2)}`
    )) return;
    setActing(true);
    try {
      await approveAlert(alert.exchange_dir || alert.exchange);
      onAction();
    } catch (e) {
      alert('Failed to approve');
    } finally {
      setActing(false);
    }
  };

  const handleReject = async () => {
    setActing(true);
    try {
      await rejectAlert(alert.exchange_dir || alert.exchange);
      onAction();
    } catch (e) {
      alert('Failed to reject');
    } finally {
      setActing(false);
    }
  };

  const totalRecovery = alert.proposed_cuts
    ?.reduce((s, c) => s + (c.expected_recovery || 0), 0) || 0;

  return (
    <div style={{
      ...styles.alertCard,
      background: colors.bg,
      border: `1px solid ${colors.border}`,
    }}>

      {/* Alert Header */}
      <div style={styles.alertHeader} onClick={() => setExpanded(!expanded)}>
        <div style={styles.alertLeft}>
          <div style={{ ...styles.dot, background: colors.dot }} />
          <div>
            <p style={{ ...styles.alertTitle, color: colors.text }}>
              ⚠️ Drawdown Breach — {alert.exchange}
            </p>
            <p style={styles.alertMeta}>
              {alert.drawdown_pct}% drawdown · ${alert.drawdown_usd} loss ·
              Updated {new Date(alert.updated_at).toLocaleTimeString()}
            </p>
          </div>
        </div>
        <div style={styles.alertRight}>
          <span style={{ ...styles.statusBadge, color: colors.text, borderColor: colors.border }}>
            {alert.status}
          </span>
          <span style={styles.chevron}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Alert Detail */}
      {expanded && (
        <div style={styles.alertDetail}>

          {/* Summary */}
          <div style={styles.summaryGrid}>
            <div style={styles.summaryItem}>
              <p style={styles.summaryLabel}>Equity</p>
              <p style={styles.summaryValue}>${alert.equity?.toFixed(2)}</p>
            </div>
            <div style={styles.summaryItem}>
              <p style={styles.summaryLabel}>Drawdown</p>
              <p style={{ ...styles.summaryValue, color: '#c62828' }}>
                -${alert.drawdown_usd?.toFixed(2)}
              </p>
            </div>
            <div style={styles.summaryItem}>
              <p style={styles.summaryLabel}>Above Target</p>
              <p style={{ ...styles.summaryValue, color: '#c62828' }}>
                -${alert.excess_usd?.toFixed(2)}
              </p>
            </div>
            <div style={styles.summaryItem}>
              <p style={styles.summaryLabel}>Loss to Realize</p>
              <p style={{ ...styles.summaryValue, color: '#c62828' }}>
                -${totalRecovery.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Proposed Cuts */}
          {alert.proposed_cuts && alert.proposed_cuts.length > 0 && (
            <>
              <p style={styles.cutsLabel}>Proposed Position Reductions</p>
              {alert.proposed_cuts.map((cut, i) => (
                <div key={i} style={styles.cutRow}>
                  <div style={styles.cutLeft}>
                    <span style={styles.cutSymbol}>{cut.symbol}</span>
                    <span style={{
                      ...styles.cutSide,
                      color: cut.side === 'LONG' ? '#1565c0' : '#6a1b9a',
                      background: cut.side === 'LONG' ? '#e3f2fd' : '#f3e5f5',
                    }}>
                      {cut.side}
                    </span>
                  </div>
                  <div style={styles.cutRight}>
                    <p style={styles.cutDetail}>
                      Reduce ${((cut.qty_to_reduce / cut.quantity) * (cut.loss_usd / (cut.loss_pct / 100))).toFixed(2)} of ${(cut.loss_usd / (cut.loss_pct / 100)).toFixed(2)} margin
                    </p>
                    <p style={styles.cutPnl}>
                      Loss: ${cut.loss_usd} ({cut.loss_pct}%) ·
                      Loss to realize: -${cut.expected_recovery}
                    </p>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Execution Result */}
          {alert.execution_result && (
            <div style={styles.resultBox}>
              <p style={styles.resultTitle}>✅ Execution Result</p>
              <p style={styles.resultText}>
                {alert.execution_result.reductions_executed} reduction(s) executed ·
                New drawdown: ${alert.execution_result.new_drawdown_usd}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          {alert.status === 'pending' && (
            <div style={styles.actions}>
              <button
                style={styles.rejectBtn}
                onClick={handleReject}
                disabled={acting}
              >
                {acting ? '...' : '✕ Reject — do nothing'}
              </button>
              <button
                style={styles.approveBtn}
                onClick={handleApprove}
                disabled={acting}
              >
                {acting ? '...' : '✓ Approve — reduce positions'}
              </button>
            </div>
          )}

          {alert.status === 'approved' && (
            <p style={styles.waitingText}>
              ⏳ Approved — waiting for monitor to execute on next cycle (up to 60s)
            </p>
          )}

          {alert.status === 'rejected' && (
            <p style={styles.rejectedText}>
              ✕ Rejected — monitor will re-alert in 2 hours if breach persists
            </p>
          )}

        </div>
      )}
    </div>
  );
};

export default function DrawdownAlert({ onAlertCount }) {
  const [alerts, setAlerts] = useState([]);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchAlerts();
      const active = (data.alerts || []).filter(
        a => a.status !== 'executed' || 
        (new Date() - new Date(a.executed_at)) < 300000 // show executed for 5 mins
      );
      setAlerts(active);
      if (onAlertCount) onAlertCount(active.filter(a => a.status === 'pending').length);
    } catch (e) {
      console.error(e);
    }
  }, [onAlertCount]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  if (alerts.length === 0) return null;

  return (
    <div style={styles.container}>
      {alerts.map((alert, i) => (
        <AlertCard key={alert.id || i} alert={alert} onAction={refresh} />
      ))}
    </div>
  );
}

const styles = {
  container: {
    marginBottom: '1rem',
  },
  alertCard: {
    borderRadius: '12px',
    marginBottom: '0.5rem',
    overflow: 'hidden',
  },
  alertHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.875rem 1rem',
    cursor: 'pointer',
  },
  alertLeft: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.625rem',
    flex: 1,
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    marginTop: '4px',
    flexShrink: 0,
  },
  alertTitle: {
    fontSize: '0.875rem',
    fontWeight: '600',
    margin: '0 0 2px',
  },
  alertMeta: {
    fontSize: '0.6875rem',
    color: '#888',
    margin: 0,
  },
  alertRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flexShrink: 0,
  },
  statusBadge: {
    fontSize: '0.625rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    border: '1px solid',
    borderRadius: '4px',
    padding: '2px 6px',
  },
  chevron: {
    fontSize: '0.625rem',
    color: '#888',
  },
  alertDetail: {
    padding: '0 1rem 1rem',
    borderTop: '1px solid rgba(0,0,0,0.06)',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '0.5rem',
    padding: '0.75rem 0',
  },
  summaryItem: { textAlign: 'center' },
  summaryLabel: {
    fontSize: '0.5625rem',
    color: '#888',
    textTransform: 'uppercase',
    margin: '0 0 2px',
  },
  summaryValue: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#1a1a1a',
    margin: 0,
  },
  cutsLabel: {
    fontSize: '0.6875rem',
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    margin: '0 0 0.5rem',
  },
  cutRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '0.5rem 0',
    borderBottom: '1px solid rgba(0,0,0,0.06)',
  },
  cutLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    minWidth: '120px',
  },
  cutSymbol: {
    fontSize: '0.8125rem',
    fontWeight: '600',
    color: '#1a1a1a',
  },
  cutSide: {
    fontSize: '0.5625rem',
    fontWeight: '600',
    borderRadius: '3px',
    padding: '1px 4px',
  },
  cutRight: { textAlign: 'right' },
  cutDetail: {
    fontSize: '0.75rem',
    color: '#1a1a1a',
    margin: '0 0 2px',
  },
  cutPnl: {
    fontSize: '0.6875rem',
    color: '#888',
    margin: 0,
  },
  resultBox: {
    background: '#e8f5e9',
    borderRadius: '8px',
    padding: '0.625rem',
    marginTop: '0.75rem',
  },
  resultTitle: {
    fontSize: '0.8125rem',
    fontWeight: '600',
    color: '#2e7d32',
    margin: '0 0 2px',
  },
  resultText: {
    fontSize: '0.75rem',
    color: '#2e7d32',
    margin: 0,
  },
  actions: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '0.875rem',
  },
  rejectBtn: {
    flex: 1,
    padding: '0.625rem',
    background: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '0.8125rem',
    color: '#888',
    cursor: 'pointer',
    fontWeight: '500',
  },
  approveBtn: {
    flex: 1,
    padding: '0.625rem',
    background: '#c62828',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.8125rem',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: '600',
  },
  waitingText: {
    fontSize: '0.75rem',
    color: '#1565c0',
    margin: '0.75rem 0 0',
    textAlign: 'center',
  },
  rejectedText: {
    fontSize: '0.75rem',
    color: '#888',
    margin: '0.75rem 0 0',
    textAlign: 'center',
  },
};
