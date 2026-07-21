import { useMutation } from '@tanstack/react-query';
import { apiClient, clearSession } from '../core/apiClient';
export const useDeleteAccountMutation = () =>
  useMutation({
    mutationFn: async (password: string) =>
      (await apiClient.delete('/auth/account', { data: { password } })).data,
    onSuccess: clearSession,
  });
