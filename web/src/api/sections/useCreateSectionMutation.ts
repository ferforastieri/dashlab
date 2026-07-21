import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../core/apiClient';
import { queryKeys } from '../core/queryKeys';

export const useCreateSectionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; applicationIds: string[] }) => (await apiClient.post('/sections', data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
  });
};
