import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../core/apiClient';
import { queryKeys } from '../core/queryKeys';
export const useMetricsOverviewQuery = () =>
  useQuery({
    queryKey: queryKeys.metrics,
    queryFn: async () => (await apiClient.get('/metrics/overview')).data,
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
  });
