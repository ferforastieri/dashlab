import { useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from '../http/client';
import { keys } from '../shared/keys';
export const useRevokeSession = () => {
  const q = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await client.delete(`/auth/sessions/${id}`)).data,
    onSuccess: () => q.invalidateQueries({ queryKey: keys.sessions }),
  });
};
