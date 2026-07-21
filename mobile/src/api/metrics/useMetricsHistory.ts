import { useQuery } from '@tanstack/react-query';
import { client } from '../http/client';
import { keys } from '../shared/keys';
export const useMetricsHistory = () =>
  useQuery({
    queryKey: keys.history,
    queryFn: async () => (await client.get('/metrics/history?range=1h')).data,
    refetchInterval: 30000,
  });
