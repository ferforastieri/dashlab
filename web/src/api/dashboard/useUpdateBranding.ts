import { useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from '../http/client';
import { keys } from '../shared/keys';
export const useUpdateBranding = () => {
  const q = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => (await client.put('/branding', data)).data,
    onSuccess: () => q.invalidateQueries({ queryKey: keys.dashboard }),
  });
};
