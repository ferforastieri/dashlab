import { useMutation } from '@tanstack/react-query';
import { client, setSession } from '../http/client';
export const useRegister = () =>
  useMutation({
    mutationFn: async (body: { username: string; password: string }) =>
      (await client.post('/auth/register', body)).data,
    onSuccess: setSession,
  });
