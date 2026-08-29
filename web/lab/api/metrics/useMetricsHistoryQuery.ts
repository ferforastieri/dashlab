import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../core/apiClient';
import { queryKeys } from '../core/queryKeys';
export const useMetricsHistoryQuery = (range = '1h') =>
  useQuery({
    queryKey: [...queryKeys.history, range],
    queryFn: async () => (await apiClient.get(`/metrics/history?range=${range}`)).data,
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  });
