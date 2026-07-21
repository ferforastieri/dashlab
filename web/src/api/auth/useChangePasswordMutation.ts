import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../core/apiClient';
export const useChangePasswordMutation = () =>
  useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) =>
      (await apiClient.post('/auth/change-password', data)).data,
  });
