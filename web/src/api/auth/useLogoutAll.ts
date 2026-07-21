import { useMutation } from '@tanstack/react-query';
import { client, clearSession } from '../http/client';
export const useLogoutAll = () =>
  useMutation({
    mutationFn: async () => (await client.post('/auth/logout-all')).data,
    onSuccess: clearSession,
  });
