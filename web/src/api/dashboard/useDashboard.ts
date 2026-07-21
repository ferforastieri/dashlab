import { useQuery } from '@tanstack/react-query';
import { client } from '../http/client';
import { keys } from '../shared/keys';
export const useDashboard = () =>
  useQuery({
    queryKey: keys.dashboard,
    queryFn: async () => (await client.get('/dashboard?surface=web')).data,
  });
