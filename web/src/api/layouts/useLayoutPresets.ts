import { useQuery } from '@tanstack/react-query';
import { client } from '../http/client';
import { keys } from '../shared/keys';
export const useLayoutPresets = () =>
  useQuery({
    queryKey: keys.presets,
    queryFn: async () => (await client.get('/layout-presets')).data,
  });
