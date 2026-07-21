import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Activity,
  CloudSun,
  HardDrive,
  LogOut,
  MemoryStick,
  MoreVertical,
  Network,
  Plus,
  Search,
  Server,
  Settings,
  Edit3,
  UserRound,
  LayoutGrid,
  Pencil,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import {clearSession,isAuthenticated} from './api/client';
import {useLogin} from './api/useLogin';import {useRegister} from './api/useRegister';import {useDashboard} from './api/useDashboard';import {useMetricsOverview} from './api/useMetricsOverview';import {useMetricsHistory} from './api/useMetricsHistory';import {useApplicationStatuses} from './api/useApplicationStatuses';import {useLayoutPresets} from './api/useLayoutPresets';import {useSaveLayout} from './api/useSaveLayout';import {useSelectLayoutPreset} from './api/useSelectLayoutPreset';import {useResetLayoutPreset} from './api/useResetLayoutPreset';import {useDeleteApplication} from './api/useDeleteApplication';import {useDeleteWidget} from './api/useDeleteWidget';import {useWidgetData} from './api/useWidgetData';import {useWeather} from './api/useWeather';import {useCreateApplication} from './api/useCreateApplication';import {useUpdateApplication} from './api/useUpdateApplication';import {useCreateWidget} from './api/useCreateWidget';import {useUpdateWidget} from './api/useUpdateWidget';import {useUpdateBranding} from './api/useUpdateBranding';import {useUploadAsset} from './api/useUploadAsset';import {useSessions} from './api/useSessions';import {useChangePassword} from './api/useChangePassword';import {useLogoutAll} from './api/useLogoutAll';import {useDeleteAccount} from './api/useDeleteAccount';import {useRevokeSession} from './api/useRevokeSession';
type AppItem = {
  id: string;
  name: string;
  url: string;
  description?: string;
  icon?: string;
  category?: string;
  inDock: boolean;
  statusUrl?: string;
  deepLink?: string;
  visible?: boolean;
};
type Widget = { id: string; type: string; title: string; config: any };
type Layout = {
  id: string;
  kind: string;
  applicationId?: string;
  widgetId?: string;
  order: number;
  x: number; y: number; w: number; h: number;
};
type Dash = {
  id: string;
  name: string;
  branding: any;
  applications: AppItem[];
  widgets: Widget[];
  layouts: Layout[];
  layoutPreset: 'FREE'|'ZIMA'|'FOCUS'|'COMPACT';
};
type Preset={id:'FREE'|'ZIMA'|'FOCUS'|'COMPACT';name:string;description:string};
const appImage=(app:AppItem)=>app.icon?.startsWith('http')?app.icon:`${new URL(app.url).origin}/favicon.ico`;
export function App() {
  const [logged, setLogged] = useState(isAuthenticated());
  return <><ToastHost />{!logged ? <Auth onDone={() => setLogged(true)} /> :
    <Dashboard
      onLogout={() => {
        clearSession();
        setLogged(false);
      }}
    />
  }</>;
}
function ToastHost(){
  const [items,setItems]=useState<Array<{id:number,message:string,type:string}>>([]);
  useEffect(()=>{const handler=(event:Event)=>{const detail=(event as CustomEvent).detail,id=Date.now()+Math.random();setItems(x=>[...x,{id,...detail}]);setTimeout(()=>setItems(x=>x.filter(t=>t.id!==id)),3500)};window.addEventListener('dashlab:toast',handler);return()=>window.removeEventListener('dashlab:toast',handler)},[]);
  return <div className="toast-stack">{items.map(x=><div className={`toast ${x.type}`} key={x.id}>{x.message}</div>)}</div>
}
function Auth({ onDone }: { onDone: () => void }) {
  const login=useLogin(),createAccount=useRegister();
  const [register, setRegister] = useState(false),
    [username, setUser] = useState(""),
    [password, setPass] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await (register?createAccount:login).mutateAsync({ username, password });
      onDone();
    } catch {} finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="brand-mark">D</div>
        <h1>DashLab</h1>
        <p>
          {register ? "Crie seu espaço pessoal" : "Seu homelab, do seu jeito."}
        </p>
        <form onSubmit={submit}>
          <label>
            Usuário
            <input
              value={username}
              onChange={(e) => setUser(e.target.value)}
              autoCapitalize="none"
              required
              minLength={3}
            />
          </label>
          <label>
            Senha
            <input
              type="password"
              value={password}
              onChange={(e) => setPass(e.target.value)}
              required
              minLength={8}
            />
          </label>
          {error && <div className="error">{error}</div>}
          <button className="primary" disabled={busy}>
            {busy ? "Aguarde…" : register ? "Criar conta" : "Entrar"}
          </button>
        </form>
        <button className="link" onClick={() => setRegister(!register)}>
          {register ? "Já tenho uma conta" : "Criar uma conta"}
        </button>
      </div>
    </div>
  );
}
function Dashboard({ onLogout }: { onLogout: () => void }) {
  const dashboardQuery=useDashboard(),metricsQuery=useMetricsOverview(),historyQuery=useMetricsHistory(),statusesQuery=useApplicationStatuses(),presetsQuery=useLayoutPresets(),saveLayout=useSaveLayout(),selectPreset=useSelectLayoutPreset(),resetLayout=useResetLayoutPreset(),deleteApp=useDeleteApplication(),deleteWidget=useDeleteWidget();
  const dash=(dashboardQuery.data||null) as Dash|null,metrics=metricsQuery.data||{},history=historyQuery.data||{},presets=(presetsQuery.data||[]) as Preset[],statuses=Object.fromEntries(((statusesQuery.data||[]) as any[]).map(x=>[x.id,x]));
  const [query, setQuery] = useState(""),
    [modal, setModal] = useState<"app" | "widget" | "brand" | "account" | null>(null),
    [editing, setEditing] = useState<AppItem | Widget | null>(null),
    [layoutEdit,setLayoutEdit]=useState(false),
    [showLayouts,setShowLayouts]=useState(false),
    [drag, setDrag] = useState<number | null>(null),
    [menu, setMenu] = useState<string | null>(null),
    [confirmDelete,setConfirmDelete] = useState<{kind:string,id:string,name:string}|null>(null);
  const load=()=>dashboardQuery.refetch();
  useEffect(() => {
    if (!dash) return;
    document.title = dash.branding?.name || dash.name;
    document.documentElement.style.setProperty(
      "--accent",
      dash.branding?.accent || "#ff7a1a",
    );
    if (dash.branding?.favicon) {
      let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
      if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
      link.href = dash.branding.favicon;
    }
  }, [dash]);
  const ordered = useMemo(() => {
    if (!dash) return [];
    return [...dash.layouts].sort((a, b) => a.order - b.order);
  }, [dash]);
  async function drop(at: number) {
    if (drag === null || !dash) return;
    const next = [...ordered];
    if (dash.layoutPreset === 'FREE') { const [m] = next.splice(drag, 1); next.splice(at, 0, m); }
    else { const a=next[drag],b=next[at];[a.x,b.x]=[b.x,a.x];[a.y,b.y]=[b.y,a.y]; }
    setDrag(null);
    await saveLayout.mutateAsync(next.map((x, i) => ({
          ...x,
          order: i,
          x: dash.layoutPreset === 'FREE' ? i % 4 : x.x,
          y: dash.layoutPreset === 'FREE' ? Math.floor(i / 4) : x.y,
          w: x.w || (x.kind === 'WIDGET' ? 2 : 1),
          h: x.h || 1,
        })));
  }
  async function resize(layout: Layout, axis:'w'|'h', delta: number) {
    const max=axis==='w'?(dash?.layoutPreset==='FREE'?4:12):6;
    const next = ordered.map(x => x.id === layout.id ? { ...x, [axis]: Math.max(1, Math.min(max, (x[axis] || 1) + delta)) } : x);
    await saveLayout.mutateAsync(next.map(({kind,applicationId,widgetId,x,y,w,h}) => ({kind,applicationId,widgetId,x,y,w,h})));
  }
  async function choosePreset(preset:Preset['id']){await selectPreset.mutateAsync(preset);setShowLayouts(false)}
  async function resetPreset(){if(dash)await resetLayout.mutateAsync(dash.layoutPreset)}
  async function remove(kind: string, id: string) {
    await (kind==='applications'?deleteApp.mutateAsync(id):deleteWidget.mutateAsync(id));
    setMenu(null);
  }
  if (!dash) return <div className="loading">Carregando seu DashLab…</div>;
  const branding = dash.branding || {};
  return (
    <div
      className={`desktop preset-${dash.layoutPreset.toLowerCase()} ${layoutEdit?'layout-editing':''}`}
      style={{
        backgroundImage: branding.wallpaper
          ? `linear-gradient(#07101aaa,#07101aaa),url(${branding.wallpaper})`
          : undefined,
      }}
    >
      <header>
        <div className="brand">
          <div className="brand-mark small">{(branding.name || "D")[0]}</div>
          <strong>{branding.name || dash.name}</strong>
        </div>
        <form
          className="search"
          onSubmit={(e) => {
            e.preventDefault();
            if (query)
              window.open(
                `https://google.com/search?q=${encodeURIComponent(query)}`,
                "_blank",
              );
          }}
        >
          <Search size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar na web"
          />
        </form>
        <div className="header-tools">
          <span>
            <CloudSun size={19} /> Clima
          </span>
          <Clock />
          <button
            className="icon-button"
            onClick={() => setModal("brand")}
            title="Personalizar"
          >
            <Settings />
          </button>
          <button className="icon-button" onClick={()=>setShowLayouts(true)} title="Escolher layout"><LayoutGrid /></button>
          <button className={`icon-button ${layoutEdit?'active':''}`} onClick={()=>setLayoutEdit(!layoutEdit)} title="Editar organização"><Pencil /></button>
          <button className="icon-button" onClick={() => setModal("account")} title="Minha conta"><UserRound /></button>
          <button className="icon-button" onClick={onLogout} title="Sair">
            <LogOut />
          </button>
        </div>
      </header>
      <main>
        <section className="app-grid">
          {ordered.map((layout, index) => {
            const app =
              layout.kind === "APPLICATION"
                ? dash.applications.find((a) => a.id === layout.applicationId)
                : null;
            const widget =
              layout.kind === "WIDGET"
                ? dash.widgets.find((w) => w.id === layout.widgetId)
                : null;
            if (!app && !widget) return null;
            return (
              <div
                key={layout.id}
                className={`layout-item span-${Math.min(12, layout.w || 1)} kind-${layout.kind.toLowerCase()}`}
                style={dash.layoutPreset==='FREE'?undefined:{gridColumn:`${layout.x+1} / span ${layout.w}`,gridRow:`${layout.y+1} / span ${layout.h}`}}
                draggable={layoutEdit}
                onDragStart={() => setDrag(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => drop(index)}
              >
                {app ? (
                  <div className="app-wrap">
                    <a
                      className="app-icon"
                      href={app.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img src={appImage(app)} alt="" onError={e=>{e.currentTarget.src='/favicon.ico'}} />
                    </a>
                    <b>{app.name}</b>
                    <i className={`status-dot ${statuses[app.id]?.online ? 'online' : statuses[app.id] ? 'offline' : ''}`} title={statuses[app.id] ? `${statuses[app.id].online?'Online':'Offline'} · ${statuses[app.id].latency} ms` : 'Verificando'} />
                    <button
                      className="item-menu item-control"
                      onClick={() => setMenu(menu === app.id ? null : app.id)}
                    >
                      <MoreVertical />
                    </button>
                    {menu === app.id && (
                      <div className="context">
                        <button onClick={() => { setEditing(app); setModal('app'); setMenu(null); }}><Edit3 /> Editar</button>
                        <button onClick={() => setConfirmDelete({kind:"applications",id:app.id,name:app.name})}>
                          <Trash2 /> Excluir
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <WidgetCard
                    widget={widget!}
                    metrics={metrics}
                    history={history}
                    onEdit={() => { setEditing(widget!); setModal('widget'); }}
                    onResize={(axis,d) => resize(layout,axis,d)}
                    editingLayout={layoutEdit}
                    onDelete={() => setConfirmDelete({kind:"widgets",id:widget!.id,name:widget!.title})}
                  />
                )}
              </div>
            );
          })}
        </section>
      </main>
      <div className="dock">
        {dash.applications
          .filter((a) => a.inDock)
          .map((a) => (
            <a href={a.url} target="_blank" rel="noreferrer" key={a.id}>
              <img src={appImage(a)} alt="" onError={e=>{e.currentTarget.src='/favicon.ico'}} />
            </a>
          ))}
      </div>
      <button className="add" onClick={() => setModal("app")}>
        <Plus />
      </button>
      {modal && (
        <Editor
          type={modal}
          dash={dash}
          editing={editing}
          close={() => setModal(null)}
          done={() => {
            setModal(null);
            setEditing(null);
            load();
          }}
        />
      )}
      {confirmDelete&&<ConfirmModal title="Excluir item" message={`Deseja excluir “${confirmDelete.name}”? Esta ação não pode ser desfeita.`} confirmLabel="Excluir" danger onCancel={()=>setConfirmDelete(null)} onConfirm={async()=>{const x=confirmDelete;setConfirmDelete(null);await remove(x.kind,x.id)}}/>}
      {showLayouts&&<LayoutPicker presets={presets} active={dash.layoutPreset} close={()=>setShowLayouts(false)} choose={choosePreset} reset={resetPreset}/>}
    </div>
  );
}
function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(i);
  }, []);
  return (
    <span>
      {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
    </span>
  );
}
function WidgetCard({
  widget,
  metrics,
  history,
  onDelete,
  onEdit,
  onResize,
  editingLayout,
}: {
  widget: Widget;
  metrics: any;
  history:any;
  onDelete: () => void;
  onEdit: () => void;
  onResize: (axis:'w'|'h',delta:number) => void;
  editingLayout:boolean;
}) {
  const {latitude=-23.55,longitude=-46.63}=widget.config||{},promQuery=useWidgetData(widget.id,widget.type==='PROMQL'),weatherQuery=useWeather(latitude,longitude,widget.type==='WEATHER'),remote=widget.type==='PROMQL'?promQuery.data:weatherQuery.data;
  const promValue = remote?.data?.result?.[0]?.value?.[1];
  const weatherValue = remote?.current?.temperature_2m != null ? `${Math.round(remote.current.temperature_2m)}°C` : '—';
  const map: any = {
    SYSTEM: [Activity, "CPU", metrics.cpu, "Memória", metrics.memory],
    STORAGE: [HardDrive, "Disco", metrics.disk],
    NETWORK: [
      Network,
      "Download",
      metrics.download ? `${(metrics.download / 1e6).toFixed(1)} MB/s` : "—",
      "Upload",
      metrics.upload ? `${(metrics.upload / 1e6).toFixed(1)} MB/s` : "—",
    ],
    CLOCK: [Server, "Agora", new Date().toLocaleTimeString("pt-BR")],
    WEATHER: [CloudSun, "Temperatura", weatherValue, "Sensação", remote?.current?.apparent_temperature != null ? `${Math.round(remote.current.apparent_temperature)}°C` : '—'],
    SEARCH: [Search, "Pesquisa", "Google"],
    STATUS: [Activity, 'Serviços', 'Veja os indicadores nos aplicativos'],
    PROMQL: [Activity, widget.config?.unit || "Valor", promValue != null ? `${Number(promValue).toFixed(Number(widget.config?.decimals ?? 1))}${widget.config?.suffix || ''}` : '—'],
  };
  const data = map[widget.type] || [MemoryStick, widget.title, "—"];
  const Icon = data[0];
  return (
    <div className="widget">
      <button className="widget-delete item-control" onClick={onDelete}>
        <X />
      </button>
      {editingLayout&&<div className="widget-actions"><button onClick={onEdit} title="Editar"><Edit3 /></button><button onClick={()=>onResize('w',-1)} title="Menos largura">−W</button><button onClick={()=>onResize('w',1)} title="Mais largura">+W</button><button onClick={()=>onResize('h',-1)} title="Menos altura">−H</button><button onClick={()=>onResize('h',1)} title="Mais altura">+H</button></div>}
      <div className="widget-title">
        <Icon />
        {widget.title}
      </div>
      <div className="widget-values">
        {data.slice(1).map((x: any, i: number) => (
          <span key={i} className={typeof x === "number" ? "metric" : ""}>
            {typeof x === "number" ? `${x.toFixed(0)}%` : x}
          </span>
        ))}
      </div>
      {['SYSTEM','STORAGE','NETWORK'].includes(widget.type)&&<MetricChart series={widget.type==='SYSTEM'?[history.cpu||[],history.memory||[]]:widget.type==='STORAGE'?[history.disk||[]]:[history.download||[],history.upload||[]]}/>}
    </div>
  );
}
function MetricChart({series}:{series:Array<Array<{timestamp:number,value:number}>>}){const colors=['var(--accent)','#4ad6c8'];const paths=series.map(points=>{if(points.length<2)return'';const values=points.map(x=>x.value),min=Math.min(...values),max=Math.max(...values),span=max-min||1;return points.map((p,i)=>`${i?'L':'M'} ${(i/(points.length-1))*100} ${32-((p.value-min)/span)*28}`).join(' ')});return <svg className="metric-chart" viewBox="0 0 100 36" preserveAspectRatio="none">{paths.map((d,i)=><path key={i} d={d} fill="none" stroke={colors[i]} strokeWidth="1.8" vectorEffect="non-scaling-stroke"/>)}</svg>}
function Editor({
  type,
  dash,
  editing,
  close,
  done,
}: {
  type: string;
  dash: Dash;
  editing: AppItem | Widget | null;
  close: () => void;
  done: () => void;
}) {
  const createApplication=useCreateApplication(),updateApplication=useUpdateApplication(),createWidget=useCreateWidget(),updateWidget=useUpdateWidget(),updateBranding=useUpdateBranding(),uploadAsset=useUploadAsset();
  const [mode, setMode] = useState(type),
    [form, setForm] = useState<any>({
      name: "",
      url: "https://",
      icon: "",
      inDock: false,
      title: "",
      type: "SYSTEM",
      config: {},
      ...dash.branding,
      ...(editing || {}),
      query: (editing as Widget | null)?.config?.query || '',
    });
  const [busy,setBusy] = useState(false), [error,setError] = useState('');
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
    if (mode === "app")
      await (editing?updateApplication.mutateAsync({id:editing.id,data:form}):createApplication.mutateAsync(form));
    else if (mode === "widget")
      await (editing?updateWidget.mutateAsync({id:editing.id,data:{
          ...form,
          config: form.type === "PROMQL" ? { ...form.config, query: form.query } : form.config,
        }}):createWidget.mutateAsync({...form,config:form.type==='PROMQL'?{...form.config,query:form.query}:form.config}));
    else if (mode === 'brand') await updateBranding.mutateAsync(form);
    else return;
    done();
    } catch {} finally { setBusy(false); }
  }
  async function upload(field:string, file?:File) {
    if (!file) return;
    const asset = await uploadAsset.mutateAsync(file);
    setForm((x:any)=>({...x,[field]:asset.url}));
  }
  return (
    <div
      className="overlay"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <form className="modal" onSubmit={save}>
        <button type="button" className="close" onClick={close}>
          <X />
        </button>
        {type !== "brand" && type !== 'account' && !editing && (
          <div className="tabs">
            <button
              type="button"
              className={mode === "app" ? "active" : ""}
              onClick={() => setMode("app")}
            >
              Aplicativo
            </button>
            <button
              type="button"
              className={mode === "widget" ? "active" : ""}
              onClick={() => setMode("widget")}
            >
              Widget
            </button>
          </div>
        )}
        <h2>
          {mode === "brand"
            ? "Personalizar meu DashLab"
            : mode === 'account' ? 'Minha conta'
            : mode === "app"
              ? `${editing ? 'Editar' : 'Novo'} aplicativo`
              : `${editing ? 'Editar' : 'Novo'} widget`}
        </h2>
        {mode === "app" && (
          <>
            <label>
              Nome
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label>
              Link
              <input
                required
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
              />
            </label>
            <label>
              Ícone (URL ou nome)
              <input
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
              />
            </label>
            <label>Enviar ícone<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e=>upload('icon',e.target.files?.[0])}/></label>
            <label>Descrição<input value={form.description || ''} onChange={e=>setForm({...form,description:e.target.value})}/></label>
            <label>Categoria<input value={form.category || ''} onChange={e=>setForm({...form,category:e.target.value})}/></label>
            <label>Deep link mobile<input value={form.deepLink || ''} onChange={e=>setForm({...form,deepLink:e.target.value})}/></label>
            <label>URL de status<input value={form.statusUrl || ''} onChange={e=>setForm({...form,statusUrl:e.target.value})}/></label>
            <label className="check">
              <input
                type="checkbox"
                checked={form.inDock}
                onChange={(e) => setForm({ ...form, inDock: e.target.checked })}
              />{" "}
              Colocar no dock
            </label>
          </>
        )}
        {mode === "widget" && (
          <>
            <label>
              Título
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label>
              Tipo
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {[
                  "SYSTEM",
                  "STORAGE",
                  "NETWORK",
                  "CLOCK",
                  "WEATHER",
                  "SEARCH",
                  "STATUS",
                  "PROMQL",
                ].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            {form.type === "PROMQL" && (
              <><label>
                Consulta PromQL
                <textarea
                  value={form.query || ""}
                  onChange={(e) => setForm({ ...form, query: e.target.value })}
                />
              </label><label>Sufixo/unidade<input value={form.config?.suffix || ''} onChange={e=>setForm({...form,config:{...form.config,suffix:e.target.value}})}/></label></>
            )}
            {form.type === 'WEATHER' && <div className="field-row"><label>Latitude<input type="number" step="any" value={form.config?.latitude ?? -23.55} onChange={e=>setForm({...form,config:{...form.config,latitude:+e.target.value}})}/></label><label>Longitude<input type="number" step="any" value={form.config?.longitude ?? -46.63} onChange={e=>setForm({...form,config:{...form.config,longitude:+e.target.value}})}/></label></div>}
            {form.type === 'SEARCH' && <label>Provedor<select value={form.config?.provider || 'google'} onChange={e=>setForm({...form,config:{...form.config,provider:e.target.value}})}><option value="google">Google</option><option value="duckduckgo">DuckDuckGo</option><option value="bing">Bing</option></select></label>}
          </>
        )}
        {mode === "brand" && (
          <>
            <label>
              Nome
              <input
                value={form.name || ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label>
              Wallpaper (URL)
              <input
                value={form.wallpaper || ""}
                onChange={(e) =>
                  setForm({ ...form, wallpaper: e.target.value })
                }
              />
            </label>
            <label>Enviar wallpaper<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e=>upload('wallpaper',e.target.files?.[0])}/></label>
            <label>Logo (URL)<input value={form.logo || ''} onChange={e=>setForm({...form,logo:e.target.value})}/></label>
            <label>Enviar logo<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e=>upload('logo',e.target.files?.[0])}/></label>
            <label>
              Cor de destaque
              <input
                type="color"
                value={form.accent || "#ff7a1a"}
                onChange={(e) => setForm({ ...form, accent: e.target.value })}
              />
            </label>
          </>
        )}
        {mode === 'account' && <Account close={close}/>}
        {error && <div className="error">{error}</div>}
        {mode !== 'account' && <button className="primary" disabled={busy}>{busy?'Salvando…':'Salvar'}</button>}
      </form>
    </div>
  );
}
function Account({close}:{close:()=>void}) {
  const [currentPassword,setCurrent]=useState(''),[newPassword,setNew]=useState(''),[confirmAccount,setConfirmAccount]=useState(false);const sessionsQuery=useSessions(),changePassword=useChangePassword(),logoutAllMutation=useLogoutAll(),deleteAccount=useDeleteAccount(),revokeSession=useRevokeSession(),sessions=(sessionsQuery.data||[]) as any[];
  async function change(){try{await changePassword.mutateAsync({currentPassword,newPassword});setTimeout(()=>{clearSession();location.reload()},900)}catch{}}
  async function logoutAll(){await logoutAllMutation.mutateAsync();location.reload()}
  async function remove(){try{await deleteAccount.mutateAsync(currentPassword);setTimeout(()=>location.reload(),900)}catch{}}
  return <><div className="account"><label>Senha atual<input type="password" value={currentPassword} onChange={e=>setCurrent(e.target.value)}/></label><label>Nova senha<input type="password" minLength={8} value={newPassword} onChange={e=>setNew(e.target.value)}/></label><button type="button" className="primary" onClick={change}>Alterar senha</button><h3>Sessões ativas ({sessions.length})</h3>{sessions.map(x=><div className="session" key={x.id}><span>{new Date(x.createdAt).toLocaleString('pt-BR')}</span><button type="button" onClick={()=>revokeSession.mutate(x.id)}>Revogar</button></div>)}<button type="button" className="secondary" onClick={logoutAll}>Encerrar todas as sessões</button><button type="button" className="danger" onClick={()=>setConfirmAccount(true)}>Excluir minha conta</button><button type="button" className="link" onClick={close}>Fechar</button></div>{confirmAccount&&<ConfirmModal title="Excluir conta" message="Todo o dashboard, aplicativos, widgets e imagens serão excluídos permanentemente." confirmLabel="Excluir permanentemente" danger onCancel={()=>setConfirmAccount(false)} onConfirm={()=>{setConfirmAccount(false);remove()}}/>}</>
}
function LayoutPicker({presets,active,close,choose,reset}:{presets:Preset[],active:string,close:()=>void,choose:(id:Preset['id'])=>void,reset:()=>void}){
  const icons:Record<string,string>={FREE:'▦',ZIMA:'◫',FOCUS:'▤',COMPACT:'▦'};
  return <div className="overlay" onMouseDown={e=>e.target===e.currentTarget&&close()}><div className="modal layout-picker"><button className="close" onClick={close}><X/></button><h2>Escolha um layout</h2><p>As posições de cada layout ficam salvas separadamente.</p><div className="preset-grid">{presets.map(p=><button key={p.id} className={`preset-card ${active===p.id?'selected':''}`} onClick={()=>choose(p.id)}><span className="preset-preview">{icons[p.id]}</span><strong>{p.name}</strong><small>{p.description}</small>{active===p.id&&<i>Ativo</i>}</button>)}</div><button className="secondary reset-layout" onClick={reset}><RotateCcw/> Restaurar layout atual</button></div></div>
}
function ConfirmModal({title,message,confirmLabel,onCancel,onConfirm,danger=false}:{title:string,message:string,confirmLabel:string,onCancel:()=>void,onConfirm:()=>void|Promise<void>,danger?:boolean}){return <div className="overlay confirm-overlay"><div className="modal confirm-modal" role="dialog" aria-modal="true"><h2>{title}</h2><p>{message}</p><div className="confirm-actions"><button className="secondary" onClick={onCancel}>Cancelar</button><button className={danger?'danger solid':'primary'} onClick={onConfirm}>{confirmLabel}</button></div></div></div>}
