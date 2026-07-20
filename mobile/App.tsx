import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
type Phase = "loading" | "server" | "auth" | "dashboard";
type AppItem = {
  id: string;
  name: string;
  url: string;
  deepLink?: string;
  icon?: string;
  inDock: boolean;
};
const STORE = "dashlab_server",
  TOKEN = "dashlab_token", REFRESH = 'dashlab_refresh';
let server = "";
let token = "";
async function request(path: string, options: RequestInit = {}) {
  let r = await fetch(`${server}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (r.status === 401 && path !== '/auth/refresh') {
    const refreshToken = await SecureStore.getItemAsync(REFRESH);
    if (refreshToken) {
      const rr = await fetch(`${server}/auth/refresh`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({refreshToken})});
      if (rr.ok) { const session=await rr.json(); token=session.accessToken; await SecureStore.setItemAsync(TOKEN,token); await SecureStore.setItemAsync(REFRESH,session.refreshToken); r=await fetch(`${server}${path}`,{...options,headers:{'content-type':'application/json',authorization:`Bearer ${token}`,...options.headers}}); }
    }
  }
  const d = await r.json().catch(() => ({}));
  if (!r.ok)
    throw new Error(
      Array.isArray(d.message)
        ? d.message[0]
        : d.message || "Não foi possível continuar",
    );
  return d;
}
function normalize(value: string) {
  const url = new URL(value.trim());
  if (!["http:", "https:"].includes(url.protocol))
    throw new Error("Use http:// ou https://");
  url.pathname = url.pathname.replace(/\/+$/, "") + "/api";
  return url.toString().replace(/\/$/, "");
}
export default function App() {
  const [phase, setPhase] = useState<Phase>("loading");
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(STORE),
      SecureStore.getItemAsync(TOKEN),
    ]).then(async ([s, t]) => {
      if (!s) return setPhase("server");
      server = s;
      token = t || "";
      setPhase(t ? "dashboard" : "auth");
    });
  }, []);
  if (phase === "loading")
    return (
      <Center>
        <ActivityIndicator color="#ff7a1a" />
      </Center>
    );
  if (phase === "server") return <ServerSetup done={() => setPhase("auth")} />;
  if (phase === "auth")
    return (
      <Auth
        done={() => setPhase("dashboard")}
        reset={() => setPhase("server")}
      />
    );
  return (
    <Dashboard
      logout={async () => {
        await SecureStore.deleteItemAsync(TOKEN);
        await SecureStore.deleteItemAsync(REFRESH);
        token = "";
        setPhase("auth");
      }}
    />
  );
}
function ServerSetup({ done }: { done: () => void }) {
  const [url, setUrl] = useState("https://dashboard.example.invalid"),
    [busy, setBusy] = useState(false);
  async function connect() {
    setBusy(true);
    try {
      const normalized = normalize(url);
      const r = await fetch(`${normalized}/health`);
      if (!r.ok) throw new Error();
      server = normalized;
      await AsyncStorage.setItem(STORE, normalized);
      done();
    } catch {
      Alert.alert(
        "Servidor indisponível",
        "Confira o endereço e tente novamente.",
      );
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
    </SafeAreaView>
  );
}
function Auth({ done, reset }: { done: () => void; reset: () => void }) {
  const [register, setRegister] = useState(false),
    [username, setUsername] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    try {
      const d = await request(`/auth/${register ? "register" : "login"}`, {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      token = d.accessToken;
      await SecureStore.setItemAsync(TOKEN, token);
      await SecureStore.setItemAsync(REFRESH, d.refreshToken);
      done();
    } catch (e: any) {
      Alert.alert("Não foi possível entrar", e.message);
    } finally {
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
  const [data, setData] = useState<any>(null),
    [metrics, setMetrics] = useState<Record<string, number | null>>({}),
    [show, setShow] = useState(false),
    [mode,setMode] = useState<'app'|'widget'|'brand'|'account'>('app'),
    [selected,setSelected] = useState<any>(null),
    [query,setQuery] = useState(''),
    [name, setName] = useState(""),
    [url, setUrl] = useState("https://"),
    [extra,setExtra] = useState('');
  const load = () =>
    request("/dashboard?surface=mobile")
      .then(setData)
      .catch((e) => Alert.alert("Erro", e.message));
  useEffect(() => {
    load();
    const loadMetrics = () =>
      request("/metrics/overview")
        .then(setMetrics)
        .catch(() => undefined);
    loadMetrics();
    const timer = setInterval(loadMetrics, 10000);
    return () => clearInterval(timer);
  }, []);
  function edit(kind:'app'|'widget', item:any) { setMode(kind);setSelected(item);setName(item.name || item.title);setUrl(item.url || 'https://');setExtra(item.category || item.type || 'SYSTEM');setShow(true); }
  async function save() {
    try {
      if(mode==='app') await request(selected?`/applications/${selected.id}`:"/applications", { method:selected?'PATCH':'POST', body:JSON.stringify({ name, url, category:extra || undefined }) });
      if(mode==='widget') await request(selected?`/widgets/${selected.id}`:'/widgets',{method:selected?'PATCH':'POST',body:JSON.stringify({title:name,type:extra||'SYSTEM',config:selected?.config||{}})});
      if(mode==='brand') await request('/branding',{method:'PUT',body:JSON.stringify({name,accent:extra || '#ff7a1a',wallpaper:url==='https://'?'':url})});
      if(mode==='account') await request('/auth/change-password',{method:'POST',body:JSON.stringify({currentPassword:name,newPassword:url})});
      setShow(false);
      setName("");
      setSelected(null); setExtra(''); setUrl('https://');
      load();
    } catch (e: any) {
      Alert.alert("Erro", e.message);
    }
  }
  async function remove(kind:'applications'|'widgets',id:string){Alert.alert('Excluir','Deseja excluir este item?',[{text:'Cancelar'},{text:'Excluir',style:'destructive',onPress:async()=>{await request(`/${kind}/${id}`,{method:'DELETE'});load()}}])}
  async function moveApp(id:string,delta:number){const layouts=[...data.layouts];const appLayouts=layouts.filter((x:any)=>x.kind==='APPLICATION');const at=appLayouts.findIndex((x:any)=>x.applicationId===id),to=Math.max(0,Math.min(appLayouts.length-1,at+delta));if(at===to)return;const a=appLayouts[at],b=appLayouts[to];const ai=layouts.indexOf(a),bi=layouts.indexOf(b);[layouts[ai],layouts[bi]]=[layouts[bi],layouts[ai]];await request('/layouts/mobile',{method:'PUT',body:JSON.stringify({items:layouts.map((x:any)=>({kind:x.kind,applicationId:x.applicationId,widgetId:x.widgetId,x:x.x||0,y:x.y||0,w:x.w||1,h:x.h||1}))})});load()}
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
            <Pressable style={s.app} onPress={() => open(item)} onLongPress={()=>Alert.alert(item.name,'O que deseja fazer?',[{text:'Mover antes',onPress:()=>moveApp(item.id,-1)},{text:'Mover depois',onPress:()=>moveApp(item.id,1)},{text:'Editar',onPress:()=>edit('app',item)},{text:'Excluir',style:'destructive',onPress:()=>remove('applications',item.id)},{text:'Cancelar'}])}>
              <View style={s.appIcon}>
                <Text style={s.emoji}>{icon(item.icon)}</Text>
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
            <Pressable style={s.widget} key={w.id} onLongPress={()=>Alert.alert(w.title,'O que deseja fazer?',[{text:'Editar',onPress:()=>edit('widget',w)},{text:'Excluir',style:'destructive',onPress:()=>remove('widgets',w.id)},{text:'Cancelar'}])}>
              <Ionicons name={widgetIcon(w.type)} color="#ff8b35" size={21} />
              <Text style={s.widgetTitle}>{w.title}</Text>
              <Text style={s.metric}>{widgetValue(w.type, metrics)}</Text>
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
    </SafeAreaView>
  );
}
const icon = (x?: string) =>
  (
    ({
      nextcloud: "☁️",
      immich: "🌄",
      jellyfin: "▶️",
      "shield-checkmark": "🔐",
      "git-branch": "⑂",
      "stats-chart": "📊",
      shield: "🛡️",
      server: "▦",
    }) as any
  )[x || ""] || "◉";
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
  appName: { color: "#dbe5ef", fontSize: 12, marginTop: 8, maxWidth: 95 },
  widgets: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  widget: {
    width: "48%",
    minHeight: 105,
    backgroundColor: "#ffffff10",
    borderWidth: 1,
    borderColor: "#ffffff16",
    borderRadius: 19,
    padding: 15,
  },
  widgetTitle: { color: "#9eacbc", fontSize: 12, marginTop: 7 },
  metric: { color: "white", fontSize: 23, fontWeight: "700", marginTop: 5 },
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
});
