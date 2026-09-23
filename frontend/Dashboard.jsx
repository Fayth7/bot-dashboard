import { useState, useEffect, useCallback } from 'react';
import { getBots, getPairPnl } from './api';
import BotCard from './BotCard';
import DailyPnl from './DailyPnl';

const EXCHANGES = ['OKX', 'Binance', 'Bybit'];

export default function Dashboard({ username, onLogout }) {
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [search, setSearch] = useState('');
  const [showStopped, setShowStopped] = useState(false);
  const [pairPnl, setPairPnl] = useState({});

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

  const fetchPairPnl = useCallback(async () => {
    try {
      const data = await getPairPnl();
      setPairPnl(data);
    } catch (err) {
      console.error('Failed to fetch pair PnL', err);
    }
  }, []);

  useEffect(() => {
    fetchBots();
    const interval = setInterval(fetchBots, 30000);
    return () => clearInterval(interval);
  }, [fetchBots]);

  useEffect(() => {
    fetchPairPnl();
    const interval = setInterval(fetchPairPnl, 300000); // refresh every 5 mins
    return () => clearInterval(interval);
  }, [fetchPairPnl]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    onLogout();
  };

  const activeBots = bots.filter(b => b.status === 'active');
  const stoppedBots = bots.filter(b => b.status !== 'active');

  const filterBots = (list) =>
    list.filter(b =>
      b.pair.toLowerCase().includes(search.toLowerCase()) ||
      b.exchange.toLowerCase().includes(search.toLowerCase())
    );

  const activeByExchange = (exchange) =>
    filterBots(activeBots).filter(b => b.exchange === exchange);

  const stoppedFiltered = filterBots(stoppedBots);

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* Top Bar */}
        <div style={styles.topBar}>
          <div>
            <p style={styles.welcome}>Welcome back</p>
            <p style={styles.username}>{username}</p>
          </div>
          <button style={styles.logoutBtn} onClick={handleLogout}>
            Sign out
          </button>
        </div>

        {/* Stats Row */}
        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <p style={styles.statLabel}>Running</p>
            <p style={{ ...styles.statValue, color: '#2e7d32' }}>
              {activeBots.length}
            </p>
          </div>
          <div
            style={{
              ...styles.statCard,
              cursor: stoppedBots.length > 0 ? 'pointer' : 'default',
              background: showStopped ? '#fff3e0' : '#fff',
              border: showStopped ? '1px solid #ffcc80' : '1px solid transparent',
            }}
            onClick={() => stoppedBots.length > 0 && setShowStopped(!showStopped)}
          >
            <p style={styles.statLabel}>
              Stopped {stoppedBots.length > 0 ? (showStopped ? '▲' : '▼') : ''}
            </p>
            <p style={{ ...styles.statValue, color: '#888' }}>
              {stoppedBots.length}
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div style={styles.searchWrap}>
          <input
            style={styles.searchInput}
            placeholder="🔍 Search by pair or exchange..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button
              style={styles.clearBtn}
              onClick={() => setSearch('')}
            >
              ✕
            </button>
          )}
        </div>
	
	{/* Daily PnL */}
	<DailyPnl />
        
	{/* Stopped Bots Panel */}
        {showStopped && (
          <div style={styles.stoppedPanel}>
            <p style={styles.stoppedHeader}>Stopped Bots</p>
            {stoppedFiltered.length === 0 ? (
              <p style={styles.emptyText}>No stopped bots match your search</p>
            ) : (
              stoppedFiltered.map(bot => (
                <BotCard
                  key={bot.id}
                  bot={bot}
                  onStatusChange={fetchBots}
                  pairPnlData={pairPnl}
                />
              ))
            )}
          </div>
        )}

        {/* Active Bots by Exchange */}
        {loading ? (
          <p style={styles.loadingText}>Loading bots...</p>
        ) : (
          EXCHANGES.map(exchange => {
            const exchangeBots = activeByExchange(exchange);
            if (exchangeBots.length === 0) return null;
            return (
              <div key={exchange} style={styles.section}>
                <p style={styles.sectionLabel}>{exchange}</p>
                {exchangeBots.map(bot => (
                  <BotCard
                    key={bot.id}
                    bot={bot}
                    onStatusChange={fetchBots}
                    pairPnlData={pairPnl}
                  />
                ))}
              </div>
            );
          })
        )}

        {/* Empty state when search finds nothing */}
        {!loading && filterBots(activeBots).length === 0 && search && (
          <div style={styles.emptyBox}>
            <p style={styles.emptyText}>No active bots match "{search}"</p>
          </div>
        )}

        {/* Footer */}
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
    marginBottom: '0.75rem',
  },
  statCard: {
    background: '#fff',
    borderRadius: '10px',
    padding: '0.875rem 1rem',
    transition: 'background 0.2s',
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
  searchWrap: {
    position: 'relative',
    marginBottom: '1rem',
  },
  searchInput: {
    width: '100%',
    padding: '0.625rem 2.5rem 0.625rem 0.875rem',
    fontSize: '0.875rem',
    border: '1px solid #e0e0e0',
    borderRadius: '10px',
    background: '#fff',
    outline: 'none',
    boxSizing: 'border-box',
  },
  clearBtn: {
    position: 'absolute',
    right: '0.625rem',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: '#888',
    fontSize: '0.875rem',
    cursor: 'pointer',
    padding: '0.25rem',
  },
  stoppedPanel: {
    background: '#fff8f0',
    border: '1px solid #ffcc80',
    borderRadius: '12px',
    padding: '0.875rem',
    marginBottom: '1rem',
  },
  stoppedHeader: {
    fontSize: '0.6875rem',
    fontWeight: '600',
    color: '#e65100',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    margin: '0 0 0.75rem',
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
