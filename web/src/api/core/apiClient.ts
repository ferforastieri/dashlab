import axios from 'axios';
let access =
  sessionStorage.getItem('dashlab_access') || localStorage.getItem('dashlab_access') || '';
const refresh = () => localStorage.getItem('dashlab_refresh') || '';
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
      !response.config.url?.includes('/auth/refresh')
    )
      notify(response.data.message);
    return response;
  },
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && refresh() && !original._retry) {
      original._retry = true;
      try {
        const { data } = await axios.post('/api/auth/refresh', { refreshToken: refresh() });
        setSession(data);
        original.headers.Authorization = `Bearer ${access}`;
        return apiClient(original);
      } catch {
        clearSession();
        location.reload();
      }
    }
    if ((original?.method || 'get') !== 'get') {
      const value = error.response?.data?.message;
      notify(Array.isArray(value) ? value[0] : value || 'Não foi possível continuar', 'error');
    }
    return Promise.reject(error);
  },
);
export function setSession(data: any) {
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
export const isAuthenticated = () => !!access;
