import { useMutation } from '@tanstack/react-query';
import { apiClient, clearSession } from '../core/apiClient';
export const useLogoutAllMutation = () =>
  useMutation({
    mutationFn: async () => (await apiClient.post('/auth/logout-all')).data,
    onSuccess: clearSession,
  });
