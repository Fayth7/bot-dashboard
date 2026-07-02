import { useState, useEffect, useCallback } from 'react';
import { getBots } from './api';
import BotCard from './BotCard';

const EXCHANGES = ['OKX', 'Binance', 'Bybit'];

export default function Dashboard({ username, onLogout }) {
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchBots = useCallback(async () => {
    try {
      const data = await getBots();
      setBots(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch bots', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBots();
    const interval = setInterval(fetchBots, 30000);
    return () => clearInterval(interval);
  }, [fetchBots]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    onLogout();
  };

  const activeBots = bots.filter(b => b.status === 'active').length;
  const stoppedBots = bots.filter(b => b.status !== 'active').length;

  const botsByExchange = (exchange) =>
    bots.filter(b => b.exchange === exchange);

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        <div style={styles.topBar}>
          <div>
            <p style={styles.welcome}>Welcome back</p>
            <p style={styles.username}>{username}</p>
          </div>
          <button style={styles.logoutBtn} onClick={handleLogout}>
            Sign out
          </button>
        </div>

        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <p style={styles.statLabel}>Running</p>
            <p style={{ ...styles.statValue, color: '#2e7d32' }}>{activeBots}</p>
          </div>
          <div style={styles.statCard}>
            <p style={styles.statLabel}>Stopped</p>
            <p style={{ ...styles.statValue, color: '#888' }}>{stoppedBots}</p>
          </div>
        </div>

        {loading ? (
          <p style={styles.loadingText}>Loading bots...</p>
        ) : (
          EXCHANGES.map(exchange => (
            <div key={exchange} style={styles.section}>
              <p style={styles.sectionLabel}>{exchange}</p>
              {botsByExchange(exchange).length === 0 ? (
                <div style={styles.emptyBox}>
                  <p style={styles.emptyText}>No bots on {exchange}</p>
                </div>
              ) : (
                botsByExchange(exchange).map(bot => (
                  <BotCard
                    key={bot.id}
                    bot={bot}
                    onStatusChange={fetchBots}
                  />
                ))
              )}
            </div>
          ))
        )}

        <p style={styles.footer}>
          {lastUpdated
            ? `Last updated ${lastUpdated.toLocaleTimeString()}`
            : 'Updating...'
          } · Auto-refreshes every 30s
        </p>

      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f0f2f5',
    padding: '1rem',
  },
  container: {
    maxWidth: '480px',
    margin: '0 auto',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1rem',
  },
  welcome: {
    fontSize: '0.8125rem',
    color: '#888',
    margin: 0,
  },
  username: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#1a1a1a',
    margin: 0,
  },
  logoutBtn: {
    background: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '0.375rem 0.75rem',
    fontSize: '0.8125rem',
    color: '#555',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.625rem',
    marginBottom: '1.25rem',
  },
  statCard: {
    background: '#fff',
    borderRadius: '10px',
    padding: '0.875rem 1rem',
  },
  statLabel: {
    fontSize: '0.75rem',
    color: '#888',
    margin: '0 0 3px',
  },
  statValue: {
    fontSize: '1.5rem',
    fontWeight: '600',
    margin: 0,
  },
  section: {
    marginBottom: '1rem',
  },
  sectionLabel: {
    fontSize: '0.6875rem',
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    margin: '0 0 0.5rem',
  },
  emptyBox: {
    border: '1px dashed #e0e0e0',
    borderRadius: '10px',
    padding: '1rem',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: '0.8125rem',
    color: '#bbb',
    margin: 0,
  },
  loadingText: {
    textAlign: 'center',
    color: '#888',
    fontSize: '0.875rem',
    padding: '2rem 0',
  },
  footer: {
    textAlign: 'center',
    fontSize: '0.75rem',
    color: '#bbb',
    padding: '1rem 0',
  },
};
