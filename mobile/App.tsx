import { Ionicons } from "@expo/vector-icons";
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import * as Linking from "expo-linking";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {clearSession,initializeApi,setToastSink} from './src/api/client';import {useConnectServer} from './src/api/useConnectServer';import {useLogin} from './src/api/useLogin';import {useRegister} from './src/api/useRegister';import {useDashboard} from './src/api/useDashboard';import {useMetricsOverview} from './src/api/useMetricsOverview';import {useMetricsHistory} from './src/api/useMetricsHistory';import {useCreateApplication} from './src/api/useCreateApplication';import {useUpdateApplication} from './src/api/useUpdateApplication';import {useCreateWidget} from './src/api/useCreateWidget';import {useUpdateWidget} from './src/api/useUpdateWidget';import {useUpdateBranding} from './src/api/useUpdateBranding';import {useDeleteApplication} from './src/api/useDeleteApplication';import {useDeleteWidget} from './src/api/useDeleteWidget';import {useSaveLayout} from './src/api/useSaveLayout';import {useChangePassword} from './src/api/useChangePassword';
type Phase = "loading" | "server" | "auth" | "dashboard";
type AppItem = {
  id: string;
  name: string;
  url: string;
  deepLink?: string;
  icon?: string;
  inDock: boolean;
};
const queryClient=new QueryClient({defaultOptions:{queries:{retry:1,refetchOnWindowFocus:false}}});
function normalize(value: string) {
  const url = new URL(value.trim());
  if (!["http:", "https:"].includes(url.protocol))
    throw new Error("Use http:// ou https://");
  url.pathname = url.pathname.replace(/\/+$/, "") + "/api";
  return url.toString().replace(/\/$/, "");
}
export default function App() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [toast,setToast]=useState<{message:string,type:'success'|'error'}|null>(null);
  useEffect(()=>{setToastSink((message,type)=>{setToast({message,type});setTimeout(()=>setToast(null),3500)});return()=>setToastSink(()=>{})},[]);
  useEffect(() => {
    initializeApi().then(({hasServer,authenticated})=>setPhase(!hasServer?'server':authenticated?'dashboard':'auth'));
  }, []);
  let content:React.ReactNode;
  if (phase === "loading")
    content = (
      <Center>
        <ActivityIndicator color="#ff7a1a" />
      </Center>
    );
  else if (phase === "server") content=<ServerSetup done={() => setPhase("auth")} />;
  else if (phase === "auth")
    content = (
      <Auth
        done={() => setPhase("dashboard")}
        reset={() => setPhase("server")}
      />
    );
  else content = (
    <Dashboard
      logout={async () => {
        await clearSession();queryClient.clear();
        setPhase("auth");
      }}
    />
  );
  return <QueryClientProvider client={queryClient}><View className="flex-1">{content}{toast&&<View style={[s.toast,toast.type==='error'&&s.toastError]}><Text style={s.toastText}>{toast.message}</Text></View>}</View></QueryClientProvider>;
}
function ServerSetup({ done }: { done: () => void }) {
  const connectServer=useConnectServer();
  const [url, setUrl] = useState("https://dashboard.example.invalid"),
    [busy, setBusy] = useState(false),[error,setError]=useState('');
  async function connect() {
    setBusy(true);
    try {
      const normalized = normalize(url);
      await connectServer.mutateAsync(normalized);
      done();
    } catch {
      setError('Não foi possível conectar ao endereço informado.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <SafeAreaView style={s.page}>
      <KeyboardAvoidingView
        style={s.center}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Logo />
        <Text style={s.title}>Conecte ao seu DashLab</Text>
        <Text style={s.muted}>
          Digite o endereço do seu servidor para continuar.
        </Text>
        <TextInput
          style={s.input}
          autoCapitalize="none"
          keyboardType="url"
          value={url}
          onChangeText={setUrl}
          placeholder="https://home.exemplo.com"
          placeholderTextColor="#617184"
        />
        <Button title={busy ? "Conectando…" : "Conectar"} onPress={connect} />
      </KeyboardAvoidingView>
      {!!error&&<InfoModal title="Servidor indisponível" message={error} close={()=>setError('')}/>}
    </SafeAreaView>
  );
}
function Auth({ done, reset }: { done: () => void; reset: () => void }) {
  const login=useLogin(),createAccount=useRegister();
  const [register, setRegister] = useState(false),
    [username, setUsername] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    try {
      await (register?createAccount:login).mutateAsync({username,password});
      done();
    } catch {} finally {
      setBusy(false);
    }
  }
  return (
    <SafeAreaView style={s.page}>
      <View style={s.center}>
        <Logo />
        <Text style={s.title}>
          {register ? "Crie sua conta" : "Seu homelab, do seu jeito"}
        </Text>
        <TextInput
          style={s.input}
          autoCapitalize="none"
          placeholder="Usuário"
          placeholderTextColor="#617184"
          value={username}
          onChangeText={setUsername}
        />
        <TextInput
          style={s.input}
          secureTextEntry
          placeholder="Senha"
          placeholderTextColor="#617184"
          value={password}
          onChangeText={setPassword}
        />
        <Button
          title={busy ? "Aguarde…" : register ? "Criar conta" : "Entrar"}
          onPress={submit}
        />
        <Pressable onPress={() => setRegister(!register)}>
          <Text style={s.link}>
            {register ? "Já tenho uma conta" : "Criar uma conta"}
          </Text>
        </Pressable>
        <Pressable onPress={reset}>
          <Text style={s.subtle}>Trocar servidor</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
function Dashboard({ logout }: { logout: () => void }) {
  const dashboardQuery=useDashboard(),metricsQuery=useMetricsOverview(),historyQuery=useMetricsHistory(),createApplication=useCreateApplication(),updateApplication=useUpdateApplication(),createWidget=useCreateWidget(),updateWidget=useUpdateWidget(),updateBranding=useUpdateBranding(),deleteApplication=useDeleteApplication(),deleteWidget=useDeleteWidget(),saveLayout=useSaveLayout(),changePassword=useChangePassword(),data=dashboardQuery.data,metrics=(metricsQuery.data||{}) as Record<string,number|null>,history=historyQuery.data||{};
  const [show, setShow] = useState(false),
    [mode,setMode] = useState<'app'|'widget'|'brand'|'account'>('app'),
    [selected,setSelected] = useState<any>(null),
    [actionItem,setActionItem] = useState<{kind:'app'|'widget',item:any}|null>(null),
    [confirmDelete,setConfirmDelete] = useState<{kind:'applications'|'widgets',id:string,name:string}|null>(null),
    [info,setInfo]=useState<{title:string,message:string}|null>(null),
    [query,setQuery] = useState(''),
    [name, setName] = useState(""),
    [url, setUrl] = useState("https://"),
    [extra,setExtra] = useState('');
  function edit(kind:'app'|'widget', item:any) { setMode(kind);setSelected(item);setName(item.name || item.title);setUrl(item.url || 'https://');setExtra(item.category || item.type || 'SYSTEM');setShow(true); }
  async function save() {
    try {
      if(mode==='app') await(selected?updateApplication.mutateAsync({id:selected.id,data:{name,url,category:extra||undefined}}):createApplication.mutateAsync({name,url,category:extra||undefined}));
      if(mode==='widget') await(selected
        ?updateWidget.mutateAsync({id:selected.id,data:{title:name,type:extra||'SYSTEM',config:selected.config||{}}})
        :createWidget.mutateAsync({title:name,type:extra||'SYSTEM',config:{}}));
      if(mode==='brand') await updateBranding.mutateAsync({name,accent:extra||'#ff7a1a',wallpaper:url==='https://'?'':url});
      if(mode==='account') await changePassword.mutateAsync({currentPassword:name,newPassword:url});
      setShow(false);
      setName("");
      setSelected(null); setExtra(''); setUrl('https://');
    } catch {}
  }
  async function remove(){if(!confirmDelete)return;const x=confirmDelete;setConfirmDelete(null);try{await(x.kind==='applications'?deleteApplication.mutateAsync(x.id):deleteWidget.mutateAsync(x.id))}catch{}}
  async function saveLayouts(layouts:any[]){await saveLayout.mutateAsync(layouts.map((x:any)=>({kind:x.kind,applicationId:x.applicationId,widgetId:x.widgetId,x:x.x||0,y:x.y||0,w:x.w||1,h:x.h||1})))}
  async function moveItem(kind:'APPLICATION'|'WIDGET',id:string,delta:number){const layouts=[...data.layouts],same=layouts.filter((x:any)=>x.kind===kind),field=kind==='APPLICATION'?'applicationId':'widgetId',at=same.findIndex((x:any)=>x[field]===id),to=Math.max(0,Math.min(same.length-1,at+delta));if(at===to)return;const a=same[at],b=same[to],ai=layouts.indexOf(a),bi=layouts.indexOf(b);[layouts[ai],layouts[bi]]=[layouts[bi],layouts[ai]];await saveLayouts(layouts)}
  async function resizeItem(id:string,delta:number){await saveLayouts(data.layouts.map((x:any)=>x.widgetId===id?{...x,w:Math.max(1,Math.min(6,(x.w||1)+delta))}:x))}
  async function open(app: AppItem) {
    if (app.deepLink) {
      const ok = await Linking.canOpenURL(app.deepLink);
      if (ok) return Linking.openURL(app.deepLink);
    }
    Linking.openURL(app.url);
  }
  if (!data)
    return (
      <Center>
        <ActivityIndicator color="#ff7a1a" />
      </Center>
    );
  return (
    <SafeAreaView style={s.page}>
      <StatusBar style="light" />
      <View style={s.header}>
        <View>
          <Text style={s.brand}>{data.branding?.name || data.name}</Text>
          <Text style={s.muted}>Seu espaço pessoal</Text>
        </View>
        <View style={{flexDirection:'row',gap:18}}><Pressable onPress={()=>{setMode('brand');setName(data.branding?.name||data.name);setUrl(data.branding?.wallpaper||'https://');setExtra(data.branding?.accent||'#ff7a1a');setShow(true)}}><Ionicons name="settings-outline" color="#dbe5ef" size={23}/></Pressable><Pressable onLongPress={logout} onPress={()=>{setMode('account');setName('');setUrl('');setShow(true)}}><Ionicons name="person-circle-outline" color="#dbe5ef" size={25} /></Pressable></View>
      </View>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.search}>
          <Ionicons name="search" color="#8190a2" size={18} />
          <TextInput style={s.searchInput} value={query} onChangeText={setQuery} placeholder="Pesquisar apps ou web" placeholderTextColor="#8190a2" returnKeyType="search" onSubmitEditing={()=>{const local=data.applications.find((a:any)=>a.name.toLowerCase().includes(query.toLowerCase()));local?open(local):Linking.openURL(`https://google.com/search?q=${encodeURIComponent(query)}`)}}/>
        </View>
        <Text style={s.section}>Aplicativos</Text>
        <FlatList
          scrollEnabled={false}
          data={data.layouts.filter((l:any)=>l.kind==='APPLICATION').map((l:any)=>data.applications.find((a:any)=>a.id===l.applicationId)).filter((a:any)=>a&&(!query||a.name.toLowerCase().includes(query.toLowerCase())))}
          numColumns={3}
          keyExtractor={(x: any) => x.id}
          renderItem={({ item }) => (
            <Pressable style={s.app} onPress={() => open(item)} onLongPress={()=>setActionItem({kind:'app',item})}>
              <View style={s.appIcon}>
                <Image source={{uri:appImage(item)}} style={s.realAppIcon}/>
              </View>
              <Text numberOfLines={1} style={s.appName}>
                {item.name}
              </Text>
            </Pressable>
          )}
        />
        <Text style={s.section}>Visão geral</Text>
        <View style={s.widgets}>
          {data.widgets.slice(0, 6).map((w: any) => (
            <Pressable style={s.widget} key={w.id} onLongPress={()=>setActionItem({kind:'widget',item:w})}>
              <Ionicons name={widgetIcon(w.type)} color="#ff8b35" size={21} />
              <Text style={s.widgetTitle}>{w.title}</Text>
              <Text style={s.metric}>{widgetValue(w.type, metrics)}</Text>
              {['SYSTEM','STORAGE','NETWORK'].includes(w.type)&&<MiniBars values={widgetSeries(w.type,history)}/>}
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <Pressable style={s.fab} onPress={() => {setMode('app');setSelected(null);setName('');setUrl('https://');setExtra('');setShow(true)}} onLongPress={()=>{setMode('widget');setName('');setExtra('SYSTEM');setShow(true)}}>
        <Ionicons name="add" color="white" size={30} />
      </Pressable>
      <Modal
        transparent
        visible={show}
        animationType="slide"
        onRequestClose={() => setShow(false)}
      >
        <View style={s.modalBack}>
          <View style={s.sheet}>
            <Text style={s.title}>{mode==='app'?(selected?'Editar aplicativo':'Novo aplicativo'):mode==='widget'?(selected?'Editar widget':'Novo widget'):mode==='brand'?'Personalizar':'Minha conta'}</Text>
            <TextInput
              style={s.input}
              placeholder={mode==='account'?'Senha atual':mode==='widget'?'Título':'Nome'}
              placeholderTextColor="#617184"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={s.input}
              secureTextEntry={mode==='account'}
              placeholder={mode==='account'?'Nova senha':'https://...'}
              placeholderTextColor="#617184"
              value={url}
              onChangeText={setUrl}
            />
            {mode==='app'&&<TextInput style={s.input} placeholder="Categoria" placeholderTextColor="#617184" value={extra} onChangeText={setExtra}/>}
            {mode==='widget'&&<View style={s.typeGrid}>{['SYSTEM','STORAGE','NETWORK','CLOCK','WEATHER','SEARCH','STATUS','PROMQL'].map(t=><Pressable key={t} onPress={()=>setExtra(t)} style={[s.typeChip,extra===t&&s.typeChipActive]}><Text style={s.typeText}>{t}</Text></Pressable>)}</View>}
            {mode==='brand'&&<TextInput style={s.input} placeholder="#ff7a1a" placeholderTextColor="#617184" value={extra} onChangeText={setExtra}/>}
            <Button title="Salvar" onPress={save} />
            {mode==='account'&&<Pressable onPress={logout}><Text style={s.link}>Sair desta conta</Text></Pressable>}
            <Pressable onPress={() => setShow(false)}>
              <Text style={s.link}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      {!!actionItem&&<ActionModal title={actionItem.item.name||actionItem.item.title} close={()=>setActionItem(null)} actions={actionItem.kind==='app'?[{label:'Mover antes',run:()=>moveItem('APPLICATION',actionItem.item.id,-1)},{label:'Mover depois',run:()=>moveItem('APPLICATION',actionItem.item.id,1)},{label:'Editar',run:()=>edit('app',actionItem.item)},{label:'Excluir',danger:true,run:()=>setConfirmDelete({kind:'applications',id:actionItem.item.id,name:actionItem.item.name})}]:[{label:'Mover antes',run:()=>moveItem('WIDGET',actionItem.item.id,-1)},{label:'Mover depois',run:()=>moveItem('WIDGET',actionItem.item.id,1)},{label:'Diminuir',run:()=>resizeItem(actionItem.item.id,-1)},{label:'Aumentar',run:()=>resizeItem(actionItem.item.id,1)},{label:'Editar',run:()=>edit('widget',actionItem.item)},{label:'Excluir',danger:true,run:()=>setConfirmDelete({kind:'widgets',id:actionItem.item.id,name:actionItem.item.title})}]}/>}
      {!!confirmDelete&&<ConfirmMobile title="Excluir item" message={`Deseja excluir “${confirmDelete.name}”?`} cancel={()=>setConfirmDelete(null)} confirm={remove}/>}
      {!!info&&<InfoModal title={info.title} message={info.message} close={()=>setInfo(null)}/>}
    </SafeAreaView>
  );
}
const appImage=(app:AppItem)=>app.icon?.startsWith('http')?app.icon:`${new URL(app.url).origin}/favicon.ico`;
const widgetIcon = (x: string): any =>
  (
    ({
      SYSTEM: "speedometer-outline",
      STORAGE: "server-outline",
      NETWORK: "swap-vertical-outline",
      CLOCK: "time-outline",
      WEATHER: "partly-sunny-outline",
      SEARCH: "search-outline",
    }) as any
    )[x] || "grid-outline";
const widgetValue = (type: string, metrics: Record<string, number | null>) => {
  const percent = (value: number | null | undefined) =>
    typeof value === "number" ? `${value.toFixed(0)}%` : "—";
  const rate = (value: number | null | undefined) =>
    typeof value === "number" ? `${(value / 1_000_000).toFixed(1)} MB/s` : "—";
  if (type === "SYSTEM") return `CPU ${percent(metrics.cpu)} · RAM ${percent(metrics.memory)}`;
  if (type === "STORAGE") return percent(metrics.disk);
  if (type === "NETWORK") return `↓ ${rate(metrics.download)} · ↑ ${rate(metrics.upload)}`;
  if (type === "CLOCK") return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return "—";
};
const widgetSeries=(type:string,history:any)=>type==='SYSTEM'?(history.cpu||[]):type==='STORAGE'?(history.disk||[]):(history.download||[]);
function MiniBars({values}:{values:Array<{value:number}>}){const points=values.slice(-24),max=Math.max(1,...points.map(x=>x.value));return <View style={s.miniChart}>{points.map((x,i)=><View key={i} style={[s.miniBar,{height:Math.max(2,(x.value/max)*30)}]}/>)}</View>}
function Logo() {
  return (
    <View style={s.logo}>
      <Text style={s.logoText}>D</Text>
    </View>
  );
}
function Button({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable style={s.button} onPress={onPress}>
      <Text style={s.buttonText}>{title}</Text>
    </Pressable>
  );
}
function Center({ children }: { children: React.ReactNode }) {
  return <View style={[s.page, s.center]}>{children}</View>;
}
function InfoModal({title,message,close}:{title:string,message:string,close:()=>void}){
  return <Modal transparent visible animationType="fade" onRequestClose={close}><View style={s.dialogBack}><View style={s.dialog}><Text style={s.dialogTitle}>{title}</Text><Text style={s.dialogMessage}>{message}</Text><Button title="Entendi" onPress={close}/></View></View></Modal>
}
function ConfirmMobile({title,message,cancel,confirm}:{title:string,message:string,cancel:()=>void,confirm:()=>void}){
  return <Modal transparent visible animationType="fade" onRequestClose={cancel}><View style={s.dialogBack}><View style={s.dialog}><Text style={s.dialogTitle}>{title}</Text><Text style={s.dialogMessage}>{message}</Text><View style={s.dialogActions}><Pressable style={s.dialogSecondary} onPress={cancel}><Text style={s.dialogSecondaryText}>Cancelar</Text></Pressable><Pressable style={s.dialogDanger} onPress={confirm}><Text style={s.buttonText}>Excluir</Text></Pressable></View></View></View></Modal>
}
function ActionModal({title,actions,close}:{title:string,actions:Array<{label:string,danger?:boolean,run:()=>void|Promise<void>}>,close:()=>void}){
  return <Modal transparent visible animationType="slide" onRequestClose={close}><Pressable style={s.modalBack} onPress={close}><Pressable style={s.actionSheet} onPress={()=>{}}><View style={s.sheetHandle}/><Text style={s.dialogTitle}>{title}</Text>{actions.map(a=><Pressable key={a.label} style={s.actionRow} onPress={()=>{close();a.run()}}><Text style={[s.actionText,a.danger&&s.actionDanger]}>{a.label}</Text></Pressable>)}<Pressable style={s.actionRow} onPress={close}><Text style={s.actionText}>Cancelar</Text></Pressable></Pressable></Pressable></Modal>
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#091019" },
  center: { flex: 1, justifyContent: "center", padding: 28, gap: 16 },
  logo: {
    width: 82,
    height: 82,
    borderRadius: 25,
    backgroundColor: "#ff7a1a",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  logoText: { fontSize: 40, fontWeight: "800", color: "white" },
  title: {
    fontSize: 25,
    fontWeight: "700",
    color: "#f6f8fb",
    textAlign: "center",
    marginBottom: 4,
  },
  muted: { color: "#8d9bac", fontSize: 14 },
  input: {
    backgroundColor: "#111d2a",
    borderWidth: 1,
    borderColor: "#263545",
    color: "white",
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
  },
  button: {
    backgroundColor: "#ff7a1a",
    padding: 15,
    borderRadius: 14,
    alignItems: "center",
  },
  buttonText: { color: "white", fontWeight: "700", fontSize: 16 },
  link: { color: "#ff9a50", textAlign: "center", padding: 8 },
  subtle: { color: "#647486", textAlign: "center" },
  header: {
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brand: { color: "white", fontSize: 23, fontWeight: "700" },
  content: { paddingHorizontal: 18, paddingBottom: 110 },
  search: {
    height: 44,
    borderRadius: 15,
    backgroundColor: "#ffffff12",
    borderWidth: 1,
    borderColor: "#ffffff16",
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 14,
  },
  searchText: { color: "#8090a2" },
  searchInput: { flex: 1, color: '#eef3f8', paddingVertical: 8 },
  section: {
    color: "#dbe5ef",
    fontWeight: "700",
    fontSize: 17,
    marginTop: 28,
    marginBottom: 16,
  },
  app: { width: "33.333%", alignItems: "center", marginBottom: 24 },
  appIcon: {
    width: 66,
    height: 66,
    borderRadius: 20,
    backgroundColor: "#ffffff14",
    borderWidth: 1,
    borderColor: "#ffffff1c",
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: { fontSize: 32 },
  realAppIcon:{width:42,height:42,borderRadius:10},
  appName: { color: "#dbe5ef", fontSize: 12, marginTop: 8, maxWidth: 95 },
  widgets: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  widget: {
    width: "100%",
    minHeight: 105,
    backgroundColor: "#ffffff10",
    borderWidth: 1,
    borderColor: "#ffffff16",
    borderRadius: 19,
    padding: 15,
  },
  widgetTitle: { color: "#9eacbc", fontSize: 12, marginTop: 7 },
  metric: { color: "white", fontSize: 23, fontWeight: "700", marginTop: 5 },
  miniChart:{height:34,marginTop:8,flexDirection:'row',alignItems:'flex-end',gap:2},
  miniBar:{flex:1,backgroundColor:'#ff7a1a',borderRadius:2,opacity:.8},
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 58,
    height: 58,
    borderRadius: 19,
    backgroundColor: "#ff7a1a",
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
  },
  modalBack: { flex: 1, backgroundColor: "#0009", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#101a26",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    gap: 14,
  },
  typeGrid:{flexDirection:'row',flexWrap:'wrap',gap:7},
  typeChip:{paddingHorizontal:10,paddingVertical:7,borderRadius:10,backgroundColor:'#ffffff0c',borderWidth:1,borderColor:'#ffffff16'},
  typeChipActive:{backgroundColor:'#ff7a1a55',borderColor:'#ff7a1a'},
  typeText:{color:'#dbe5ef',fontSize:11},
  toast:{position:'absolute',top:54,left:20,right:20,zIndex:100,elevation:20,backgroundColor:'#173426',borderColor:'#3bd47b66',borderWidth:1,borderRadius:14,paddingHorizontal:16,paddingVertical:13},
  toastError:{backgroundColor:'#3b2023',borderColor:'#ff6b6b77'},
  toastText:{color:'#f4f8fb',fontWeight:'600',textAlign:'center'},
  dialogBack:{flex:1,backgroundColor:'#000b',alignItems:'center',justifyContent:'center',padding:24},
  dialog:{width:'100%',maxWidth:420,backgroundColor:'#111d29',borderRadius:24,borderWidth:1,borderColor:'#ffffff1c',padding:22,gap:16},
  dialogTitle:{color:'#f5f8fb',fontSize:20,fontWeight:'700'},
  dialogMessage:{color:'#a9b5c2',fontSize:15,lineHeight:21},
  dialogActions:{flexDirection:'row',gap:10},
  dialogSecondary:{flex:1,padding:14,borderRadius:13,borderWidth:1,borderColor:'#ffffff22',alignItems:'center'},
  dialogSecondaryText:{color:'#dbe5ef',fontWeight:'700'},
  dialogDanger:{flex:1,padding:14,borderRadius:13,backgroundColor:'#d84b4b',alignItems:'center'},
  actionSheet:{backgroundColor:'#101a26',borderTopLeftRadius:28,borderTopRightRadius:28,padding:20,paddingBottom:34,gap:4},
  sheetHandle:{width:42,height:4,borderRadius:2,backgroundColor:'#ffffff33',alignSelf:'center',marginBottom:14},
  actionRow:{paddingVertical:15,borderBottomWidth:1,borderBottomColor:'#ffffff0c'},
  actionText:{color:'#e5ebf1',fontSize:16,textAlign:'center'},
  actionDanger:{color:'#ff7f78'},
  layoutSheet:{backgroundColor:'#101a26',borderTopLeftRadius:28,borderTopRightRadius:28,padding:20,paddingBottom:30,gap:10},
  mobilePreset:{flexDirection:'row',alignItems:'center',gap:12,padding:13,borderRadius:16,borderWidth:1,borderColor:'#ffffff14',backgroundColor:'#ffffff08'},
  mobilePresetActive:{borderColor:'#ff7a1a',backgroundColor:'#ff7a1a16'},
  mobilePresetIcon:{width:48,height:48,borderRadius:13,backgroundColor:'#071019',alignItems:'center',justifyContent:'center'},
  mobilePresetTitle:{color:'#f2f5f8',fontWeight:'700',fontSize:15},
  mobilePresetDescription:{color:'#8291a2',fontSize:11,marginTop:3},
});
