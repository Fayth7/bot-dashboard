import axios from 'axios';

const API_URL = '/api';

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

export const login = async (username, password) => {
  const form = new URLSearchParams();
  form.append('username', username);
  form.append('password', password);
  const res = await api.post('/auth/login', form);
  return res.data;
};

export const getBots = async () => {
  const res = await api.get('/bots/');
  return res.data;
};

export const startBot = async (botId) => {
  const res = await api.post(`/bots/${botId}/start`);
  return res.data;
};

export const stopBot = async (botId) => {
  const res = await api.post(`/bots/${botId}/stop`);
  return res.data;
};

export const getLogs = async (botId, lines = 50) => {
  const res = await api.get(`/bots/${botId}/logs?lines=${lines}`);
  return res.data;
};

export const getPnl = async (botId) => {
  const res = await api.get(`/bots/${botId}/pnl`);
  return res.data;
};
