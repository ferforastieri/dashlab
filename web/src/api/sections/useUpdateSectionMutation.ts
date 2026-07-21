import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../core/apiClient';
import { queryKeys } from '../core/queryKeys';

export const useUpdateSectionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data, silent = false }: { id: string; data: { name?: string; collapsed?: boolean; applicationIds?: string[] }; silent?: boolean }) =>
      (await apiClient.patch(`/sections/${id}`, data, silent ? { headers: { 'X-Silent-Toast': 'true' } } : undefined)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
  });
};
