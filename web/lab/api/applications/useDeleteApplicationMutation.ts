import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../core/apiClient';
import { queryKeys } from '../core/queryKeys';
export const useDeleteApplicationMutation = () => {
  const q = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await apiClient.delete(`/applications/${id}`)).data,
    onSuccess: () => q.invalidateQueries({ queryKey: queryKeys.dashboard }),
  });
};
