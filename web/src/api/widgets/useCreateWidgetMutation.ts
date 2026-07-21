import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../core/apiClient';
import { queryKeys } from '../core/queryKeys';
export const useCreateWidgetMutation = () => {
  const q = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => (await apiClient.post('/widgets', data)).data,
    onSuccess: () => q.invalidateQueries({ queryKey: queryKeys.dashboard }),
  });
};
