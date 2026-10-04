import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://casually-override-childlike.ngrok-free.dev/api/v1',
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true', // Bypasses ngrok free interstitial page
  },
  timeout: 20000,
});

// Request Interceptor: Attach JWT Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Don't auto-redirect if trying to login
      if (!error.config.url.includes('/auth/login') && !error.config.url.includes('/auth/patient/verify-otp')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Parses and formats any API / Network / Validation error into an exact, human-readable UI message
 */
export const extractErrorMessage = (error, defaultFallback = 'An unexpected error occurred.') => {
  if (!error) return defaultFallback;

  if (typeof error === 'string') return error;

  // Network / Connection / Timeout errors
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return 'Connection timed out. The server took too long to respond. Please check backend server status.';
  }
  if (error.message === 'Network Error' || !error.response) {
    return 'Unable to reach backend server. Please verify your internet connection or backend server/tunnel.';
  }

  const status = error.response?.status;
  const data = error.response?.data;

  // Structured FastAPI / Pydantic errors
  if (data) {
    if (typeof data.detail === 'string' && data.detail.trim()) {
      return data.detail;
    }
    
    // Pydantic validation array: [{ loc: ['body', 'field'], msg: '...', type: '...' }]
    if (Array.isArray(data.detail) && data.detail.length > 0) {
      return data.detail
        .map((item) => {
          if (typeof item === 'string') return item;
          const field = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : item.loc;
          const cleanField = field && field !== 'body' ? `${field}: ` : '';
          return `${cleanField}${item.msg || 'Invalid field'}`;
        })
        .join(' • ');
    }

    if (data.message && typeof data.message === 'string') {
      return data.message;
    }

    if (Array.isArray(data.errors) && data.errors.length > 0) {
      return data.errors.join(' • ');
    }
  }

  // HTTP Status Code specific fallbacks
  switch (status) {
    case 400:
      return 'Bad Request (400): Please check the entered information.';
    case 401:
      return 'Invalid credentials or session expired (401).';
    case 403:
      return 'Access Denied (403): You do not have permission for this role/action.';
    case 404:
      return 'Not Found (404): The requested record was not found.';
    case 409:
      return 'Conflict (409): A record with these details already exists.';
    case 422:
      return 'Validation Error (422): Please check form fields and try again.';
    case 500:
      return 'Internal Server Error (500): The server encountered an error.';
    case 502:
      return 'Bad Gateway (502): Backend server or tunnel proxy is not responding.';
    case 503:
      return 'Service Unavailable (503): Backend server is offline.';
    case 504:
      return 'Gateway Timeout (504): Backend server took too long to reply.';
    default:
      return error.message || defaultFallback;
  }
};

export default api;

