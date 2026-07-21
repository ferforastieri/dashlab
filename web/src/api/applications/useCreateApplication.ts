import { useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from '../http/client';
import { keys } from '../shared/keys';
export const useCreateApplication = () => {
  const q = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => (await client.post('/applications', data)).data,
    onSuccess: () => q.invalidateQueries({ queryKey: keys.dashboard }),
  });
};
