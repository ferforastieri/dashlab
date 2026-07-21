import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../core/apiClient';
import { queryKeys } from '../core/queryKeys';
export const useSaveLayoutMutation = () => {
  const q = useQueryClient();
  return useMutation({
    scope: { id: 'web-layout-save' },
    mutationFn: async (items: any[]) => (await apiClient.put('/layouts/web', { items })).data,
    onSuccess: () => q.invalidateQueries({ queryKey: queryKeys.dashboard }),
  });
};
