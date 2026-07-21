import {useQuery} from '@tanstack/react-query';import {client} from '../client';import {keys} from '../keys';
export const useDashboard=()=>useQuery({queryKey:keys.dashboard,queryFn:async()=>(await client.get('/dashboard?surface=web')).data});
