import {useQuery} from '@tanstack/react-query';import {client} from '../client';import {keys} from '../keys';
export const useMetricsHistory=(range='1h')=>useQuery({queryKey:[...keys.history,range],queryFn:async()=>(await client.get(`/metrics/history?range=${range}`)).data,refetchInterval:30000});
