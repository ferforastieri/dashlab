import { CSSProperties, PointerEvent as ReactPointerEvent, useEffect, useState } from 'react';
import { Rnd } from 'react-rnd';
import {
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
  ChevronDown,
} from 'lucide-react';
import { useMetricsOverviewQuery } from '../../../api/metrics/useMetricsOverviewQuery';
import { useMetricsHistoryQuery } from '../../../api/metrics/useMetricsHistoryQuery';
import { useApplicationStatusesQuery } from '../../../api/applications/useApplicationStatusesQuery';
import { useSaveLayoutMutation } from '../../../api/layouts/useSaveLayoutMutation';
import { useDeleteApplicationMutation } from '../../../api/applications/useDeleteApplicationMutation';
import { useDeleteWidgetMutation } from '../../../api/widgets/useDeleteWidgetMutation';
import { useDeleteSectionMutation } from '../../../api/sections/useDeleteSectionMutation';
import { useUpdateSectionMutation } from '../../../api/sections/useUpdateSectionMutation';
import { useUpdateBrandingMutation } from '../../../api/dashboard/useUpdateBrandingMutation';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { PwaInstallButton } from '../../../components/ui/PwaInstallButton';
import { useMediaQuery } from '../../../components/ui/useMediaQuery';
import { DashboardApplication as AppItem, DashboardData as Dash, DashboardLayout as Layout, DashboardSection as Section, DashboardWidget as Widget } from '../dashboard.types';
import { dashboardClassNames as ui, dashboardCn as cn } from '../dashboard.styles';
import { DashboardClock } from './DashboardClock';
import { DashboardEditor } from './DashboardEditor';
import { WidgetCard } from './WidgetCard';
import { HeaderWeather } from './HeaderWeather';

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
  const isMobile = useMediaQuery('(max-width: 800px)');
  const metricsQuery = useMetricsOverviewQuery(),
    historyQuery = useMetricsHistoryQuery(),
    statusesQuery = useApplicationStatusesQuery(),
    saveLayout = useSaveLayoutMutation(),
    updateBranding = useUpdateBrandingMutation(),
    deleteApp = useDeleteApplicationMutation(),
    deleteWidget = useDeleteWidgetMutation(),
    deleteSection = useDeleteSectionMutation(),
    updateSection = useUpdateSectionMutation();
  const dash = (dashboardQuery.data || null) as Dash | null,
    metrics = metricsQuery.data || {},
    history = historyQuery.data || {},
    statuses = Object.fromEntries(((statusesQuery.data || []) as any[]).map((x) => [x.id, x]));
  const [query, setQuery] = useState(''),
    [modal, setModal] = useState<'app' | 'widget' | 'section' | 'brand' | 'account' | null>(null),
    [editing, setEditing] = useState<AppItem | Widget | Section | null>(null),
    [layoutEdit, setLayoutEdit] = useState(false),
    [layouts, setLayouts] = useState<Layout[]>([]),
    [canvasHeight, setCanvasHeight] = useState<number | null>(null),
    [menu, setMenu] = useState<string | null>(null),
    [confirmDelete, setConfirmDelete] = useState<{ kind: string; id: string; name: string } | null>(
      null,
    );
  const load = () => dashboardQuery.refetch();
  useEffect(() => {
    if (!dash) return;
    setLayouts([...dash.layouts].sort((a, b) => a.order - b.order));
    setCanvasHeight((current) => current ?? (Number(dash.branding?.canvasHeight) || Math.max(620, ...dash.layouts.map((layout: Layout) => layout.y + layout.h + 24))));
    document.title = dash.branding?.name || dash.name;
    let manifest = document.querySelector<HTMLLinkElement>("link[rel='manifest']");
    if (!manifest) {
      manifest = document.createElement('link');
      manifest.rel = 'manifest';
      document.head.appendChild(manifest);
    }
    manifest.href = `/api/pwa/${dash.id}/manifest.webmanifest`;
    const backgroundColor = dash.branding?.backgroundColor;
    const themeColor = document.querySelector<HTMLMetaElement>("meta[name='theme-color']");
    if (themeColor && backgroundColor) themeColor.content = backgroundColor;
    if (backgroundColor) {
      document.documentElement.style.backgroundColor = backgroundColor;
      document.body.style.backgroundColor = backgroundColor;
    }
    if (dash.branding?.favicon) {
      let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = dash.branding.favicon;
      let touchIcon = document.querySelector<HTMLLinkElement>("link[rel='apple-touch-icon']");
      if (!touchIcon) {
        touchIcon = document.createElement('link');
        touchIcon.rel = 'apple-touch-icon';
        document.head.appendChild(touchIcon);
      }
      touchIcon.href = `/api/pwa/${dash.id}/icon/192.png`;
    }
  }, [dash]);

  async function updateLayout(id: string, values: Partial<Pick<Layout, 'x' | 'y' | 'w' | 'h'>>) {
    const next = layouts.map((layout) => (layout.id === id ? { ...layout, ...values } : layout));
    setLayouts(next);
    await saveLayout.mutateAsync(
      next.map(({ kind, applicationId, widgetId, sectionId, elementKey, x, y, w, h }) => ({
        kind, applicationId, widgetId, sectionId, elementKey, x, y, w, h,
      })),
    );
  }
  async function remove(kind: string, id: string) {
    await (kind === 'applications'
      ? deleteApp.mutateAsync(id)
      : kind === 'sections'
        ? deleteSection.mutateAsync(id)
        : deleteWidget.mutateAsync(id));
    setMenu(null);
  }
  if (!dash) return <div className={cn('loading')}>Carregando seu DashLab…</div>;
  const branding = dash.branding || {};
  const weatherWidget = dash.widgets.find((widget) => widget.type === 'WEATHER');
  const activeCanvasHeight = canvasHeight ?? 620;
  const beginCanvasResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = activeCanvasHeight;
    let nextHeight = startHeight;
    const move = (pointerEvent: PointerEvent) => {
      nextHeight = Math.max(320, Math.round(startHeight + pointerEvent.clientY - startY));
      setCanvasHeight(nextHeight);
    };
    const finish = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      void updateBranding.mutateAsync({ canvasHeight: nextHeight });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish, { once: true });
  };
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
      ? `linear-gradient(color-mix(in srgb, var(--surface-bg) var(--wallpaper-overlay), transparent), color-mix(in srgb, var(--surface-bg) var(--wallpaper-overlay), transparent)), url(${branding.wallpaper})`
      : undefined,
  } as CSSProperties;
  const renderDashboardElement = (elementKey: Layout['elementKey']) => {
    if (elementKey === 'BRAND') return (
      <div className={`chrome-brand ${branding.logo ? 'has-logo' : ''}`}>
        <div className={cn('brand-mark small')}>
          {branding.logo ? <img src={branding.logo} alt="" /> : (branding.name || 'D')[0]}
        </div>
        <div className="brand-copy"><span>WORKSPACE</span><strong>{branding.name || dash.name}</strong></div>
      </div>
    );
    if (elementKey === 'CLOCK') return <div className="chrome-clock"><DashboardClock /></div>;
    if (elementKey === 'WEATHER') return <div className="chrome-weather"><HeaderWeather widget={weatherWidget} /></div>;
    if (elementKey === 'SEARCH') return (
      <form className={cn('search')} onSubmit={(event) => {
        event.preventDefault();
        if (query) window.open(`https://google.com/search?q=${encodeURIComponent(query)}`, '_blank');
      }}>
        <Search size={18} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar na web" />
      </form>
    );
    if (elementKey === 'ACTIONS') return (
      <div className={`${cn('header-tools')} chrome-actions`}>
        <PwaInstallButton className={cn('icon-button')} />
        <button className={cn('icon-button')} onClick={() => setModal('brand')} title="Personalizar"><Settings /></button>
        {!isMobile && <button className={cn('icon-button', layoutEdit && 'active')} onClick={() => setLayoutEdit(!layoutEdit)} title="Editar organização"><Pencil /></button>}
        <button className={cn('icon-button')} onClick={() => setModal('account')} title="Minha conta"><UserRound /></button>
        <button className={cn('icon-button')} onClick={onLogout} title="Sair"><LogOut /></button>
      </div>
    );
    if (elementKey === 'ADD') return <button className="chrome-add-button" onClick={() => setModal('app')} aria-label="Adicionar aplicativo"><Plus /></button>;
    if (elementKey === 'FOOTER') return (
      <footer className="rack-line chrome-footer" aria-label="Estado do workspace">
        <span>DL—01 / PERSONAL NODE</span>
        <span>{dash.applications.length.toString().padStart(2, '0')} SERVICES</span>
        <span className="rack-line-status"><i /> SYSTEM READY</span>
      </footer>
    );
    return null;
  };
  return (
    <div className={cn('desktop')} style={visualTokens}>
      <main>
        {layoutEdit && !isMobile && <div className="canvas-edit-hint">Arraste para mover · use as alças para redimensionar</div>}
        <section className={`free-canvas ${layoutEdit && !isMobile ? 'is-editing' : ''}`} style={{ height: isMobile ? undefined : activeCanvasHeight }}>
          {layouts.map((layout) => {
            const app =
              layout.kind === 'APPLICATION'
                ? dash.applications.find((a) => a.id === layout.applicationId)
                : null;
            const widget =
              layout.kind === 'WIDGET' ? dash.widgets.find((w) => w.id === layout.widgetId) : null;
            const dashboardSection =
              layout.kind === 'SECTION' ? dash.sections.find((section) => section.id === layout.sectionId) : null;
            const dashboardElement = layout.kind === 'DASHBOARD_ELEMENT' ? layout.elementKey : null;
            if (app?.sectionId) return null;
            if (!app && !widget && !dashboardSection && !dashboardElement) return null;
            return (
              <Rnd
                key={layout.id}
                className={`canvas-item ${dashboardElement ? `chrome-canvas-item mobile-${dashboardElement.toLowerCase()}` : ''} ${app ? 'application-canvas-item mobile-application' : ''} ${widget ? `mobile-widget mobile-widget-${widget.type.toLowerCase()}` : ''} ${dashboardSection ? 'mobile-section' : ''} ${layoutEdit && !isMobile ? 'is-editing' : ''}`}
                bounds="parent"
                position={{ x: layout.x, y: layout.y }}
                size={{ width: layout.w, height: dashboardSection?.collapsed ? 54 : layout.h }}
                minWidth={dashboardElement ? 32 : dashboardSection ? 240 : widget?.type === 'DIVIDER' ? 120 : 72}
                minHeight={dashboardElement || widget?.type === 'DIVIDER' ? 20 : dashboardSection ? 140 : 72}
                disableDragging={!layoutEdit || isMobile}
                enableResizing={layoutEdit && !isMobile && !dashboardSection?.collapsed}
                dragHandleClassName={dashboardElement ? 'dashboard-element' : undefined}
                resizeHandleClasses={resizeHandleClasses}
                cancel={dashboardElement ? undefined : 'button,a,input,select,textarea'}
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
                {dashboardElement ? (
                  <div
                    className={`dashboard-element dashboard-element-${dashboardElement.toLowerCase()}`}
                    onClickCapture={(event) => {
                      if (!layoutEdit) return;
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                  >
                    {layoutEdit && <div className="chrome-drag-handle" aria-hidden="true" />}
                    {renderDashboardElement(dashboardElement)}
                  </div>
                ) : dashboardSection ? (
                  <div className={`section-card ${dashboardSection.collapsed ? 'is-collapsed' : ''}`}>
                    <header className="section-header">
                      <h3>{dashboardSection.name}</h3>
                      <div className="section-actions">
                        {layoutEdit && <>
                          <button onClick={() => { setEditing(dashboardSection); setModal('section'); }} title="Editar seção"><Edit3 /></button>
                          <button onClick={() => setConfirmDelete({ kind: 'sections', id: dashboardSection.id, name: dashboardSection.name })} title="Excluir seção"><Trash2 /></button>
                        </>}
                        <button
                          className="section-collapse"
                          onClick={() => updateSection.mutate({ id: dashboardSection.id, data: { collapsed: !dashboardSection.collapsed }, silent: true })}
                          title={dashboardSection.collapsed ? 'Expandir seção' : 'Recolher seção'}
                          aria-expanded={!dashboardSection.collapsed}
                        ><ChevronDown /></button>
                      </div>
                    </header>
                    <div className="section-apps">
                      {dash.applications.filter((item) => item.sectionId === dashboardSection.id).map((item) => (
                        <div className="section-app" key={item.id}>
                          <a href={item.url} target="_blank" rel="noreferrer" className={layoutEdit ? 'pointer-events-none' : ''}>
                            <span className="section-app-icon">{item.icon && <img src={item.icon} alt="" />}</span>
                            <span><strong>{item.name}</strong><small>{item.description || 'Sem descrição'}</small></span>
                          </a>
                          {layoutEdit && <button onClick={() => { setEditing(item); setModal('app'); }} title="Editar aplicativo"><Edit3 /></button>}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : app ? (
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
                    <small className="app-description">{app.description || 'Sem descrição'}</small>
                    <i
                      className={`app-status ${statuses[app.id]?.online ? 'is-online' : statuses[app.id] ? 'is-offline' : 'is-checking'}`}
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
          {layoutEdit && !isMobile && (
            <div className="canvas-height-handle" onPointerDown={beginCanvasResize}>
              <span>Redimensionar área</span>
            </div>
          )}
        </section>
      </main>
      {layoutEdit && !isMobile && (
        <button className="layout-edit-done" onClick={() => setLayoutEdit(false)}>
          Concluir edição
        </button>
      )}
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
