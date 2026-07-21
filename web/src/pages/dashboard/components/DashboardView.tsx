import { useEffect, useMemo, useState } from 'react';
import {
  CloudSun,
  LogOut,
  MoreVertical,
  Plus,
  Search,
  Settings,
  Edit3,
  UserRound,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import { useMetricsOverviewQuery } from '../../../api/metrics/useMetricsOverviewQuery';
import { useMetricsHistoryQuery } from '../../../api/metrics/useMetricsHistoryQuery';
import { useApplicationStatusesQuery } from '../../../api/applications/useApplicationStatusesQuery';
import { useSaveLayoutMutation } from '../../../api/layouts/useSaveLayoutMutation';
import { useDeleteApplicationMutation } from '../../../api/applications/useDeleteApplicationMutation';
import { useDeleteWidgetMutation } from '../../../api/widgets/useDeleteWidgetMutation';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { DashboardApplication as AppItem, DashboardData as Dash, DashboardLayout as Layout, DashboardWidget as Widget } from '../dashboard.types';
import { dashboardClassNames as ui, dashboardCn as cn } from '../dashboard.styles';
import { DashboardClock } from './DashboardClock';
import { DashboardEditor } from './DashboardEditor';
import { WidgetCard } from './WidgetCard';
import { getApplicationIconUrl, useEmbeddedIconFallback } from '../applicationIcon';

export function DashboardView({ onLogout, dashboardQuery }: { onLogout: () => void; dashboardQuery: any }) {
  const metricsQuery = useMetricsOverviewQuery(),
    historyQuery = useMetricsHistoryQuery(),
    statusesQuery = useApplicationStatusesQuery(),
    saveLayout = useSaveLayoutMutation(),
    deleteApp = useDeleteApplicationMutation(),
    deleteWidget = useDeleteWidgetMutation();
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
      <div className="rack-line" aria-hidden="true">
        <span>DL—01 / PERSONAL NODE</span>
        <span>{dash.applications.length.toString().padStart(2, '0')} SERVICES</span>
        <span className="rack-line-status">
          <i /> SYSTEM READY
        </span>
      </div>
      <header className="dash-header">
        <div className={cn('brand')}>
          <div className={cn('brand-mark small')}>
            {branding.logo ? <img src={branding.logo} alt="" /> : (branding.name || 'D')[0]}
          </div>
          <div className="brand-copy">
            <span>WORKSPACE</span>
            <strong>{branding.name || dash.name}</strong>
          </div>
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
          <DashboardClock />
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
                className={cn(
                  'layout-item',
                  layout.kind === 'WIDGET' ? 'mobile-widget' : 'mobile-app',
                  layoutEdit && 'layout-editing',
                )}
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
                    <a
                      className={cn('app-icon', layoutEdit && 'pointer-events-none')}
                      href={app.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img
                        src={getApplicationIconUrl(app)}
                        alt=""
                        onError={useEmbeddedIconFallback}
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
                src={getApplicationIconUrl(a)}
                alt=""
                onError={useEmbeddedIconFallback}
              />
            </a>
          ))}
      </div>
      <button className={cn('add')} onClick={() => setModal('app')} aria-label="Adicionar aplicativo">
        <Plus />
      </button>
      {modal && (
        <DashboardEditor
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
        <ConfirmDialog
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
