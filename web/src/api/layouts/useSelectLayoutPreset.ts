import { useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from '../http/client';
import { keys } from '../shared/keys';
export const useSelectLayoutPreset = () => {
  const q = useQueryClient();
  return useMutation({
    mutationFn: async (preset: string) =>
      (await client.put('/layout-presets/active', { preset, surface: 'WEB' })).data,
    onSuccess: () => q.invalidateQueries({ queryKey: keys.dashboard }),
  });
};
