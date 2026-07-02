import { useState } from 'react';
import { login } from './api';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await login(username, password);
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('username', username);
      onLogin(username);
    } catch {
      setError('Incorrect username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.iconWrap}>🤖</div>
          <h1 style={styles.title}>Bot dashboard</h1>
          <p style={styles.subtitle}>Sign in to your account</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label style={styles.label}>Username</label>
            <input
              style={styles.input}
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter your username"
              autoCapitalize="none"
              required
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              style={styles.input}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>
          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
    background: '#f0f2f5',
  },
  card: {
    background: '#fff',
    borderRadius: '16px',
    padding: '2rem',
    width: '100%',
    maxWidth: '380px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '1.5rem',
  },
  iconWrap: {
    fontSize: '2.5rem',
    marginBottom: '0.5rem',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: '0.25rem',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#888',
  },
  field: {
    marginBottom: '1rem',
  },
  label: {
    display: 'block',
    fontSize: '0.8125rem',
    fontWeight: '500',
    color: '#555',
    marginBottom: '0.375rem',
  },
  input: {
    width: '100%',
    padding: '0.625rem 0.875rem',
    fontSize: '0.9375rem',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    outline: 'none',
    background: '#fafafa',
  },
  error: {
    color: '#d32f2f',
    fontSize: '0.8125rem',
    marginBottom: '0.75rem',
    textAlign: 'center',
  },
  button: {
    width: '100%',
    padding: '0.75rem',
    background: '#1976d2',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.9375rem',
    fontWeight: '500',
    marginTop: '0.5rem',
  },
};
