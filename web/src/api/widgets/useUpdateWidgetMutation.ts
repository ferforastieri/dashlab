import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../core/apiClient';
import { queryKeys } from '../core/queryKeys';
export const useUpdateWidgetMutation = () => {
  const q = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) =>
      (await apiClient.patch(`/widgets/${id}`, data)).data,
    onSuccess: () => q.invalidateQueries({ queryKey: queryKeys.dashboard }),
  });
};
