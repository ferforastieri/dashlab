import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../core/apiClient';
export const useWidgetDataQuery = (id: string, enabled: boolean) =>
  useQuery({
    queryKey: ['widget-data', id],
    queryFn: async () => (await apiClient.get(`/widgets/${id}/data`)).data,
    enabled,
    refetchInterval: 30000,
  });
