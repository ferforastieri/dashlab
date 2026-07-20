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
  Maximize2,
  Minimize2,
  UserRound,
  Trash2,
  X,
} from "lucide-react";
import { api, auth, clearAuth, isLogged } from "./api";
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
};
const icons: any = {
  nextcloud: "☁️",
  immich: "🌄",
  jellyfin: "▶️",
  "shield-checkmark": "🔐",
  "git-branch": "⑂",
  "stats-chart": "📊",
  shield: "🛡️",
  server: "▦",
};
export function App() {
  const [logged, setLogged] = useState(isLogged());
  return <><ToastHost />{!logged ? <Auth onDone={() => setLogged(true)} /> :
    <Dashboard
      onLogout={() => {
        clearAuth();
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
      await auth(register ? "register" : "login", { username, password });
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
  const [dash, setDash] = useState<Dash | null>(null),
    [metrics, setMetrics] = useState<any>({}),
    [query, setQuery] = useState(""),
    [modal, setModal] = useState<"app" | "widget" | "brand" | "account" | null>(null),
    [editing, setEditing] = useState<AppItem | Widget | null>(null),
    [drag, setDrag] = useState<number | null>(null),
    [menu, setMenu] = useState<string | null>(null),
    [statuses, setStatuses] = useState<Record<string, any>>({}),
    [confirmDelete,setConfirmDelete] = useState<{kind:string,id:string,name:string}|null>(null);
  const load = () => api("/dashboard?surface=web").then(setDash);
  useEffect(() => {
    load();
    const tick = () =>
      api("/metrics/overview")
        .then(setMetrics)
        .catch(() => {});
    tick();
    api('/applications/status').then((xs:any[]) => setStatuses(Object.fromEntries(xs.map(x => [x.id,x])))).catch(()=>{});
    const i = setInterval(tick, 10000);
    return () => clearInterval(i);
  }, []);
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
    const [m] = next.splice(drag, 1);
    next.splice(at, 0, m);
    setDrag(null);
    await api("/layouts/web", {
      method: "PUT",
      body: JSON.stringify({ items:
        next.map((x, i) => ({
          ...x,
          order: i,
          x: i % 4,
          y: Math.floor(i / 4),
          w: x.w || (x.kind === 'WIDGET' ? 2 : 1),
          h: x.h || 1,
        })),
      }),
    });
    load();
  }
  async function resize(layout: Layout, delta: number) {
    const next = ordered.map(x => x.id === layout.id ? { ...x, w: Math.max(1, Math.min(4, (x.w || 1) + delta)) } : x);
    await api('/layouts/web', { method:'PUT', body: JSON.stringify({ items: next.map(({kind,applicationId,widgetId,x,y,w,h}) => ({kind,applicationId,widgetId,x,y,w,h})) }) });
    load();
  }
  async function remove(kind: string, id: string) {
    await api(`/${kind}/${id}`, { method: "DELETE" });
    setMenu(null);
    load();
  }
  if (!dash) return <div className="loading">Carregando seu DashLab…</div>;
  const branding = dash.branding || {};
  return (
    <div
      className="desktop"
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
                className={`layout-item span-${Math.min(4, layout.w || 1)}`}
                draggable
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
                      <span>
                        {app.icon?.startsWith("http") ? (
                          <img src={app.icon} />
                        ) : (
                          icons[app.icon || ""] || "◉"
                        )}
                      </span>
                    </a>
                    <b>{app.name}</b>
                    <i className={`status-dot ${statuses[app.id]?.online ? 'online' : statuses[app.id] ? 'offline' : ''}`} title={statuses[app.id] ? `${statuses[app.id].online?'Online':'Offline'} · ${statuses[app.id].latency} ms` : 'Verificando'} />
                    <button
                      className="item-menu"
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
                    onEdit={() => { setEditing(widget!); setModal('widget'); }}
                    onResize={(d) => resize(layout, d)}
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
              <span>{a.icon?.startsWith('http') ? <img src={a.icon} /> : icons[a.icon || ""] || "◉"}</span>
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
  onDelete,
  onEdit,
  onResize,
}: {
  widget: Widget;
  metrics: any;
  onDelete: () => void;
  onEdit: () => void;
  onResize: (delta:number) => void;
}) {
  const [remote, setRemote] = useState<any>(null);
  useEffect(() => {
    if (widget.type === 'PROMQL') api(`/widgets/${widget.id}/data`).then(setRemote).catch(()=>setRemote(null));
    if (widget.type === 'WEATHER') {
      const { latitude = -23.55, longitude = -46.63 } = widget.config || {};
      api(`/weather?latitude=${latitude}&longitude=${longitude}`).then(setRemote).catch(()=>setRemote(null));
    }
  }, [widget.id, widget.type, widget.config]);
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
      <button className="widget-delete" onClick={onDelete}>
        <X />
      </button>
      <div className="widget-actions"><button onClick={onEdit} title="Editar"><Edit3 /></button><button onClick={()=>onResize(-1)} title="Diminuir"><Minimize2 /></button><button onClick={()=>onResize(1)} title="Aumentar"><Maximize2 /></button></div>
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
    </div>
  );
}
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
      await api(editing ? `/applications/${editing.id}` : "/applications", {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify(form),
      });
    else if (mode === "widget")
      await api(editing ? `/widgets/${editing.id}` : "/widgets", {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify({
          ...form,
          config: form.type === "PROMQL" ? { ...form.config, query: form.query } : form.config,
        }),
      });
    else if (mode === 'brand') await api("/branding", { method: "PUT", body: JSON.stringify(form) });
    else return;
    done();
    } catch {} finally { setBusy(false); }
  }
  async function upload(field:string, file?:File) {
    if (!file) return;
    const body = new FormData(); body.append('file',file);
    const asset = await api('/assets',{method:'POST',body});
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
  const [currentPassword,setCurrent]=useState(''),[newPassword,setNew]=useState(''),[sessions,setSessions]=useState<any[]>([]),[confirmAccount,setConfirmAccount]=useState(false);
  useEffect(()=>{api('/auth/sessions').then(setSessions).catch(()=>{})},[]);
  async function change(){try{await api('/auth/change-password',{method:'POST',body:JSON.stringify({currentPassword,newPassword})});setTimeout(()=>{clearAuth();location.reload()},900)}catch{}}
  async function logoutAll(){await api('/auth/logout-all',{method:'POST'});clearAuth();location.reload()}
  async function remove(){try{await api('/auth/account',{method:'DELETE',body:JSON.stringify({password:currentPassword})});setTimeout(()=>{clearAuth();location.reload()},900)}catch{}}
  return <><div className="account"><label>Senha atual<input type="password" value={currentPassword} onChange={e=>setCurrent(e.target.value)}/></label><label>Nova senha<input type="password" minLength={8} value={newPassword} onChange={e=>setNew(e.target.value)}/></label><button type="button" className="primary" onClick={change}>Alterar senha</button><h3>Sessões ativas ({sessions.length})</h3>{sessions.map(x=><div className="session" key={x.id}><span>{new Date(x.createdAt).toLocaleString('pt-BR')}</span><button type="button" onClick={async()=>{await api(`/auth/sessions/${x.id}`,{method:'DELETE'});setSessions(sessions.filter(s=>s.id!==x.id))}}>Revogar</button></div>)}<button type="button" className="secondary" onClick={logoutAll}>Encerrar todas as sessões</button><button type="button" className="danger" onClick={()=>setConfirmAccount(true)}>Excluir minha conta</button><button type="button" className="link" onClick={close}>Fechar</button></div>{confirmAccount&&<ConfirmModal title="Excluir conta" message="Todo o dashboard, aplicativos, widgets e imagens serão excluídos permanentemente." confirmLabel="Excluir permanentemente" danger onCancel={()=>setConfirmAccount(false)} onConfirm={()=>{setConfirmAccount(false);remove()}}/>}</>
}
function ConfirmModal({title,message,confirmLabel,onCancel,onConfirm,danger=false}:{title:string,message:string,confirmLabel:string,onCancel:()=>void,onConfirm:()=>void|Promise<void>,danger?:boolean}){return <div className="overlay confirm-overlay"><div className="modal confirm-modal" role="dialog" aria-modal="true"><h2>{title}</h2><p>{message}</p><div className="confirm-actions"><button className="secondary" onClick={onCancel}>Cancelar</button><button className={danger?'danger solid':'primary'} onClick={onConfirm}>{confirmLabel}</button></div></div></div>}
