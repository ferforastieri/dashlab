import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../core/apiClient';
import { queryKeys } from '../core/queryKeys';
export const useUpdateBrandingMutation = () => {
  const q = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => (await apiClient.put('/branding', data)).data,
    onSuccess: () => q.invalidateQueries({ queryKey: queryKeys.dashboard }),
  });
};
