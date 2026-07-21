import { useMutation } from '@tanstack/react-query';
import { client, saveSession } from '../http/client';
export const useRegister = () =>
  useMutation({
    mutationFn: async (data: { username: string; password: string }) =>
      (await client.post('/auth/register', data)).data,
    onSuccess: saveSession,
  });
