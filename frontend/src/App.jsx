import { useState } from 'react';
import Login from './Login';
import Dashboard from './Dashboard';

export default function App() {
  const [username, setUsername] = useState(
    localStorage.getItem('username') || null
  );

  const handleLogin = (name) => setUsername(name);
  const handleLogout = () => setUsername(null);

  return username
    ? <Dashboard username={username} onLogout={handleLogout} />
    : <Login onLogin={handleLogin} />;
}
