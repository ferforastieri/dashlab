import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../core/apiClient';
import { queryKeys } from '../core/queryKeys';
export const useRevokeSessionMutation = () => {
  const q = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await apiClient.delete(`/auth/sessions/${id}`)).data,
    onSuccess: () => q.invalidateQueries({ queryKey: queryKeys.sessions }),
  });
};
