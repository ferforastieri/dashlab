import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../core/apiClient';
import { queryKeys } from '../core/queryKeys';
export const useApplicationStatusesQuery = () =>
  useQuery({
    queryKey: queryKeys.statuses,
    queryFn: async () => (await apiClient.get('/applications/status')).data,
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  });
