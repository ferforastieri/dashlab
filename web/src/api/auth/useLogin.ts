import { useMutation } from '@tanstack/react-query';
import { client, setSession } from '../http/client';
export const useLogin = () =>
  useMutation({
    mutationFn: async (body: { username: string; password: string }) =>
      (await client.post('/auth/login', body)).data,
    onSuccess: setSession,
  });
