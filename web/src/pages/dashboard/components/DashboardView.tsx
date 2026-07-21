import { CSSProperties, useEffect, useState } from 'react';
import { Rnd } from 'react-rnd';
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

const resizeHandleClasses = {
  top: 'canvas-resize-handle handle-n',
  right: 'canvas-resize-handle handle-e',
  bottom: 'canvas-resize-handle handle-s',
  left: 'canvas-resize-handle handle-w',
  topRight: 'canvas-resize-handle handle-ne',
  bottomRight: 'canvas-resize-handle handle-se',
  bottomLeft: 'canvas-resize-handle handle-sw',
  topLeft: 'canvas-resize-handle handle-nw',
};

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
    [layouts, setLayouts] = useState<Layout[]>([]),
    [menu, setMenu] = useState<string | null>(null),
    [confirmDelete, setConfirmDelete] = useState<{ kind: string; id: string; name: string } | null>(
      null,
    );
  const load = () => dashboardQuery.refetch();
  useEffect(() => {
    if (!dash) return;
    setLayouts([...dash.layouts].sort((a, b) => a.order - b.order));
    document.title = dash.branding?.name || dash.name;
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

  async function updateLayout(id: string, values: Partial<Pick<Layout, 'x' | 'y' | 'w' | 'h'>>) {
    const next = layouts.map((layout) => (layout.id === id ? { ...layout, ...values } : layout));
    setLayouts(next);
    await saveLayout.mutateAsync(
      next.map(({ kind, applicationId, widgetId, x, y, w, h }) => ({
        kind, applicationId, widgetId, x, y, w, h,
      })),
    );
  }
  async function remove(kind: string, id: string) {
    await (kind === 'applications' ? deleteApp.mutateAsync(id) : deleteWidget.mutateAsync(id));
    setMenu(null);
  }
  if (!dash) return <div className={cn('loading')}>Carregando seu DashLab…</div>;
  const branding = dash.branding || {};
  const canvasHeight = Math.max(620, ...layouts.map((layout) => layout.y + layout.h + 120));
  const visualTokens = {
    '--accent': branding.accent,
    '--surface-bg': branding.backgroundColor,
    '--panel-color': branding.panelColor,
    '--text-color': branding.textColor,
    '--border-color': branding.borderColor,
    '--element-radius': `${branding.radius}px`,
    '--panel-opacity': `${branding.panelOpacity}%`,
    '--wallpaper-overlay': `${branding.wallpaperOverlay}%`,
    '--ui-scale': branding.fontScale / 100,
    backgroundImage: branding.wallpaper
      ? `linear-gradient(color-mix(in srgb, #000 var(--wallpaper-overlay), transparent), color-mix(in srgb, #000 var(--wallpaper-overlay), transparent)), url(${branding.wallpaper})`
      : undefined,
  } as CSSProperties;
  return (
    <div className={cn('desktop')} style={visualTokens}>
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
        {layoutEdit && <div className="canvas-edit-hint">Arraste para mover · use as alças para redimensionar</div>}
        <section className={`free-canvas ${layoutEdit ? 'is-editing' : ''}`} style={{ height: canvasHeight }}>
          {layouts.map((layout) => {
            const app =
              layout.kind === 'APPLICATION'
                ? dash.applications.find((a) => a.id === layout.applicationId)
                : null;
            const widget =
              layout.kind === 'WIDGET' ? dash.widgets.find((w) => w.id === layout.widgetId) : null;
            if (!app && !widget) return null;
            return (
              <Rnd
                key={layout.id}
                className={`canvas-item ${layoutEdit ? 'is-editing' : ''}`}
                bounds="parent"
                position={{ x: layout.x, y: layout.y }}
                size={{ width: layout.w, height: layout.h }}
                minWidth={72}
                minHeight={72}
                disableDragging={!layoutEdit}
                enableResizing={layoutEdit}
                resizeHandleClasses={resizeHandleClasses}
                cancel="button,a,input,select,textarea"
                onDragStop={(_event, position) => {
                  void updateLayout(layout.id, { x: position.x, y: position.y });
                }}
                onResizeStop={(_event, _direction, element, _delta, position) => {
                  void updateLayout(layout.id, {
                    x: position.x,
                    y: position.y,
                    w: element.offsetWidth,
                    h: element.offsetHeight,
                  });
                }}
              >
                {app ? (
                  <div className={cn('app-wrap')}>
                    <a
                      className={cn('app-icon', layoutEdit && 'pointer-events-none')}
                      href={app.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {app.icon && <img src={app.icon} alt="" />}
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
                    editingLayout={layoutEdit}
                    onDelete={() =>
                      setConfirmDelete({ kind: 'widgets', id: widget!.id, name: widget!.title })
                    }
                  />
                )}
              </Rnd>
            );
          })}
        </section>
      </main>
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
