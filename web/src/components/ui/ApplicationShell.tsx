import { FormEvent, useEffect, useMemo, useState } from 'react';
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
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import { clearSession, isAuthenticated } from '../../api/http/client';
import { useLogin } from '../../api/auth/useLogin';
import { useRegister } from '../../api/auth/useRegister';
import { useMetricsOverview } from '../../api/metrics/useMetricsOverview';
import { useMetricsHistory } from '../../api/metrics/useMetricsHistory';
import { useApplicationStatuses } from '../../api/applications/useApplicationStatuses';
import { useSaveLayout } from '../../api/layouts/useSaveLayout';
import { useDeleteApplication } from '../../api/applications/useDeleteApplication';
import { useDeleteWidget } from '../../api/widgets/useDeleteWidget';
import { useWidgetData } from '../../api/widgets/useWidgetData';
import { useWeather } from '../../api/weather/useWeather';
import { useCreateApplication } from '../../api/applications/useCreateApplication';
import { useUpdateApplication } from '../../api/applications/useUpdateApplication';
import { useCreateWidget } from '../../api/widgets/useCreateWidget';
import { useUpdateWidget } from '../../api/widgets/useUpdateWidget';
import { useUpdateBranding } from '../../api/dashboard/useUpdateBranding';
import { ImageUpload } from './ImageUpload';
import { useSessions } from '../../api/auth/useSessions';
import { useChangePassword } from '../../api/auth/useChangePassword';
import { useLogoutAll } from '../../api/auth/useLogoutAll';
import { useDeleteAccount } from '../../api/auth/useDeleteAccount';
import { useRevokeSession } from '../../api/auth/useRevokeSession';
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
  x: number;
  y: number;
  w: number;
  h: number;
};
type Dash = {
  id: string;
  name: string;
  branding: any;
  applications: AppItem[];
  widgets: Widget[];
  layouts: Layout[];
  layoutPreset: 'ZIMA';
};
const appImage = (app: AppItem) =>
  app.icon?.startsWith('http') ? app.icon : `${new URL(app.url).origin}/favicon.ico`;
const ui: Record<string, string> = {
  desktop: 'min-h-screen bg-[#071019] bg-cover bg-center px-6 pb-28 pt-5 text-[#f7f8fb]',
  brand: 'flex items-center gap-2.5',
  'brand-mark':
    'grid h-16 w-16 place-items-center overflow-hidden rounded-[20px] bg-accent text-3xl font-extrabold shadow-2xl',
  small: 'h-[38px] w-[38px] rounded-xl text-lg',
  search:
    'flex h-12 items-center gap-2.5 rounded-2xl border border-white/10 bg-white/10 px-4 backdrop-blur-xl [&>input]:min-h-0 [&>input]:border-0 [&>input]:bg-transparent [&>input]:p-0',
  'header-tools': 'flex items-center justify-end gap-2.5 text-sm text-slate-200',
  'icon-button':
    'grid h-9 w-9 place-items-center rounded-xl border-0 bg-transparent p-2 text-inherit transition hover:bg-white/10',
  active: 'bg-white/10 text-accent',
  'app-grid': 'mx-auto grid max-w-[1460px] grid-cols-12 auto-rows-[92px] gap-3.5 py-8',
  'layout-item': 'relative min-h-0 min-w-0',
  'app-wrap':
    'relative flex h-full flex-col items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-3 text-center',
  'app-icon':
    'grid h-[62px] w-[62px] place-items-center overflow-hidden rounded-[17px] [&>img]:h-12 [&>img]:w-12 [&>img]:rounded-xl [&>img]:object-contain',
  widget: 'relative h-full overflow-hidden rounded-xl border border-white/10 bg-white/[0.07] p-4',
  'widget-title': 'text-xs text-slate-400',
  'widget-values': 'mt-2 flex items-end justify-between gap-2',
  metric: 'text-2xl font-bold text-white',
  'metric-chart': 'mt-2 h-[42px] w-full overflow-visible',
  'item-control': 'hidden',
  'item-menu': 'absolute right-1 top-1 h-8 w-8 border-0 bg-transparent text-slate-300',
  context:
    'absolute right-1 top-10 z-20 grid min-w-32 gap-1 rounded-xl border border-white/10 bg-[#111b27] p-2 shadow-2xl [&>button]:flex [&>button]:items-center [&>button]:gap-2 [&>button]:rounded-lg [&>button]:px-3 [&>button]:py-2 [&>button]:text-left [&>button]:text-sm',
  'widget-actions': 'absolute right-2 top-1 flex',
  'widget-delete': 'absolute left-1 top-1',
  dock: 'fixed bottom-5 left-1/2 z-10 flex -translate-x-1/2 gap-3 rounded-2xl border border-white/10 bg-[#111b27]/90 p-3 shadow-2xl backdrop-blur-xl [&_img]:h-8 [&_img]:w-8 [&_img]:rounded-lg',
  add: 'fixed bottom-6 right-6 grid h-12 w-12 place-items-center rounded-2xl border-0 bg-accent text-white shadow-2xl',
  loading: 'grid min-h-screen place-items-center bg-[#091019] text-slate-300',
  'auth-shell': 'grid min-h-screen place-items-center bg-[#091019] p-5',
  'auth-card':
    'w-full max-w-[410px] rounded-[28px] border border-white/10 bg-white/[0.06] p-9 text-center shadow-2xl backdrop-blur-2xl [&_.brand-mark]:mx-auto [&_form]:grid [&_form]:gap-4',
  overlay: 'fixed inset-0 z-20 grid place-items-center bg-black/70 p-5',
  modal:
    'relative grid max-h-[90vh] w-full max-w-[480px] gap-4 overflow-auto rounded-[25px] border border-white/10 bg-[#111b27] p-7 text-left shadow-2xl [&_label]:grid [&_label]:gap-2 [&_label]:text-sm [&_label]:text-slate-300 [&_input]:h-14 [&_input]:rounded-xl [&_input]:border [&_input]:border-white/10 [&_input]:bg-[#07111d] [&_input]:px-4 [&_input]:text-white [&_select]:h-14 [&_select]:rounded-xl [&_select]:border [&_select]:border-white/10 [&_select]:bg-[#07111d] [&_select]:px-4 [&_select]:text-white [&_textarea]:min-h-28 [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-white/10 [&_textarea]:bg-[#07111d] [&_textarea]:p-4 [&_textarea]:text-white',
  close:
    'absolute right-4 top-4 grid h-8 w-8 place-items-center border-0 bg-transparent text-slate-300',
  tabs: 'flex gap-1 rounded-xl bg-white/5 p-1 [&>button]:flex-1 [&>button]:rounded-lg [&>button]:border-0 [&>button]:bg-transparent [&>button]:p-2 [&>button]:text-slate-400',
  primary:
    'inline-flex min-h-9 items-center justify-center rounded-xl border-0 bg-accent px-4 py-2 font-bold text-white disabled:opacity-50',
  secondary:
    'inline-flex min-h-9 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-slate-200',
  danger:
    'inline-flex min-h-9 items-center justify-center rounded-xl border border-red-400/30 bg-transparent px-3 py-2 text-red-300',
  solid: 'bg-red-500 text-white',
  link: 'border-0 bg-transparent p-2 text-orange-300',
  error: 'text-sm text-red-300',
  check: 'flex items-center gap-2 [&>input]:h-4 [&>input]:w-4',
  'field-row': 'grid grid-cols-2 gap-3',
  account: 'grid gap-3',
  session: 'flex items-center justify-between text-xs text-slate-300',
  'confirm-modal': 'max-w-[420px]',
  'confirm-actions': 'flex justify-end gap-2',
  'toast-stack': 'fixed right-5 top-5 z-50 grid gap-2',
  toast: 'rounded-xl border border-emerald-400/30 bg-emerald-950 px-4 py-3 text-sm shadow-2xl',
  'toast-error': 'border-red-400/30 bg-red-950 text-red-100',
  success: '',
};
const cn = (...names: Array<string | false | null | undefined>) =>
  names
    .flatMap((name) => (name || '').split(' '))
    .map((name) => ui[name] || name)
    .join(' ');
export function ApplicationShell({ dashboardQuery }: { dashboardQuery: any }) {
  const [logged, setLogged] = useState(isAuthenticated());
  return (
    <>
      <ToastHost />
      {!logged ? (
        <Auth onDone={() => setLogged(true)} />
      ) : (
        <Dashboard
          dashboardQuery={dashboardQuery}
          onLogout={() => {
            clearSession();
            setLogged(false);
          }}
        />
      )}
    </>
  );
}
function ToastHost() {
  const [items, setItems] = useState<Array<{ id: number; message: string; type: string }>>([]);
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail,
        id = Date.now() + Math.random();
      setItems((x) => [...x, { id, ...detail }]);
      setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 3500);
    };
    window.addEventListener('dashlab:toast', handler);
    return () => window.removeEventListener('dashlab:toast', handler);
  }, []);
  return (
    <div className={cn('toast-stack')}>
      {items.map((x) => (
        <div className={cn('toast', x.type === 'error' && 'toast-error')} key={x.id}>
          {x.message}
        </div>
      ))}
    </div>
  );
}
function Auth({ onDone }: { onDone: () => void }) {
  const login = useLogin(),
    createAccount = useRegister();
  const [register, setRegister] = useState(false),
    [username, setUser] = useState(''),
    [password, setPass] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await (register ? createAccount : login).mutateAsync({ username, password });
      onDone();
    } catch {
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={cn('auth-shell')}>
      <div className={cn('auth-card')}>
        <div className={cn('brand-mark')}>D</div>
        <h1>DashLab</h1>
        <p>{register ? 'Crie seu espaço pessoal' : 'Seu homelab, do seu jeito.'}</p>
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
          {error && <div className={cn('error')}>{error}</div>}
          <button className={cn('primary')} disabled={busy}>
            {busy ? 'Aguarde…' : register ? 'Criar conta' : 'Entrar'}
          </button>
        </form>
        <button className={cn('link')} onClick={() => setRegister(!register)}>
          {register ? 'Já tenho uma conta' : 'Criar uma conta'}
        </button>
      </div>
    </div>
  );
}
function Dashboard({ onLogout, dashboardQuery }: { onLogout: () => void; dashboardQuery: any }) {
  const metricsQuery = useMetricsOverview(),
    historyQuery = useMetricsHistory(),
    statusesQuery = useApplicationStatuses(),
    saveLayout = useSaveLayout(),
    deleteApp = useDeleteApplication(),
    deleteWidget = useDeleteWidget();
  const dash = (dashboardQuery.data || null) as Dash | null,
    metrics = metricsQuery.data || {},
    history = historyQuery.data || {},
    statuses = Object.fromEntries(((statusesQuery.data || []) as any[]).map((x) => [x.id, x]));
  const [query, setQuery] = useState(''),
    [modal, setModal] = useState<'app' | 'widget' | 'brand' | 'account' | null>(null),
    [editing, setEditing] = useState<AppItem | Widget | null>(null),
    [layoutEdit, setLayoutEdit] = useState(false),
    [drag, setDrag] = useState<number | null>(null),
    [menu, setMenu] = useState<string | null>(null),
    [confirmDelete, setConfirmDelete] = useState<{ kind: string; id: string; name: string } | null>(
      null,
    );
  const load = () => dashboardQuery.refetch();
  useEffect(() => {
    if (!dash) return;
    document.title = dash.branding?.name || dash.name;
    document.documentElement.style.setProperty('--accent', dash.branding?.accent || '#ff7a1a');
    if (dash.branding?.favicon) {
      let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
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
    const a = next[drag],
      b = next[at];
    [a.x, b.x] = [b.x, a.x];
    [a.y, b.y] = [b.y, a.y];
    setDrag(null);
    await saveLayout.mutateAsync(
      next.map((x, i) => ({
        ...x,
        order: i,
        x: x.x,
        y: x.y,
        w: x.w || (x.kind === 'WIDGET' ? 2 : 1),
        h: x.h || 1,
      })),
    );
  }
  async function resize(layout: Layout, axis: 'w' | 'h', delta: number) {
    const max = axis === 'w' ? 12 : 6;
    const next = ordered.map((x) =>
      x.id === layout.id ? { ...x, [axis]: Math.max(1, Math.min(max, (x[axis] || 1) + delta)) } : x,
    );
    await saveLayout.mutateAsync(
      next.map(({ kind, applicationId, widgetId, x, y, w, h }) => ({
        kind,
        applicationId,
        widgetId,
        x,
        y,
        w,
        h,
      })),
    );
  }
  async function remove(kind: string, id: string) {
    await (kind === 'applications' ? deleteApp.mutateAsync(id) : deleteWidget.mutateAsync(id));
    setMenu(null);
  }
  if (!dash) return <div className={cn('loading')}>Carregando seu DashLab…</div>;
  const branding = dash.branding || {};
  return (
    <div
      className={cn('desktop')}
      style={{
        backgroundImage: branding.wallpaper
          ? `linear-gradient(#07101aaa,#07101aaa),url(${branding.wallpaper})`
          : undefined,
      }}
    >
      <header className="grid h-[58px] grid-cols-[1fr_minmax(260px,520px)_1fr] items-center gap-5 max-[800px]:grid-cols-[1fr_auto]">
        <div className={cn('brand')}>
          <div className={cn('brand-mark small')}>
            {branding.logo ? <img src={branding.logo} alt="" /> : (branding.name || 'D')[0]}
          </div>
          <strong>{branding.name || dash.name}</strong>
        </div>
        <form
          className={cn('search')}
          onSubmit={(e) => {
            e.preventDefault();
            if (query)
              window.open(`https://google.com/search?q=${encodeURIComponent(query)}`, '_blank');
          }}
        >
          <Search size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar na web"
          />
        </form>
        <div className={cn('header-tools')}>
          <span>
            <CloudSun size={19} /> Clima
          </span>
          <Clock />
          <button
            className={cn('icon-button')}
            onClick={() => setModal('brand')}
            title="Personalizar"
          >
            <Settings />
          </button>
          <button
            className={cn('icon-button', layoutEdit && 'active')}
            onClick={() => setLayoutEdit(!layoutEdit)}
            title="Editar organização"
          >
            <Pencil />
          </button>
          <button
            className={cn('icon-button')}
            onClick={() => setModal('account')}
            title="Minha conta"
          >
            <UserRound />
          </button>
          <button className={cn('icon-button')} onClick={onLogout} title="Sair">
            <LogOut />
          </button>
        </div>
      </header>
      <main>
        <section className={cn('app-grid')}>
          {ordered.map((layout, index) => {
            const app =
              layout.kind === 'APPLICATION'
                ? dash.applications.find((a) => a.id === layout.applicationId)
                : null;
            const widget =
              layout.kind === 'WIDGET' ? dash.widgets.find((w) => w.id === layout.widgetId) : null;
            if (!app && !widget) return null;
            return (
              <div
                key={layout.id}
                className={cn('layout-item')}
                style={{
                  gridColumn: `${layout.x + 1} / span ${layout.w}`,
                  gridRow: `${layout.y + 1} / span ${layout.h}`,
                }}
                draggable={layoutEdit}
                onDragStart={() => setDrag(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => drop(index)}
              >
                {app ? (
                  <div className={cn('app-wrap')}>
                    <a className={cn('app-icon')} href={app.url} target="_blank" rel="noreferrer">
                      <img
                        src={appImage(app)}
                        alt=""
                        onError={(e) => {
                          e.currentTarget.src = '/favicon.ico';
                        }}
                      />
                    </a>
                    <b>{app.name}</b>
                    <i
                      className={`absolute left-[calc(50%+25px)] top-[60px] h-2.5 w-2.5 rounded-full border-2 border-[#15202c] ${statuses[app.id]?.online ? 'bg-emerald-400 shadow-[0_0_9px_#43d17d]' : statuses[app.id] ? 'bg-red-400' : 'bg-slate-400'}`}
                      title={
                        statuses[app.id]
                          ? `${statuses[app.id].online ? 'Online' : 'Offline'} · ${statuses[app.id].latency} ms`
                          : 'Verificando'
                      }
                    />
                    <button
                      className={cn('item-menu', !layoutEdit && 'item-control')}
                      onClick={() => setMenu(menu === app.id ? null : app.id)}
                    >
                      <MoreVertical />
                    </button>
                    {menu === app.id && (
                      <div className={cn('context')}>
                        <button
                          onClick={() => {
                            setEditing(app);
                            setModal('app');
                            setMenu(null);
                          }}
                        >
                          <Edit3 /> Editar
                        </button>
                        <button
                          onClick={() =>
                            setConfirmDelete({ kind: 'applications', id: app.id, name: app.name })
                          }
                        >
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
                    onEdit={() => {
                      setEditing(widget!);
                      setModal('widget');
                    }}
                    onResize={(axis, d) => resize(layout, axis, d)}
                    editingLayout={layoutEdit}
                    onDelete={() =>
                      setConfirmDelete({ kind: 'widgets', id: widget!.id, name: widget!.title })
                    }
                  />
                )}
              </div>
            );
          })}
        </section>
      </main>
      <div className={cn('dock')}>
        {dash.applications
          .filter((a) => a.inDock)
          .map((a) => (
            <a href={a.url} target="_blank" rel="noreferrer" key={a.id}>
              <img
                src={appImage(a)}
                alt=""
                onError={(e) => {
                  e.currentTarget.src = '/favicon.ico';
                }}
              />
            </a>
          ))}
      </div>
      <button className={cn('add')} onClick={() => setModal('app')}>
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
      {confirmDelete && (
        <ConfirmModal
          title="Excluir item"
          message={`Deseja excluir “${confirmDelete.name}”? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          danger
          onCancel={() => setConfirmDelete(null)}
          onConfirm={async () => {
            const x = confirmDelete;
            setConfirmDelete(null);
            await remove(x.kind, x.id);
          }}
        />
      )}
    </div>
  );
}
function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(i);
  }, []);
  return <span>{now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>;
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
  history: any;
  onDelete: () => void;
  onEdit: () => void;
  onResize: (axis: 'w' | 'h', delta: number) => void;
  editingLayout: boolean;
}) {
  const { latitude = -23.55, longitude = -46.63 } = widget.config || {},
    promQuery = useWidgetData(widget.id, widget.type === 'PROMQL'),
    weatherQuery = useWeather(latitude, longitude, widget.type === 'WEATHER'),
    remote = widget.type === 'PROMQL' ? promQuery.data : weatherQuery.data;
  const promValue = remote?.data?.result?.[0]?.value?.[1];
  const weatherValue =
    remote?.current?.temperature_2m != null
      ? `${Math.round(remote.current.temperature_2m)}°C`
      : '—';
  const map: any = {
    SYSTEM: [Activity, 'CPU', metrics.cpu, 'Memória', metrics.memory],
    STORAGE: [HardDrive, 'Disco', metrics.disk],
    NETWORK: [
      Network,
      'Download',
      metrics.download ? `${(metrics.download / 1e6).toFixed(1)} MB/s` : '—',
      'Upload',
      metrics.upload ? `${(metrics.upload / 1e6).toFixed(1)} MB/s` : '—',
    ],
    CLOCK: [Server, 'Agora', new Date().toLocaleTimeString('pt-BR')],
    WEATHER: [
      CloudSun,
      'Temperatura',
      weatherValue,
      'Sensação',
      remote?.current?.apparent_temperature != null
        ? `${Math.round(remote.current.apparent_temperature)}°C`
        : '—',
    ],
    SEARCH: [Search, 'Pesquisa', 'Google'],
    STATUS: [Activity, 'Serviços', 'Veja os indicadores nos aplicativos'],
    PROMQL: [
      Activity,
      widget.config?.unit || 'Valor',
      promValue != null
        ? `${Number(promValue).toFixed(Number(widget.config?.decimals ?? 1))}${widget.config?.suffix || ''}`
        : '—',
    ],
  };
  const data = map[widget.type] || [MemoryStick, widget.title, '—'];
  const Icon = data[0];
  return (
    <div className={cn('widget')}>
      <button className={cn('widget-delete', !editingLayout && 'item-control')} onClick={onDelete}>
        <X />
      </button>
      {editingLayout && (
        <div className={cn('widget-actions')}>
          <button onClick={onEdit} title="Editar">
            <Edit3 />
          </button>
          <button onClick={() => onResize('w', -1)} title="Menos largura">
            −W
          </button>
          <button onClick={() => onResize('w', 1)} title="Mais largura">
            +W
          </button>
          <button onClick={() => onResize('h', -1)} title="Menos altura">
            −H
          </button>
          <button onClick={() => onResize('h', 1)} title="Mais altura">
            +H
          </button>
        </div>
      )}
      <div className={cn('widget-title')}>
        <Icon />
        {widget.title}
      </div>
      <div className={cn('widget-values')}>
        {data.slice(1).map((x: any, i: number) => (
          <span key={i} className={typeof x === 'number' ? ui.metric : ''}>
            {typeof x === 'number' ? `${x.toFixed(0)}%` : x}
          </span>
        ))}
      </div>
      {['SYSTEM', 'STORAGE', 'NETWORK'].includes(widget.type) && (
        <MetricChart
          series={
            widget.type === 'SYSTEM'
              ? [history.cpu || [], history.memory || []]
              : widget.type === 'STORAGE'
                ? [history.disk || []]
                : [history.download || [], history.upload || []]
          }
        />
      )}
    </div>
  );
}
function MetricChart({ series }: { series: Array<Array<{ timestamp: number; value: number }>> }) {
  const colors = ['var(--accent)', '#4ad6c8'];
  const paths = series.map((points) => {
    if (points.length < 2) return '';
    const values = points.map((x) => x.value),
      min = Math.min(...values),
      max = Math.max(...values),
      span = max - min || 1;
    return points
      .map(
        (p, i) =>
          `${i ? 'L' : 'M'} ${(i / (points.length - 1)) * 100} ${32 - ((p.value - min) / span) * 28}`,
      )
      .join(' ');
  });
  return (
    <svg className={cn('metric-chart')} viewBox="0 0 100 36" preserveAspectRatio="none">
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke={colors[i]}
          strokeWidth="1.8"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
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
  const createApplication = useCreateApplication(),
    updateApplication = useUpdateApplication(),
    createWidget = useCreateWidget(),
    updateWidget = useUpdateWidget(),
    updateBranding = useUpdateBranding();
  const [mode, setMode] = useState(type),
    [form, setForm] = useState<any>({
      name: '',
      url: 'https://',
      icon: '',
      inDock: false,
      title: '',
      type: 'SYSTEM',
      config: {},
      ...dash.branding,
      ...(editing || {}),
      query: (editing as Widget | null)?.config?.query || '',
    });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'app')
        await (editing
          ? updateApplication.mutateAsync({ id: editing.id, data: form })
          : createApplication.mutateAsync(form));
      else if (mode === 'widget')
        await (editing
          ? updateWidget.mutateAsync({
              id: editing.id,
              data: {
                ...form,
                config:
                  form.type === 'PROMQL' ? { ...form.config, query: form.query } : form.config,
              },
            })
          : createWidget.mutateAsync({
              ...form,
              config: form.type === 'PROMQL' ? { ...form.config, query: form.query } : form.config,
            }));
      else if (mode === 'brand') await updateBranding.mutateAsync(form);
      else return;
      done();
    } catch {
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={cn('overlay')} onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <form className={cn('modal')} onSubmit={save}>
        <button type="button" className={cn('close')} onClick={close}>
          <X />
        </button>
        {type !== 'brand' && type !== 'account' && !editing && (
          <div className={cn('tabs')}>
            <button
              type="button"
              className={mode === 'app' ? ui.active : ''}
              onClick={() => setMode('app')}
            >
              Aplicativo
            </button>
            <button
              type="button"
              className={mode === 'widget' ? ui.active : ''}
              onClick={() => setMode('widget')}
            >
              Widget
            </button>
          </div>
        )}
        <h2>
          {mode === 'brand'
            ? 'Personalizar meu DashLab'
            : mode === 'account'
              ? 'Minha conta'
              : mode === 'app'
                ? `${editing ? 'Editar' : 'Novo'} aplicativo`
                : `${editing ? 'Editar' : 'Novo'} widget`}
        </h2>
        {mode === 'app' && (
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
            <ImageUpload
              label="Ícone do aplicativo"
              value={form.icon}
              onChange={(icon) => setForm({ ...form, icon })}
            />
            <label>
              Descrição
              <input
                value={form.description || ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
            <label>
              Categoria
              <input
                value={form.category || ''}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </label>
            <label>
              Deep link mobile
              <input
                value={form.deepLink || ''}
                onChange={(e) => setForm({ ...form, deepLink: e.target.value })}
              />
            </label>
            <label>
              URL de status
              <input
                value={form.statusUrl || ''}
                onChange={(e) => setForm({ ...form, statusUrl: e.target.value })}
              />
            </label>
            <label className={cn('check')}>
              <input
                type="checkbox"
                checked={form.inDock}
                onChange={(e) => setForm({ ...form, inDock: e.target.checked })}
              />{' '}
              Colocar no dock
            </label>
          </>
        )}
        {mode === 'widget' && (
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
                  'SYSTEM',
                  'STORAGE',
                  'NETWORK',
                  'CLOCK',
                  'WEATHER',
                  'SEARCH',
                  'STATUS',
                  'PROMQL',
                ].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            {form.type === 'PROMQL' && (
              <>
                <label>
                  Consulta PromQL
                  <textarea
                    value={form.query || ''}
                    onChange={(e) => setForm({ ...form, query: e.target.value })}
                  />
                </label>
                <label>
                  Sufixo/unidade
                  <input
                    value={form.config?.suffix || ''}
                    onChange={(e) =>
                      setForm({ ...form, config: { ...form.config, suffix: e.target.value } })
                    }
                  />
                </label>
              </>
            )}
            {form.type === 'WEATHER' && (
              <div className={cn('field-row')}>
                <label>
                  Latitude
                  <input
                    type="number"
                    step="any"
                    value={form.config?.latitude ?? -23.55}
                    onChange={(e) =>
                      setForm({ ...form, config: { ...form.config, latitude: +e.target.value } })
                    }
                  />
                </label>
                <label>
                  Longitude
                  <input
                    type="number"
                    step="any"
                    value={form.config?.longitude ?? -46.63}
                    onChange={(e) =>
                      setForm({ ...form, config: { ...form.config, longitude: +e.target.value } })
                    }
                  />
                </label>
              </div>
            )}
            {form.type === 'SEARCH' && (
              <label>
                Provedor
                <select
                  value={form.config?.provider || 'google'}
                  onChange={(e) =>
                    setForm({ ...form, config: { ...form.config, provider: e.target.value } })
                  }
                >
                  <option value="google">Google</option>
                  <option value="duckduckgo">DuckDuckGo</option>
                  <option value="bing">Bing</option>
                </select>
              </label>
            )}
          </>
        )}
        {mode === 'brand' && (
          <>
            <label>
              Nome
              <input
                value={form.name || ''}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label>
              Wallpaper (URL)
              <input
                value={form.wallpaper || ''}
                onChange={(e) => setForm({ ...form, wallpaper: e.target.value })}
              />
            </label>
            <ImageUpload
              label="Wallpaper"
              value={form.wallpaper}
              onChange={(wallpaper) => setForm({ ...form, wallpaper })}
            />
            <label>
              Logo (URL)
              <input
                value={form.logo || ''}
                onChange={(e) => setForm({ ...form, logo: e.target.value })}
              />
            </label>
            <ImageUpload
              label="Logo"
              value={form.logo}
              onChange={(logo) => setForm({ ...form, logo })}
              hint="Prefira uma imagem quadrada em PNG ou WebP"
            />
            <label>
              Cor de destaque
              <input
                type="color"
                value={form.accent || '#ff7a1a'}
                onChange={(e) => setForm({ ...form, accent: e.target.value })}
              />
            </label>
          </>
        )}
        {mode === 'account' && <Account close={close} />}
        {error && <div className={cn('error')}>{error}</div>}
        {mode !== 'account' && (
          <button className={cn('primary')} disabled={busy}>
            {busy ? 'Salvando…' : 'Salvar'}
          </button>
        )}
      </form>
    </div>
  );
}
function Account({ close }: { close: () => void }) {
  const [currentPassword, setCurrent] = useState(''),
    [newPassword, setNew] = useState(''),
    [confirmAccount, setConfirmAccount] = useState(false);
  const sessionsQuery = useSessions(),
    changePassword = useChangePassword(),
    logoutAllMutation = useLogoutAll(),
    deleteAccount = useDeleteAccount(),
    revokeSession = useRevokeSession(),
    sessions = (sessionsQuery.data || []) as any[];
  async function change() {
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword });
      setTimeout(() => {
        clearSession();
        location.reload();
      }, 900);
    } catch {}
  }
  async function logoutAll() {
    await logoutAllMutation.mutateAsync();
    location.reload();
  }
  async function remove() {
    try {
      await deleteAccount.mutateAsync(currentPassword);
      setTimeout(() => location.reload(), 900);
    } catch {}
  }
  return (
    <>
      <div className={cn('account')}>
        <label>
          Senha atual
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </label>
        <label>
          Nova senha
          <input
            type="password"
            minLength={8}
            value={newPassword}
            onChange={(e) => setNew(e.target.value)}
          />
        </label>
        <button type="button" className={cn('primary')} onClick={change}>
          Alterar senha
        </button>
        <h3>Sessões ativas ({sessions.length})</h3>
        {sessions.map((x) => (
          <div className={cn('session')} key={x.id}>
            <span>{new Date(x.createdAt).toLocaleString('pt-BR')}</span>
            <button type="button" onClick={() => revokeSession.mutate(x.id)}>
              Revogar
            </button>
          </div>
        ))}
        <button type="button" className={cn('secondary')} onClick={logoutAll}>
          Encerrar todas as sessões
        </button>
        <button type="button" className={cn('danger')} onClick={() => setConfirmAccount(true)}>
          Excluir minha conta
        </button>
        <button type="button" className={cn('link')} onClick={close}>
          Fechar
        </button>
      </div>
      {confirmAccount && (
        <ConfirmModal
          title="Excluir conta"
          message="Todo o dashboard, aplicativos, widgets e imagens serão excluídos permanentemente."
          confirmLabel="Excluir permanentemente"
          danger
          onCancel={() => setConfirmAccount(false)}
          onConfirm={() => {
            setConfirmAccount(false);
            remove();
          }}
        />
      )}
    </>
  );
}
function ConfirmModal({
  title,
  message,
  confirmLabel,
  onCancel,
  onConfirm,
  danger = false,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
  danger?: boolean;
}) {
  return (
    <div className={cn('overlay confirm-overlay')}>
      <div className={cn('modal confirm-modal')} role="dialog" aria-modal="true">
        <h2>{title}</h2>
        <p>{message}</p>
        <div className={cn('confirm-actions')}>
          <button className={cn('secondary')} onClick={onCancel}>
            Cancelar
          </button>
          <button className={cn(danger ? 'danger solid' : 'primary')} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
