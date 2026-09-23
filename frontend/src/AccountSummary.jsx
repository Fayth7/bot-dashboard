import { useState, useEffect, useCallback } from 'react';

const fetchData = async (endpoint) => {
  const token = localStorage.getItem('token');
  const res = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed');
  return res.json();
};

const PnlBadge = ({ value, size = '0.875rem' }) => (
  <span style={{
    color: value >= 0 ? '#2e7d32' : '#c62828',
    fontWeight: '600',
    fontSize: size,
  }}>
    {value >= 0 ? '+' : ''}${value.toFixed(2)}
  </span>
);

const ExchangeDetail = ({ name, data }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={styles.exchangeCard}>
      <div style={styles.exchangeHeader} onClick={() => setExpanded(!expanded)}>
        <div style={styles.exchangeLeft}>
          <span style={styles.exchangeName}>{name}</span>
          {data.error && <span style={styles.errorBadge}>Error</span>}
        </div>
        <div style={styles.exchangeRight}>
          <div style={styles.exchangeValues}>
            <span style={styles.metaLabel}>Equity </span>
            <span style={styles.metaValue}>${data.equity.toFixed(2)}</span>
            <span style={styles.separator}>·</span>
            <span style={styles.metaLabel}>uPnL </span>
            <PnlBadge value={data.unrealized_pnl} size="0.8125rem" />
          </div>
          <span style={styles.chevron}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div style={styles.exchangeDetail}>
          <div style={styles.detailGrid}>
            <div style={styles.detailItem}>
              <p style={styles.detailLabel}>Wallet</p>
              <p style={styles.detailValue}>${data.wallet_balance.toFixed(2)}</p>
            </div>
            <div style={styles.detailItem}>
              <p style={styles.detailLabel}>Unrealized</p>
              <PnlBadge value={data.unrealized_pnl} />
            </div>
            <div style={styles.detailItem}>
              <p style={styles.detailLabel}>Equity</p>
              <p style={styles.detailValue}>${data.equity.toFixed(2)}</p>
            </div>
          </div>

          {data.open_positions && data.open_positions.length > 0 && (
            <>
              <p style={styles.positionsLabel}>Open Positions</p>
              {data.open_positions.map((pos, i) => (
                <div key={i} style={styles.posRow}>
                  <div style={styles.posLeft}>
                    <span style={styles.posSymbol}>
                      {pos.symbol.replace('/USDT:USDT', '').replace('/USD:USD', '').replace(':USDT', '')}
                    </span>
                    <span style={{
                      ...styles.posSide,
                      color: pos.side === 'long' ? '#1565c0' : '#6a1b9a',
                      background: pos.side === 'long' ? '#e3f2fd' : '#f3e5f5',
                    }}>
                      {pos.side.toUpperCase()}
                    </span>
                  </div>
                  <div style={styles.posRight}>
                    <PnlBadge value={pos.unrealized_pnl} size="0.8125rem" />
                    <span style={{
                      fontSize: '0.625rem',
                      color: pos.percentage >= 0 ? '#2e7d32' : '#c62828',
                    }}>
                      {pos.percentage >= 0 ? '+' : ''}{pos.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </>
          )}
          {data.error && <p style={styles.errorText}>{data.error}</p>}
        </div>
      )}
    </div>
  );
};

export default function AccountSummary() {
  const [account, setAccount] = useState(null);
  const [today, setToday] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const [acc, tod] = await Promise.all([
        fetchData('/api/analytics/account-summary'),
        fetchData('/api/analytics/today'),
      ]);
      setAccount(acc);
      setToday(tod);
      setLastFetched(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 300000);
    return () => clearInterval(interval);
  }, [refresh]);

  if (loading) return (
    <div style={styles.card}>
      <p style={styles.loading}>Loading account summary...</p>
    </div>
  );

  if (!account) return null;

  const cacheInfo = account.cached
    ? `account cached ${Math.floor(account.cache_age_seconds / 60)}m ago`
    : 'just updated';

  return (
    <div style={styles.card}>

      {/* Header */}
      <div style={styles.cardHeader}>
        <p style={styles.cardTitle}>Account Summary</p>
        <span style={styles.cacheInfo}>{cacheInfo}</span>
      </div>

      {/* Total Account Row */}
      <div style={styles.totalRow}>
        <div style={styles.totalItem}>
          <p style={styles.totalLabel}>Total Equity</p>
          <p style={styles.totalValue}>${account.total_equity.toFixed(2)}</p>
        </div>
        <div style={styles.totalDivider} />
        <div style={styles.totalItem}>
          <p style={styles.totalLabel}>Unrealized</p>
          <PnlBadge value={account.total_unrealized_pnl} size="1.125rem" />
        </div>
        <div style={styles.totalDivider} />
        <div style={styles.totalItem}>
          <p style={styles.totalLabel}>Wallet</p>
          <p style={styles.totalValue}>${account.total_wallet_balance.toFixed(2)}</p>
        </div>
      </div>

      {/* Today's Running PnL */}
      {today && (
        <div style={styles.todayCard}>
          <div style={styles.todayHeader}>
            <div>
              <p style={styles.todayTitle}>Today's PnL</p>
              <p style={styles.todayDate}>{today.date} · {today.total_closes} closes</p>
            </div>
            <PnlBadge value={today.total_pnl} size="1.5rem" />
          </div>

          {Object.keys(today.exchanges).length > 0 && (
            <div style={styles.todayExchanges}>
              {Object.entries(today.exchanges).map(([name, data]) => (
                <div key={name} style={styles.todayExRow}>
                  <span style={styles.todayExName}>{name}</span>
                  <span style={styles.todayExCloses}>{data.closes} closes</span>
                  <PnlBadge value={data.pnl} size="0.8125rem" />
                </div>
              ))}
            </div>
          )}

          {today.total_closes === 0 && (
            <p style={styles.noTrades}>No trades closed today yet</p>
          )}
        </div>
      )}

      {/* Exchange Breakdown */}
      <div style={styles.exchanges}>
        {Object.entries(account.exchanges).map(([name, exData]) => (
          <ExchangeDetail key={name} name={name} data={exData} />
        ))}
      </div>

      {/* Footer */}
      <p style={styles.footer}>
        Refreshes every 5 min · {lastFetched?.toLocaleTimeString()}
      </p>

    </div>
  );
}

const styles = {
  card: {
    background: '#fff',
    borderRadius: '12px',
    padding: '1rem',
    marginBottom: '1rem',
  },
  loading: {
    textAlign: 'center',
    color: '#888',
    fontSize: '0.875rem',
    margin: 0,
    padding: '1rem 0',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '0.75rem',
  },
  cardTitle: {
    fontSize: '0.6875rem',
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    margin: 0,
  },
  cacheInfo: {
    fontSize: '0.6875rem',
    color: '#bbb',
  },
  totalRow: {
    display: 'flex',
    background: '#f8f9fa',
    borderRadius: '10px',
    padding: '0.875rem',
    marginBottom: '0.75rem',
    alignItems: 'center',
  },
  totalItem: { flex: 1, textAlign: 'center' },
  totalDivider: { width: '1px', height: '36px', background: '#e0e0e0' },
  totalLabel: {
    fontSize: '0.625rem',
    color: '#888',
    textTransform: 'uppercase',
    margin: '0 0 3px',
  },
  totalValue: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#1a1a1a',
    margin: 0,
  },
  todayCard: {
    background: '#f0f7ff',
    border: '1px solid #bbdefb',
    borderRadius: '10px',
    padding: '0.875rem',
    marginBottom: '0.75rem',
  },
  todayHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.625rem',
  },
  todayTitle: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#1a1a1a',
    margin: '0 0 2px',
  },
  todayDate: {
    fontSize: '0.6875rem',
    color: '#888',
    margin: 0,
  },
  todayExchanges: {
    borderTop: '1px solid #bbdefb',
    paddingTop: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  todayExRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  todayExName: {
    fontSize: '0.8125rem',
    fontWeight: '500',
    color: '#1a1a1a',
    width: '65px',
  },
  todayExCloses: {
    fontSize: '0.6875rem',
    color: '#888',
    flex: 1,
  },
  noTrades: {
    fontSize: '0.75rem',
    color: '#888',
    margin: 0,
    textAlign: 'center',
  },
  exchanges: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
  },
  exchangeCard: {
    background: '#f8f9fa',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  exchangeHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.625rem 0.75rem',
    cursor: 'pointer',
  },
  exchangeLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  exchangeName: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#1a1a1a',
    width: '60px',
  },
  errorBadge: {
    fontSize: '0.625rem',
    background: '#ffebee',
    color: '#c62828',
    borderRadius: '4px',
    padding: '1px 5px',
  },
  exchangeRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  exchangeValues: {
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
  },
  metaLabel: { color: '#888', fontSize: '0.75rem' },
  metaValue: { fontWeight: '600', color: '#1a1a1a', fontSize: '0.8125rem' },
  separator: { color: '#ccc', margin: '0 2px' },
  chevron: { fontSize: '0.625rem', color: '#888' },
  exchangeDetail: {
    padding: '0 0.75rem 0.75rem',
    borderTop: '1px solid #e0e0e0',
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.5rem',
    padding: '0.625rem 0',
  },
  detailItem: { textAlign: 'center' },
  detailLabel: {
    fontSize: '0.625rem',
    color: '#888',
    textTransform: 'uppercase',
    margin: '0 0 2px',
  },
  detailValue: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#1a1a1a',
    margin: 0,
  },
  positionsLabel: {
    fontSize: '0.625rem',
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    margin: '0.5rem 0 0.375rem',
  },
  posRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 0',
    borderBottom: '1px solid #f0f0f0',
  },
  posLeft: { display: 'flex', alignItems: 'center', gap: '6px' },
  posSymbol: { fontSize: '0.8125rem', fontWeight: '500', color: '#1a1a1a' },
  posSide: {
    fontSize: '0.5625rem',
    fontWeight: '600',
    borderRadius: '3px',
    padding: '1px 4px',
  },
  posRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '1px',
  },
  errorText: { fontSize: '0.75rem', color: '#c62828', margin: '0.5rem 0 0' },
  footer: {
    fontSize: '0.6875rem',
    color: '#bbb',
    textAlign: 'center',
    margin: '0.75rem 0 0',
  },
};
