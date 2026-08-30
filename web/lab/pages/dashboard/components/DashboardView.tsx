import {
  CSSProperties,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Rnd } from 'react-rnd';
import {
  Plus,
  Search,
  Settings,
  Edit3,
  Pencil,
  Menu,
  Trash2,
  X,
  ChevronDown,
  GripHorizontal,
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
import { useMediaQuery } from '../../../components/ui/useMediaQuery';
import {
  DashboardApplication as AppItem,
  DashboardData as Dash,
  DashboardLayout as Layout,
  DashboardSection as Section,
  DashboardWidget as Widget,
} from '../dashboard.types';
import { dashboardCn as cn } from '../dashboard.styles';
import { DashboardClock } from './DashboardClock';
import { DashboardEditor } from './DashboardEditor';
import { WidgetCard } from './WidgetCard';
import { HeaderWeather } from './HeaderWeather';
import { apiClient } from '../../../api/core/apiClient';

const defaultBranding = {
  accent: '#ff7a1a',
  wallpaper: '',
  logo: '',
  favicon: '',
  backgroundColor: '#101416',
  panelColor: '#181d20',
  textColor: '#e7eaec',
  borderColor: '#343b3f',
  radius: 5,
  panelOpacity: 100,
  wallpaperOverlay: 55,
  fontScale: 100,
  mobileLayout: 'GRID',
};

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

export function DashboardView({ dashboardQuery }: { dashboardQuery: any }) {
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
  const [modal, setModal] = useState<'app' | 'widget' | 'section' | 'element' | 'brand' | null>(null),
    [editing, setEditing] = useState<AppItem | Widget | Section | null>(null),
    [layoutEdit, setLayoutEdit] = useState(false),
    [selectedLayoutId, setSelectedLayoutId] = useState<string | null>(null),
    [mobileMenuOpen, setMobileMenuOpen] = useState(false),
    [layouts, setLayouts] = useState<Layout[]>([]),
    [canvasWidth, setCanvasWidth] = useState(0),
    [query, setQuery] = useState(''),
    [confirmDelete, setConfirmDelete] = useState<{ kind: string; id: string; name: string } | null>(
      null,
    ),
    [canManageUsers, setCanManageUsers] = useState(false);
  const canvasRef = useRef<HTMLElement | null>(null);
  const drawerTouchStart = useRef<{ x: number; y: number } | null>(null);
  const load = () => dashboardQuery.refetch();
  useEffect(() => { void apiClient.get('/auth/users').then(() => setCanManageUsers(true)).catch(() => setCanManageUsers(false)); }, []);
  async function addUser() {
    const username = window.prompt('Nome do novo usuário'); if (!username) return;
    const password = window.prompt('Senha do novo usuário'); if (!password) return;
    const role = window.prompt('Permissão (admin ou user)', 'user') || 'user';
    try { await apiClient.post('/auth/users', { username, password, role }); window.alert('Usuário criado com sucesso.'); } catch { /* toast interceptor */ }
  }
  useEffect(() => {
    if (!dash) return;
    setLayouts([...dash.layouts].sort((a, b) => a.order - b.order));
    document.title = dash.branding?.name || dash.name;
    const manifest = document.querySelector<HTMLLinkElement>("link[rel='manifest']");
    if (manifest) manifest.href = `/api/pwa/${dash.id}/manifest.webmanifest`;
    const backgroundColor = dash.branding?.backgroundColor;
    const accentColor = dash.branding?.accent;
    const themeColor = document.querySelector<HTMLMetaElement>("meta[name='theme-color']");
    if (themeColor && (accentColor || backgroundColor))
      themeColor.content = accentColor || backgroundColor;
    if (backgroundColor) {
      document.documentElement.style.backgroundColor = backgroundColor;
      document.body.style.backgroundColor = backgroundColor;
      try {
        localStorage.setItem(
          `dashlab-plus:pwa-theme:${dash.id}`,
          JSON.stringify({ backgroundColor, themeColor: accentColor || backgroundColor }),
        );
      } catch {
        // Theme caching is only a launch-time enhancement.
      }
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || isMobile) return;
    const measure = () => setCanvasWidth(canvas.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [isMobile, dash]);

  async function updateLayout(id: string, values: Partial<Pick<Layout, 'x' | 'y' | 'w' | 'h'>>) {
    if (!dash) return;
    const current = layouts.find((layout) => layout.id === id);
    if (!current) return;
    const moved = { ...current, ...values };
    let next = layouts.map((layout) => (layout.id === id ? moved : layout));
    if (current.kind === 'SECTION' && current.sectionId) {
      const dx = moved.x - current.x;
      const dy = moved.y - current.y;
      const sectionAppIds = new Set(
        dash.applications.filter((app) => app.sectionId === current.sectionId).map((app) => app.id),
      );
      next = next.map((layout) =>
        layout.kind === 'APPLICATION' && layout.applicationId && sectionAppIds.has(layout.applicationId)
          ? { ...layout, x: layout.x + dx, y: layout.y + dy }
          : layout,
      );
    }
    setLayouts(next);
    await saveLayout.mutateAsync(
      next.map(({ kind, applicationId, widgetId, sectionId, elementKey, x, y, w, h }) => ({
        kind,
        applicationId,
        widgetId,
        sectionId,
        elementKey,
        x,
        y,
        w,
        h,
      })),
    );
  }
  async function addDashboardElement(elementKey: Layout['elementKey']) {
    if (!elementKey) return;
    const elements = layouts.filter((layout) => layout.kind === 'DASHBOARD_ELEMENT');
    const index = elements.length;
    const nextLayout: Layout = {
      id: `element-${elementKey.toLowerCase()}-${Date.now()}`,
      kind: 'DASHBOARD_ELEMENT',
      elementKey,
      order: layouts.length ? Math.max(...layouts.map((layout) => layout.order)) + 1 : 1,
      x: 24 + (index % 4) * 240,
      y: 24 + Math.floor(index / 4) * 88,
      w: elementKey === 'SEARCH' ? 360 : elementKey === 'FOOTER' ? 760 : 180,
      h: elementKey === 'FOOTER' ? 48 : 64,
    };
    const next = [...layouts, nextLayout];
    setLayouts(next);
    await saveLayout.mutateAsync(next.map(({ kind, applicationId, widgetId, sectionId, elementKey: key, x, y, w, h }) => ({ kind, applicationId, widgetId, sectionId, elementKey: key, x, y, w, h })));
    await dashboardQuery.refetch();
  }
  async function remove(kind: string, id: string) {
    await (kind === 'applications'
      ? deleteApp.mutateAsync(id)
      : kind === 'sections'
        ? deleteSection.mutateAsync(id)
        : deleteWidget.mutateAsync(id));
  }
  async function removeDashboardElement(id: string) {
    const next = layouts.filter((layout) => layout.id !== id);
    setLayouts(next);
    await saveLayout.mutateAsync(next.map(({ kind, applicationId, widgetId, sectionId, elementKey, x, y, w, h }) => ({ kind, applicationId, widgetId, sectionId, elementKey, x, y, w, h })));
    await dashboardQuery.refetch();
    setSelectedLayoutId(null);
  }
  if (!dash) return null;
  const branding = { ...defaultBranding, ...(dash.branding || {}) };
  const mobileLayout = branding.mobileLayout || 'GRID';
  const mobileApps = dash.applications.filter((app) => app.visible !== false);
  const weatherWidget = dash.widgets.find((widget) => widget.type === 'WEATHER');
  const activeCanvasHeight = Math.max(620, ...layouts.map((layout) => layout.y + layout.h + 24));
  const contentWidth = Math.max(1, ...layouts.map((layout) => layout.x + layout.w));
  const canvasScale = isMobile || !canvasWidth ? 1 : Math.min(1, canvasWidth / contentWidth);
  const displayLayout = (layout: Layout) => ({
    x: Math.round(layout.x * canvasScale),
    y: Math.round(layout.y * canvasScale),
    w: Math.round(layout.w * canvasScale),
    h: Math.round(layout.h * canvasScale),
  });
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
    if (elementKey === 'BRAND')
      return (
        <div className="chrome-brand has-logo">
          <div className={cn('brand-mark small')}>
            <img src={branding.logo || '/logo.svg'} alt="" />
          </div>
          <div className="brand-copy">
            <span>WORKSPACE</span>
            <strong>{branding.name || dash.name}</strong>
          </div>
        </div>
      );
    if (elementKey === 'CLOCK')
      return (
        <div className="chrome-clock">
          <DashboardClock />
        </div>
      );
    if (elementKey === 'WEATHER')
      return (
        <div className="chrome-weather">
          <HeaderWeather widget={weatherWidget} />
        </div>
      );
    if (elementKey === 'SEARCH')
      return (
        <form className={cn('search')} onSubmit={(event) => {
          event.preventDefault();
          const normalized = query.trim().toLocaleLowerCase();
          if (!normalized) return;
          const application = dash.applications.find((item) =>
            item.visible !== false && item.name.toLocaleLowerCase().includes(normalized),
          );
          window.open(application?.url || `https://www.google.com/search?q=${encodeURIComponent(query.trim())}`, '_blank', 'noopener,noreferrer');
        }}>
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} list="dashlab-applications" placeholder="Pesquisar aplicações ou na web" />
          <datalist id="dashlab-applications">
            {dash.applications.filter((item) => item.visible !== false).map((item) => <option key={item.id} value={item.name} />)}
          </datalist>
        </form>
      );
    if (elementKey === 'ACTIONS')
      return (
        <div className={`${cn('header-tools')} chrome-actions`}>
          <button
            className={cn('icon-button')}
            onClick={() => setModal('brand')}
            title="Personalizar"
          >
            <Settings />
          </button>
          {canManageUsers && <button className={cn('icon-button')} onClick={addUser} title="Gerenciar usuários"><span aria-hidden="true">♙</span></button>}
          {!isMobile && (
            <button
              className={cn('icon-button', layoutEdit && 'active')}
              onClick={() => {
                setLayoutEdit(!layoutEdit);
                setSelectedLayoutId(null);
              }}
              title="Editar organização"
            >
              <Pencil />
            </button>
          )}
        </div>
      );
    if (elementKey === 'ADD')
      return (
        <button
          className="chrome-add-button"
          onClick={() => setModal('element')}
          aria-label="Adicionar aplicativo"
        >
          <Plus />
        </button>
      );
    if (elementKey === 'FOOTER')
      return (
        <footer className="rack-line chrome-footer" aria-label="Estado do workspace">
          <span>DL—01 / PERSONAL NODE</span>
          <span>{dash.applications.length.toString().padStart(2, '0')} SERVICES</span>
          <span className="rack-line-status">
            <i /> SYSTEM READY
          </span>
        </footer>
      );
    return null;
  };
  return (
    <div className={`${cn('desktop')} overflow-x-hidden`} style={visualTokens}>
      <main
        className={`${isMobile && mobileLayout === 'BOTTOM_NAV' ? 'pb-20' : ''} ${isMobile ? 'pt-[calc(64px+env(safe-area-inset-top))]' : ''}`}
      >
        {layoutEdit && !isMobile && (
          <div className="canvas-edit-hint">
            Clique em um item para selecioná-lo · arraste para mover · use as alças para
            redimensionar
          </div>
        )}
        <section
          ref={canvasRef}
          className={`free-canvas ${layoutEdit && !isMobile ? 'is-editing' : ''}`}
          style={{ height: isMobile ? undefined : Math.round(activeCanvasHeight * canvasScale) }}
        >
          {layouts.map((layout) => {
            const app =
              layout.kind === 'APPLICATION'
                ? dash.applications.find((a) => a.id === layout.applicationId)
                : null;
            const widget =
              layout.kind === 'WIDGET'
                ? dash.widgets.find(
                    (w) => w.id === layout.widgetId && !['CLOCK', 'WEATHER', 'SEARCH'].includes(w.type),
                  )
                : null;
            const dashboardSection =
              layout.kind === 'SECTION'
                ? dash.sections.find((section) => section.id === layout.sectionId)
                : null;
            const dashboardElement = layout.kind === 'DASHBOARD_ELEMENT' ? layout.elementKey : null;
            if (
              isMobile &&
              dashboardElement &&
              ['BRAND', 'ACTIONS', 'ADD'].includes(dashboardElement)
            )
              return null;
            if (!app && !widget && !dashboardSection && !dashboardElement) return null;
            if (app?.sectionId) return null;
            const display = displayLayout(layout);
            return (
              <Rnd
                key={layout.id}
                className={`canvas-item ${dashboardElement ? `chrome-canvas-item mobile-${dashboardElement.toLowerCase()}` : ''} ${app ? 'application-canvas-item mobile-application' : ''} ${widget ? `mobile-widget mobile-widget-${widget.type.toLowerCase()}` : ''} ${dashboardSection ? 'mobile-section' : ''} ${layoutEdit && !isMobile ? 'is-editing' : ''} ${selectedLayoutId === layout.id ? 'is-selected' : ''}`}
                bounds="parent"
                position={{ x: display.x, y: display.y }}
                size={{
                  width: display.w,
                  height: dashboardSection?.collapsed ? Math.round(54 * canvasScale) : display.h,
                }}
                minWidth={
                  (dashboardElement
                    ? 32
                    : dashboardSection
                      ? 240
                      : widget?.type === 'DIVIDER'
                        ? 120
                        : 72) * canvasScale
                }
                minHeight={
                  (dashboardElement || widget?.type === 'DIVIDER'
                    ? 20
                    : dashboardSection
                      ? 140
                      : 72) * canvasScale
                }
                disableDragging={!layoutEdit || isMobile || selectedLayoutId !== layout.id}
                enableResizing={
                  layoutEdit &&
                  !isMobile &&
                  selectedLayoutId === layout.id &&
                  !dashboardSection?.collapsed
                }
                dragHandleClassName="canvas-drag-handle"
                resizeHandleClasses={
                  layoutEdit && !isMobile && selectedLayoutId === layout.id
                    ? resizeHandleClasses
                    : undefined
                }
                cancel={dashboardElement ? undefined : 'button,a,input,select,textarea'}
                onMouseDown={() => {
                  if (layoutEdit && !isMobile) setSelectedLayoutId(layout.id);
                }}
                onDragStop={(_event, position) => {
                  void updateLayout(layout.id, {
                    x: Math.round(position.x / canvasScale),
                    y: Math.round(position.y / canvasScale),
                  });
                }}
                onResizeStop={(_event, _direction, element, _delta, position) => {
                  void updateLayout(layout.id, {
                    x: Math.round(position.x / canvasScale),
                    y: Math.round(position.y / canvasScale),
                    w: Math.round(element.offsetWidth / canvasScale),
                    h: Math.round(element.offsetHeight / canvasScale),
                  });
                }}
              >
                {dashboardElement ? (
                  <div
                    className={`dashboard-element dashboard-element-${dashboardElement.toLowerCase()}`}
                    onClickCapture={(event) => {
                      if (!layoutEdit) return;
                      if ((event.target as HTMLElement).closest('button')) return;
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                  >
                    {layoutEdit && <div className="chrome-drag-handle canvas-drag-handle" aria-label="Mover elemento"><GripHorizontal size={14} /></div>}
                    {layoutEdit && (
                      <div className="dashboard-element-controls">
                        <button
                          type="button"
                          title="Selecionar elemento"
                          aria-label="Selecionar elemento"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedLayoutId(layout.id);
                          }}
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          title="Remover elemento"
                          aria-label="Remover elemento"
                          onClick={(event) => {
                            event.stopPropagation();
                            void removeDashboardElement(layout.id);
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                    {renderDashboardElement(dashboardElement)}
                  </div>
                ) : dashboardSection ? (
                  <div
                    className={`section-card ${dashboardSection.collapsed ? 'is-collapsed' : ''}`}
                  >
                    {layoutEdit && <div className="canvas-drag-handle" aria-label="Mover seção"><GripHorizontal size={14} /></div>}
                    <header className="section-header">
                      <h3>{dashboardSection.name}</h3>
                      <div className="section-actions">
                        {layoutEdit && (
                          <>
                            <button
                              onClick={() => {
                                setEditing(dashboardSection);
                                setModal('section');
                              }}
                              title="Editar seção"
                            >
                              <Edit3 />
                            </button>
                            <button
                              onClick={() =>
                                setConfirmDelete({
                                  kind: 'sections',
                                  id: dashboardSection.id,
                                  name: dashboardSection.name,
                                })
                              }
                              title="Excluir seção"
                            >
                              <Trash2 />
                            </button>
                          </>
                        )}
                        <button
                          className="section-collapse"
                          onClick={() =>
                            updateSection.mutate({
                              id: dashboardSection.id,
                              data: { collapsed: !dashboardSection.collapsed },
                              silent: true,
                            })
                          }
                          title={dashboardSection.collapsed ? 'Expandir seção' : 'Recolher seção'}
                          aria-expanded={!dashboardSection.collapsed}
                        >
                          <ChevronDown />
                        </button>
                      </div>
                    </header>
                    <div className="section-apps">
                      {dash.applications
                        .filter((item) => item.sectionId === dashboardSection.id)
                        .map((item) => (
                          <div className="section-app" key={item.id}>
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noreferrer"
                              className={layoutEdit ? 'pointer-events-none' : ''}
                            >
                          <span className="section-app-icon">
                                {item.icon && <img src={item.icon} alt="" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = '/logo.svg'; }} />}
                              </span>
                              <span>
                                <strong>{item.name}</strong>
                                <small>{item.description || 'Sem descrição'}</small>
                              </span>
                            </a>
                            {layoutEdit && (
                              <button
                                onClick={() => {
                                  setEditing(item);
                                  setModal('app');
                                }}
                                title="Editar aplicativo"
                              >
                                <Edit3 />
                              </button>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                ) : app ? (
                  <div className={cn('app-wrap')}>
                    {layoutEdit && <div className="canvas-drag-handle" aria-label="Mover aplicativo"><GripHorizontal size={14} /></div>}
                    {layoutEdit && (
                      <div className="canvas-item-controls" aria-label="Controles do aplicativo">
                        <button
                          type="button"
                          title="Editar aplicativo"
                          aria-label="Editar aplicativo"
                          onClick={() => {
                            setEditing(app);
                            setModal('app');
                          }}
                        ><Edit3 size={14} /></button>
                        <button
                          type="button"
                          title="Excluir aplicativo"
                          aria-label="Excluir aplicativo"
                          onClick={() => setConfirmDelete({ kind: 'applications', id: app.id, name: app.name })}
                        ><Trash2 size={14} /></button>
                      </div>
                    )}
                    <a
                      className="app-icon"
                      href={app.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(event) => {
                        if (layoutEdit) event.preventDefault();
                      }}
                    >
                      {app.icon && <img src={app.icon} alt="" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = '/logo.svg'; }} />}
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
                  </div>
                ) : (
                  <>
                    {layoutEdit && <div className="canvas-drag-handle" aria-label="Mover widget"><GripHorizontal size={14} /></div>}
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
                  </>
                )}
              </Rnd>
            );
          })}
        </section>
      </main>
      {layoutEdit && !isMobile && (
        <button
          className="layout-edit-done"
          onClick={() => {
            setLayoutEdit(false);
            setSelectedLayoutId(null);
          }}
        >
          Concluir edição
        </button>
      )}
      {isMobile && (
        <header className="fixed inset-x-0 top-0 z-30 flex min-h-16 items-center gap-3 border-b border-[var(--border-color)] bg-[color-mix(in_srgb,var(--surface-bg)_94%,transparent)] px-[max(12px,env(safe-area-inset-left))] pb-2 pt-[max(8px,env(safe-area-inset-top))] backdrop-blur">
          {mobileLayout === 'DRAWER' && (
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--element-radius)] border-0 bg-transparent text-[var(--text-color)]"
              aria-label="Abrir aplicativos"
            >
              <Menu size={20} />
            </button>
          )}
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <span
              className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden bg-transparent text-sm font-bold"
            >
              <img src={branding.logo || '/logo.svg'} alt="" className="h-full w-full object-contain" />
            </span>
            <span className="min-w-0">
              <small className="block text-[9px] tracking-[.12em] text-[var(--muted)]">
                WORKSPACE
              </small>
              <strong className="block truncate text-sm font-semibold">
                {branding.name || dash.name}
              </strong>
            </span>
          </div>
          <div className="flex shrink-0 gap-1">
            {mobileLayout === 'GRID' && (
              <button
                onClick={() => setModal('element')}
                className="grid h-10 w-10 place-items-center rounded-[var(--element-radius)] text-[var(--muted)]"
                aria-label="Adicionar aplicativo"
              >
                <Plus size={19} />
              </button>
            )}
            <button
              onClick={() => setModal('brand')}
              className="grid h-10 w-10 place-items-center rounded-[var(--element-radius)] text-[var(--muted)]"
              aria-label="Personalizar"
            >
              <Settings size={19} />
            </button>
          </div>
        </header>
      )}
      {isMobile && mobileLayout !== 'GRID' && mobileMenuOpen && (
        <>
          <button
            aria-label="Fechar menu"
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 z-40 bg-black/50"
          />
          <aside
            onTouchStart={(event) => {
              const touch = event.touches[0];
              drawerTouchStart.current = { x: touch.clientX, y: touch.clientY };
            }}
            onTouchEnd={(event) => {
              const start = drawerTouchStart.current;
              drawerTouchStart.current = null;
              if (!start) return;
              const touch = event.changedTouches[0];
              const dx = touch.clientX - start.x;
              const dy = touch.clientY - start.y;
              const drawer = mobileLayout === 'DRAWER';
              if (drawer ? dx < -90 && Math.abs(dx) > Math.abs(dy) : dy > 90 && Math.abs(dy) > Math.abs(dx)) setMobileMenuOpen(false);
            }}
            className={`fixed z-50 flex gap-4 border-[var(--border-color)] bg-[var(--surface-bg)] p-5 shadow-2xl ${mobileLayout === 'DRAWER' ? 'inset-y-0 left-0 w-[min(86vw,360px)] flex-col border-r' : 'inset-x-0 bottom-0 max-h-[78dvh] flex-col rounded-t-[var(--element-radius)] border-t'}`}
          >
            <div className="flex shrink-0 items-center justify-between gap-3">
              <div>
                <span className="text-[10px] tracking-[.14em] text-[var(--muted)]">
                  APLICATIVOS
                </span>
                <strong className="block text-sm">{branding.name || dash.name}</strong>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-[var(--element-radius)] border-0 bg-transparent p-2 text-[var(--muted)]"
                aria-label="Fechar"
              >
                <X />
              </button>
            </div>
            <div className="grid min-h-0 gap-2 overflow-y-auto pr-1">
              {mobileApps.map((app) => (
                <a
                  key={app.id}
                  href={app.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex min-w-0 items-center gap-3 rounded-[var(--element-radius)] border border-[var(--border-color)] bg-[var(--panel-color)] p-3 text-sm"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-[var(--element-radius)] border-0 bg-transparent">
                    {app.icon ? (
                      <img src={app.icon} alt="" className="h-full w-full object-contain" />
                    ) : (
                      app.name[0]
                    )}
                  </span>
                  <span className="min-w-0">
                    <strong className="block truncate font-medium">{app.name}</strong>
                    <small className="block truncate text-xs text-[var(--muted)]">
                      {app.description || app.url}
                    </small>
                  </span>
                </a>
              ))}
              {!mobileApps.length && (
                <p className="m-0 rounded-[var(--element-radius)] border border-dashed border-[var(--border-color)] p-4 text-sm text-[var(--muted)]">
                  Nenhum aplicativo cadastrado.
                </p>
              )}
            </div>
            <div className="grid shrink-0 grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setModal('element');
                }}
                className="rounded-[var(--element-radius)] border border-[var(--border-color)] bg-transparent p-3 text-sm"
              >
                Adicionar
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setModal('brand');
                }}
                className="rounded-[var(--element-radius)] border border-[var(--border-color)] bg-transparent p-3 text-sm"
              >
                Aparência
              </button>
            </div>
          </aside>
        </>
      )}
      {isMobile && mobileLayout === 'BOTTOM_NAV' && (
        <nav
          className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-[var(--border-color)] bg-[color-mix(in_srgb,var(--panel-color)_96%,transparent)] px-[max(12px,env(safe-area-inset-left))] pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur"
          aria-label="Navegação do dashboard"
        >
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="grid min-h-12 place-items-center gap-0.5 text-xs text-[var(--muted)]"
          >
            <Menu size={18} />
            Apps
          </button>
          <button
            onClick={() => setModal('element')}
            className="grid min-h-12 place-items-center gap-0.5 text-xs text-[var(--muted)]"
          >
            <Plus size={18} />
            Adicionar
          </button>
          <button
            onClick={() => setModal('brand')}
            className="grid min-h-12 place-items-center gap-0.5 text-xs text-[var(--muted)]"
          >
            <Settings size={18} />
            Aparência
          </button>
        </nav>
      )}
      {modal && (
        <DashboardEditor
          type={modal}
          dash={dash}
          editing={editing}
          onAddElement={addDashboardElement}
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
