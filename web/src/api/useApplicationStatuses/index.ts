import {useQuery} from '@tanstack/react-query';import {client} from '../client';import {keys} from '../keys';
export const useApplicationStatuses=()=>useQuery({queryKey:keys.statuses,queryFn:async()=>(await client.get('/applications/status')).data,refetchInterval:30000});
