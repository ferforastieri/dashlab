import axios from 'axios';

type SessionResponse = {
  accessToken: string;
  refreshToken: string;
};

let access =
  sessionStorage.getItem('dashlab_access') || localStorage.getItem('dashlab_access') || '';
let refreshPromise: Promise<void> | null = null;

const getRefreshToken = () => localStorage.getItem('dashlab_refresh') || '';
const notify = (message: string, type: 'success' | 'error' = 'success') =>
  window.dispatchEvent(new CustomEvent('dashlab:toast', { detail: { message, type } }));

export const apiClient = axios.create({ baseURL: '/api', timeout: 10000 });

apiClient.interceptors.request.use((config) => {
  if (access) config.headers.Authorization = `Bearer ${access}`;
  return config;
});
apiClient.interceptors.response.use(
  (response) => {
    if (
      (response.config.method || 'get') !== 'get' &&
      response.data?.message &&
      response.config.headers?.['X-Silent-Toast'] !== 'true' &&
      !response.config.url?.includes('/auth/refresh')
    )
      notify(response.data.message);
    return response;
  },
  async (error) => {
    const original = error.config;
    const isAuthenticationRequest = ['/auth/login', '/auth/register', '/auth/refresh'].some(
      (path) => original?.url?.includes(path),
    );

    if (
      error.response?.status === 401 &&
      getRefreshToken() &&
      original &&
      !original._retry &&
      !isAuthenticationRequest
    ) {
      original._retry = true;
      try {
        await refreshSession();
        original.headers.Authorization = `Bearer ${access}`;
        return apiClient(original);
      } catch {
        return Promise.reject(error);
      }
    }
    if ((original?.method || 'get') !== 'get' && original?.headers?.['X-Silent-Toast'] !== 'true') {
      const value = error.response?.data?.message;
      notify(Array.isArray(value) ? value[0] : value || 'Não foi possível continuar', 'error');
    }
    return Promise.reject(error);
  },
);

export function setSession(data: SessionResponse) {
  access = data.accessToken;
  sessionStorage.setItem('dashlab_access', access);
  localStorage.setItem('dashlab_refresh', data.refreshToken);
}

export function clearSession() {
  access = '';
  sessionStorage.removeItem('dashlab_access');
  localStorage.removeItem('dashlab_access');
  localStorage.removeItem('dashlab_refresh');
}

export function hasRefreshToken() {
  return Boolean(getRefreshToken());
}

export function refreshSession() {
  if (refreshPromise) return refreshPromise;

  const refreshToken = getRefreshToken();
  if (!refreshToken) return Promise.reject(new Error('Refresh token ausente'));

  refreshPromise = axios
    .post<SessionResponse>('/api/auth/refresh', { refreshToken })
    .then(({ data }) => setSession(data))
    .catch((error) => {
      clearSession();
      window.dispatchEvent(new Event('dashlab:session-expired'));
      throw error;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

export const isAuthenticated = () => !!access;
