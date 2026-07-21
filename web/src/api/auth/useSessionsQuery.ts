import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../core/apiClient';
import { queryKeys } from '../core/queryKeys';
export const useSessionsQuery = () =>
  useQuery({
    queryKey: queryKeys.sessions,
    queryFn: async () => (await apiClient.get('/auth/sessions')).data,
  });
