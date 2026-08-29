import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../core/apiClient';
import { queryKeys } from '../core/queryKeys';
export const useDashboardQuery = () =>
  useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: async () => (await apiClient.get('/dashboard?surface=web')).data,
  });
