import { useQuery } from '@tanstack/react-query';
import { client } from '../http/client';
import { keys } from '../shared/keys';
export const useSessions = () =>
  useQuery({
    queryKey: keys.sessions,
    queryFn: async () => (await client.get('/auth/sessions')).data,
  });
