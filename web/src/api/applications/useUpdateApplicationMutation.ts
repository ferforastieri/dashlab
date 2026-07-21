import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../core/apiClient';
import { queryKeys } from '../core/queryKeys';
export const useUpdateApplicationMutation = () => {
  const q = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) =>
      (await apiClient.patch(`/applications/${id}`, data)).data,
    onSuccess: () => q.invalidateQueries({ queryKey: queryKeys.dashboard }),
  });
};
