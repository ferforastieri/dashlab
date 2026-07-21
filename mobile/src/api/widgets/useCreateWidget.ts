import { useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from '../http/client';
import { keys } from '../shared/keys';
export const useCreateWidget = () => {
  const q = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => (await client.post('/widgets', data)).data,
    onSuccess: () => q.invalidateQueries({ queryKey: keys.dashboard }),
  });
};
