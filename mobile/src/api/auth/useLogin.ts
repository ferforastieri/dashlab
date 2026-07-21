import { useMutation } from '@tanstack/react-query';
import { client, saveSession } from '../http/client';
export const useLogin = () =>
  useMutation({
    mutationFn: async (data: { username: string; password: string }) =>
      (await client.post('/auth/login', data)).data,
    onSuccess: saveSession,
  });
