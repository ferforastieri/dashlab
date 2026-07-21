import { useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from '../http/client';
import { keys } from '../shared/keys';
export const useUpdateApplication = () => {
  const q = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) =>
      (await client.patch(`/applications/${id}`, data)).data,
    onSuccess: () => q.invalidateQueries({ queryKey: keys.dashboard }),
  });
};
