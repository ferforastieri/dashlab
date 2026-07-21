import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { configureServer } from '../http/client';
export const useConnectServer = () =>
  useMutation({
    mutationFn: async (server: string) => {
      await axios.get(`${server}/health`, { timeout: 6000 });
      await configureServer(server);
      return true;
    },
  });
