import { useQuery } from '@tanstack/react-query';
import { client } from '../http/client';
import { keys } from '../shared/keys';
export const useMetricsOverview = () =>
  useQuery({
    queryKey: keys.metrics,
    queryFn: async () => (await client.get('/metrics/overview')).data,
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
  });
