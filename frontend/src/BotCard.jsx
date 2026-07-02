import { useState } from 'react';
import { startBot, stopBot, getLogs } from './api';

export default function BotCard({ bot, onStatusChange }) {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState(null);
  const [logsLoading, setLogsLoading] = useState(false);

  const isActive = bot.status === 'active';

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (isActive) {
        await stopBot(bot.id);
      } else {
        await startBot(bot.id);
      }
      onStatusChange();
    } catch (err) {
      alert(`Failed to ${isActive ? 'stop' : 'start'} bot`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogs = async () => {
    if (logs !== null) {
      setLogs(null);
      return;
    }
    setLogsLoading(true);
    try {
      const data = await getLogs(bot.id, 30);
      setLogs(data.logs);
    } catch {
      setLogs(['Failed to load logs']);
    } finally {
      setLogsLoading(false);
    }
  };

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div style={styles.info}>
          <div style={styles.avatar}>
            {bot.pair.slice(0, 2)}
          </div>
          <div>
            <p style={styles.pair}>{bot.pair}</p>
            <p style={styles.exchange}>{bot.exchange} · Futures</p>
          </div>
        </div>
        <div style={styles.statusWrap}>
          <div style={{
            ...styles.dot,
            background: isActive ? '#2e7d32' : '#bbb'
          }} />
          <span style={{
            ...styles.statusText,
            color: isActive ? '#2e7d32' : '#888'
          }}>
            {bot.status}
          </span>
        </div>
      </div>

      <div style={styles.actions}>
        <button
          style={{
            ...styles.btn,
            background: isActive ? '#fff0f0' : '#f0f7ff',
            color: isActive ? '#c62828' : '#1565c0',
            border: `1px solid ${isActive ? '#ffcdd2' : '#bbdefb'}`,
            opacity: loading ? 0.6 : 1,
          }}
          onClick={handleToggle}
          disabled={loading}
        >
          {loading ? '...' : isActive ? '⏹ Stop' : '▶ Start'}
        </button>
        <button
          style={{
            ...styles.btn,
            background: '#f5f5f5',
            color: '#555',
            border: '1px solid #e0e0e0',
            opacity: logsLoading ? 0.6 : 1,
          }}
          onClick={handleLogs}
          disabled={logsLoading}
        >
          {logsLoading ? '...' : logs ? '✕ Close logs' : '📄 Logs'}
        </button>
      </div>

      {logs !== null && (
        <div style={styles.logsWrap}>
          {logs.length === 0
            ? <p style={styles.noLogs}>No log entries found</p>
            : logs.map((line, i) => (
              <p key={i} style={styles.logLine}>{line}</p>
            ))
          }
        </div>
      )}
    </div>
  );
}

const styles = {
  card: {
    background: '#fff',
    border: '1px solid #eeeeee',
    borderRadius: '12px',
    padding: '1rem',
    marginBottom: '0.625rem',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '0.75rem',
  },
  info: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.625rem',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    background: '#e3f2fd',
    color: '#1565c0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: '600',
  },
  pair: {
    fontSize: '0.9375rem',
    fontWeight: '600',
    color: '#1a1a1a',
    margin: 0,
  },
  exchange: {
    fontSize: '0.75rem',
    color: '#888',
    margin: 0,
  },
  statusWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  dot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
  },
  statusText: {
    fontSize: '0.75rem',
    fontWeight: '500',
  },
  actions: {
    display: 'flex',
    gap: '0.5rem',
  },
  btn: {
    flex: 1,
    padding: '0.5rem',
    fontSize: '0.8125rem',
    fontWeight: '500',
    borderRadius: '8px',
  },
  logsWrap: {
    marginTop: '0.75rem',
    background: '#1a1a1a',
    borderRadius: '8px',
    padding: '0.75rem',
    maxHeight: '200px',
    overflowY: 'auto',
  },
  logLine: {
    fontSize: '0.6875rem',
    color: '#a5d6a7',
    fontFamily: 'monospace',
    lineHeight: '1.6',
    margin: 0,
    wordBreak: 'break-all',
  },
  noLogs: {
    fontSize: '0.75rem',
    color: '#888',
    margin: 0,
  },
};
