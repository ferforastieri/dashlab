import { useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from '../http/client';
import { keys } from '../shared/keys';
export const useSaveLayout = () => {
  const q = useQueryClient();
  return useMutation({
    mutationFn: async (items: any[]) => (await client.put('/layouts/mobile', { items })).data,
    onSuccess: () => q.invalidateQueries({ queryKey: keys.dashboard }),
  });
};
