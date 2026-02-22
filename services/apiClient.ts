import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api', // Relative path since we are serving from the same origin
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor for auth token (if implemented later)
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
