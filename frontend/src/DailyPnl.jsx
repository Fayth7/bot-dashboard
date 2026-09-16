import { useState, useEffect } from 'react';

const getDailyPnl = async () => {
  const token = localStorage.getItem('token');
  const res = await fetch('/api/analytics/daily', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

const PnlValue = ({ value, size = '1rem' }) => (
  <span style={{
    color: value >= 0 ? '#2e7d32' : '#c62828',
    fontWeight: '600',
    fontSize: size,
  }}>
    {value >= 0 ? '+' : ''}${value.toFixed(2)}
  </span>
);

const ExchangeRow = ({ name, data }) => (
  <div style={styles.exchangeRow}>
    <div style={styles.exchangeLeft}>
      <span style={styles.exchangeName}>{name}</span>
      <span style={styles.exchangeCloses}>{data.trades_closed} closes</span>
    </div>
    <div style={styles.exchangeRight}>
      <PnlValue value={data.net_pnl} size="0.875rem" />
      <span style={styles.exchangeCosts}>
        costs ${Math.abs(data.commission + data.funding_fee).toFixed(2)}
      </span>
    </div>
  </div>
);

const DayCard = ({ record, isToday }) => {
  const [expanded, setExpanded] = useState(isToday);
  const date = new Date(record.date);
  const label = isToday ? 'Today' : date.toLocaleDateString('en', {
    weekday: 'short', month: 'short', day: 'numeric'
  });

  return (
    <div style={styles.dayCard}>
      <div style={styles.dayHeader} onClick={() => setExpanded(!expanded)}>
        <div style={styles.dayLeft}>
          <span style={styles.dayLabel}>{label}</span>
          <span style={styles.dayCloses}>{record.total_trades_closed} closes</span>
        </div>
        <div style={styles.dayRight}>
          <PnlValue value={record.total_net_pnl} size="1rem" />
          <span style={styles.chevron}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div style={styles.dayDetail}>
          <div style={styles.summaryRow}>
            <div style={styles.summaryItem}>
              <p style={styles.summaryLabel}>Realized</p>
              <PnlValue value={record.total_realized_pnl} size="0.8125rem" />
            </div>
            <div style={styles.summaryItem}>
              <p style={styles.summaryLabel}>Costs</p>
              <span style={{ color: '#c62828', fontWeight: '600', fontSize: '0.8125rem' }}>
                ${record.total_costs.toFixed(2)}
              </span>
            </div>
            <div style={styles.summaryItem}>
              <p style={styles.summaryLabel}>Net</p>
              <PnlValue value={record.total_net_pnl} size="0.8125rem" />
            </div>
          </div>
          <div style={styles.divider} />
          {Object.entries(record.exchanges).map(([name, data]) => (
            <ExchangeRow key={name} name={name} data={data} />
          ))}
        </div>
      )}
    </div>
  );
};

export default function DailyPnl() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [activeAvg, setActiveAvg] = useState('7d');

  useEffect(() => {
    getDailyPnl()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={styles.card}>
      <p style={styles.loading}>Loading daily PnL...</p>
    </div>
  );

  if (!data?.today) return null;

  const avg = data.averages[activeAvg];

  return (
    <div style={styles.card}>

      {/* Header */}
      <div style={styles.cardHeader}>
        <p style={styles.cardTitle}>Daily PnL</p>
        <button
          style={styles.historyBtn}
          onClick={() => setShowHistory(!showHistory)}
        >
          {showHistory ? 'Hide history' : 'Show history'}
        </button>
      </div>

      {/* Today */}
      <DayCard record={data.today} isToday={true} />

      {/* Averages */}
      <div style={styles.avgSection}>
        <div style={styles.avgTabs}>
          {['7d', '30d', '90d'].map(period => (
            <button
              key={period}
              style={{
                ...styles.avgTab,
                background: activeAvg === period ? '#1976d2' : '#f5f5f5',
                color: activeAvg === period ? '#fff' : '#555',
              }}
              onClick={() => setActiveAvg(period)}
            >
              {period}
            </button>
          ))}
        </div>
        {avg && (
          <div style={styles.avgRow}>
            <div style={styles.avgItem}>
              <p style={styles.avgLabel}>Avg/day</p>
              <PnlValue value={avg.avg_net_pnl} size="0.9375rem" />
            </div>
            <div style={styles.avgItem}>
              <p style={styles.avgLabel}>Total</p>
              <PnlValue value={avg.total_net_pnl} size="0.9375rem" />
            </div>
            <div style={styles.avgItem}>
              <p style={styles.avgLabel}>Avg closes</p>
              <span style={styles.avgValue}>{avg.avg_trades}/day</span>
            </div>
            <div style={styles.avgItem}>
              <p style={styles.avgLabel}>Days</p>
              <span style={styles.avgValue}>{avg.days}</span>
            </div>
          </div>
        )}
      </div>

      {/* History */}
      {showHistory && data.history.length > 0 && (
        <div style={styles.history}>
          <p style={styles.historyLabel}>Last 7 days</p>
          {data.history.map(record => (
            <DayCard key={record.date} record={record} isToday={false} />
          ))}
        </div>
      )}

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
  historyBtn: {
    background: 'none',
    border: 'none',
    fontSize: '0.75rem',
    color: '#1976d2',
    cursor: 'pointer',
    padding: 0,
  },
  dayCard: {
    background: '#f8f9fa',
    borderRadius: '8px',
    marginBottom: '0.5rem',
    overflow: 'hidden',
  },
  dayHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem',
    cursor: 'pointer',
  },
  dayLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  dayLabel: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#1a1a1a',
  },
  dayCloses: {
    fontSize: '0.6875rem',
    color: '#888',
  },
  dayRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  chevron: {
    fontSize: '0.625rem',
    color: '#888',
  },
  dayDetail: {
    padding: '0 0.75rem 0.75rem',
  },
  summaryRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.5rem',
    marginBottom: '0.75rem',
  },
  summaryItem: {
    textAlign: 'center',
    background: '#fff',
    borderRadius: '6px',
    padding: '0.5rem',
  },
  summaryLabel: {
    fontSize: '0.625rem',
    color: '#888',
    textTransform: 'uppercase',
    margin: '0 0 2px',
  },
  divider: {
    height: '1px',
    background: '#e0e0e0',
    marginBottom: '0.75rem',
  },
  exchangeRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.375rem 0',
    borderBottom: '1px solid #f0f0f0',
  },
  exchangeLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  exchangeName: {
    fontSize: '0.8125rem',
    fontWeight: '500',
    color: '#1a1a1a',
    width: '60px',
  },
  exchangeCloses: {
    fontSize: '0.6875rem',
    color: '#888',
  },
  exchangeRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '2px',
  },
  exchangeCosts: {
    fontSize: '0.625rem',
    color: '#888',
  },
  avgSection: {
    marginTop: '0.75rem',
    background: '#f8f9fa',
    borderRadius: '8px',
    padding: '0.75rem',
  },
  avgTabs: {
    display: 'flex',
    gap: '0.375rem',
    marginBottom: '0.75rem',
  },
  avgTab: {
    flex: 1,
    padding: '0.375rem',
    fontSize: '0.75rem',
    fontWeight: '500',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
  },
  avgRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '0.5rem',
  },
  avgItem: {
    textAlign: 'center',
  },
  avgLabel: {
    fontSize: '0.5625rem',
    color: '#888',
    textTransform: 'uppercase',
    margin: '0 0 2px',
  },
  avgValue: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#1a1a1a',
  },
  history: {
    marginTop: '0.75rem',
  },
  historyLabel: {
    fontSize: '0.6875rem',
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    margin: '0 0 0.5rem',
  },
  loading: {
    textAlign: 'center',
    color: '#888',
    fontSize: '0.875rem',
    margin: 0,
  },
};
