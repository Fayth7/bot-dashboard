const API_URL = '/api';

const getToken = () => localStorage.getItem('token');

const request = async (path, options = {}) => {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.href = '/';
  }
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return res.json();
};

export const login = async (username, password) => {
  const form = new URLSearchParams();
  form.append('username', username);
  form.append('password', password);
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error('Login failed');
  return res.json();
};

export const getBots = () => request('/bots/');

export const startBot = (botId) =>
  request(`/bots/${botId}/start`, { method: 'POST' });

export const stopBot = (botId) =>
  request(`/bots/${botId}/stop`, { method: 'POST' });

export const getLogs = (botId, lines = 50) =>
  request(`/bots/${botId}/logs?lines=${lines}`);

export const getPnl = (botId) =>
  request(`/bots/${botId}/pnl`);
