import { useMutation } from '@tanstack/react-query';
import { apiClient, setSession } from '../core/apiClient';
export const useLoginMutation = () =>
  useMutation({
    mutationFn: async (body: { username: string; password: string }) =>
      (await apiClient.post('/auth/login', body)).data,
    onSuccess: setSession,
  });
