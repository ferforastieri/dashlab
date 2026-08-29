import axios from 'axios';

const notify = (message: string, type: 'success' | 'error' = 'success') =>
  window.dispatchEvent(new CustomEvent('dashlab-plus:toast', { detail: { message, type } }));

export const apiClient = axios.create({ baseURL: '/api', timeout: 10000 });

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if ((original?.method || 'get') !== 'get' && original?.headers?.['X-Silent-Toast'] !== 'true') {
      const value = error.response?.data?.message;
      notify(Array.isArray(value) ? value[0] : value || 'Não foi possível continuar', 'error');
    }
    return Promise.reject(error);
  },
);
