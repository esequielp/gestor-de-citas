import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api', // Relative path since we are serving from the same origin
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor for auth token and Tenant ID
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Extract tenant identifier from URL params or localStorage
  const urlParams = new URLSearchParams(window.location.search);
  const tenant = urlParams.get('tenant') || urlParams.get('tenantId') || localStorage.getItem('tenantId') || 'demo';

  if (tenant) {
    config.headers['X-Tenant-Id'] = tenant;
  }

  return config;
});

export default apiClient;
