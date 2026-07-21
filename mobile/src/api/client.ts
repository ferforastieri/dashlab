import AsyncStorage from '@react-native-async-storage/async-storage';import * as SecureStore from 'expo-secure-store';import axios from 'axios';
const STORE='dashlab_server',TOKEN='dashlab_token',REFRESH='dashlab_refresh';let server='',access='',toast:(message:string,type:'success'|'error')=>void=()=>{};
export const client=axios.create({timeout:10000});
client.interceptors.request.use(config=>{config.baseURL=server;if(access)config.headers.Authorization=`Bearer ${access}`;return config});
client.interceptors.response.use(response=>{if((response.config.method||'get')!=='get'&&!response.config.url?.includes('/auth/refresh')&&response.data?.message)toast(response.data.message,'success');return response},async error=>{const original=error.config;if(error.response?.status===401&&!original?._retry){const refreshToken=await SecureStore.getItemAsync(REFRESH);if(refreshToken){original._retry=true;try{const {data}=await axios.post(`${server}/auth/refresh`,{refreshToken});await saveSession(data);return client(original)}catch{}}}const value=error.response?.data?.message,message=Array.isArray(value)?value[0]:value||'Não foi possível continuar';if((original?.method||'get')!=='get')toast(message,'error');return Promise.reject(new Error(message))});
export async function initializeApi(){const [savedServer,savedToken]=await Promise.all([AsyncStorage.getItem(STORE),SecureStore.getItemAsync(TOKEN)]);server=savedServer||'';access=savedToken||'';return{hasServer:!!server,authenticated:!!access}}
export async function configureServer(value:string){server=value;await AsyncStorage.setItem(STORE,value)}
export const health=async()=>(await axios.get(`${server}/health`,{timeout:6000})).data;
export async function saveSession(data:any){access=data.accessToken;await Promise.all([SecureStore.setItemAsync(TOKEN,access),SecureStore.setItemAsync(REFRESH,data.refreshToken)])}
export async function clearSession(){access='';await Promise.all([SecureStore.deleteItemAsync(TOKEN),SecureStore.deleteItemAsync(REFRESH)])}
export const setToastSink=(sink:typeof toast)=>{toast=sink};
