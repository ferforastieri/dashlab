import { useMutation } from '@tanstack/react-query';
import { apiClient, setSession } from '../core/apiClient';
export const useRegisterMutation = () =>
  useMutation({
    mutationFn: async (body: { username: string; password: string }) =>
      (await apiClient.post('/auth/register', body)).data,
    onSuccess: setSession,
  });
