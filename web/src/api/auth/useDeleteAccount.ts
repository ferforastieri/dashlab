import { useMutation } from '@tanstack/react-query';
import { client, clearSession } from '../http/client';
export const useDeleteAccount = () =>
  useMutation({
    mutationFn: async (password: string) =>
      (await client.delete('/auth/account', { data: { password } })).data,
    onSuccess: clearSession,
  });
