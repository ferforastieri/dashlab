import { CSSProperties, PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react';
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
  Menu,
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
import { useMediaQuery } from '../../../components/ui/useMediaQuery';
import { DashboardApplication as AppItem, DashboardData as Dash, DashboardLayout as Layout, DashboardSection as Section, DashboardWidget as Widget } from '../dashboard.types';
import { dashboardClassNames as ui, dashboardCn as cn } from '../dashboard.styles';
import { DashboardClock } from './DashboardClock';
import { DashboardEditor } from './DashboardEditor';
import { WidgetCard } from './WidgetCard';
import { HeaderWeather } from './HeaderWeather';

const defaultBranding = {
  accent: '#ff7a1a', wallpaper: '', logo: '', favicon: '', backgroundColor: '#101416',
  panelColor: '#181d20', textColor: '#e7eaec', borderColor: '#343b3f', radius: 5,
  panelOpacity: 100, wallpaperOverlay: 55, fontScale: 100, mobileLayout: 'GRID',
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
    [selectedLayoutId, setSelectedLayoutId] = useState<string | null>(null),
    [mobileMenuOpen, setMobileMenuOpen] = useState(false),
    [layouts, setLayouts] = useState<Layout[]>([]),
    [canvasHeight, setCanvasHeight] = useState<number | null>(null),
    [canvasWidth, setCanvasWidth] = useState(0),
    [menu, setMenu] = useState<string | null>(null),
    [confirmDelete, setConfirmDelete] = useState<{ kind: string; id: string; name: string } | null>(
      null,
    );
  const canvasRef = useRef<HTMLElement | null>(null);
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
  const branding = { ...defaultBranding, ...(dash.branding || {}) };
  const mobileLayout = branding.mobileLayout || 'GRID';
  const mobileApps = dash.applications.filter((app) => app.visible !== false);
  const weatherWidget = dash.widgets.find((widget) => widget.type === 'WEATHER');
  const activeCanvasHeight = canvasHeight ?? 620;
  const contentWidth = Math.max(1, ...layouts.map((layout) => layout.x + layout.w));
  const canvasScale = isMobile || !canvasWidth ? 1 : Math.min(1, canvasWidth / contentWidth);
  const displayLayout = (layout: Layout) => ({
    x: Math.round(layout.x * canvasScale),
    y: Math.round(layout.y * canvasScale),
    w: Math.round(layout.w * canvasScale),
    h: Math.round(layout.h * canvasScale),
  });
  const beginCanvasResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = activeCanvasHeight;
    let nextHeight = startHeight;
    const move = (pointerEvent: PointerEvent) => {
      nextHeight = Math.max(320, Math.round(startHeight + (pointerEvent.clientY - startY) / canvasScale));
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
        <button className={cn('icon-button')} onClick={() => setModal('brand')} title="Personalizar"><Settings /></button>
        {!isMobile && <button className={cn('icon-button', layoutEdit && 'active')} onClick={() => { setLayoutEdit(!layoutEdit); setSelectedLayoutId(null); }} title="Editar organização"><Pencil /></button>}
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
    <div className={`${cn('desktop')} overflow-x-hidden`} style={visualTokens}>
      <main className={`${isMobile && mobileLayout === 'BOTTOM_NAV' ? 'pb-20' : ''} ${isMobile ? 'pt-[calc(64px+env(safe-area-inset-top))]' : ''}`}>
        {layoutEdit && !isMobile && <div className="canvas-edit-hint">Clique em um item para selecioná-lo · arraste para mover · use as alças para redimensionar</div>}
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
              layout.kind === 'WIDGET' ? dash.widgets.find((w) => w.id === layout.widgetId) : null;
            const dashboardSection =
              layout.kind === 'SECTION' ? dash.sections.find((section) => section.id === layout.sectionId) : null;
            const dashboardElement = layout.kind === 'DASHBOARD_ELEMENT' ? layout.elementKey : null;
            if (isMobile && dashboardElement && ['BRAND', 'ACTIONS', 'ADD'].includes(dashboardElement)) return null;
            if (!app && !widget && !dashboardSection && !dashboardElement) return null;
            const display = displayLayout(layout);
            return (
              <Rnd
                key={layout.id}
                className={`canvas-item ${dashboardElement ? `chrome-canvas-item mobile-${dashboardElement.toLowerCase()}` : ''} ${app ? 'application-canvas-item mobile-application' : ''} ${widget ? `mobile-widget mobile-widget-${widget.type.toLowerCase()}` : ''} ${dashboardSection ? 'mobile-section' : ''} ${layoutEdit && !isMobile ? 'is-editing' : ''} ${selectedLayoutId === layout.id ? 'is-selected' : ''}`}
                bounds="parent"
                position={{ x: display.x, y: display.y }}
                size={{ width: display.w, height: dashboardSection?.collapsed ? Math.round(54 * canvasScale) : display.h }}
                minWidth={(dashboardElement ? 32 : dashboardSection ? 240 : widget?.type === 'DIVIDER' ? 120 : 72) * canvasScale}
                minHeight={(dashboardElement || widget?.type === 'DIVIDER' ? 20 : dashboardSection ? 140 : 72) * canvasScale}
                disableDragging={!layoutEdit || isMobile || selectedLayoutId !== layout.id}
                enableResizing={layoutEdit && !isMobile && selectedLayoutId === layout.id && !dashboardSection?.collapsed}
                dragHandleClassName={dashboardElement ? 'dashboard-element' : undefined}
                resizeHandleClasses={resizeHandleClasses}
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
        <button className="layout-edit-done" onClick={() => { setLayoutEdit(false); setSelectedLayoutId(null); }}>
          Concluir edição
        </button>
      )}
      {isMobile && (
        <header className="fixed inset-x-0 top-0 z-30 flex min-h-16 items-center gap-3 border-b border-[var(--border-color)] bg-[color-mix(in_srgb,var(--surface-bg)_94%,transparent)] px-[max(12px,env(safe-area-inset-left))] pb-2 pt-[max(8px,env(safe-area-inset-top))] backdrop-blur">
          {mobileLayout === 'DRAWER' && <button onClick={() => setMobileMenuOpen(true)} className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--element-radius)] border border-[var(--border-color)] text-[var(--text-color)]" aria-label="Abrir aplicativos"><Menu size={20} /></button>}
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-[var(--element-radius)] border border-[var(--border-color)] bg-[var(--accent)] text-sm font-bold text-[var(--surface-bg)]">{branding.logo ? <img src={branding.logo} alt="" className="h-full w-full object-contain p-0.5" /> : (branding.name || dash.name)[0]}</span>
            <span className="min-w-0"><small className="block text-[9px] tracking-[.12em] text-[var(--muted)]">WORKSPACE</small><strong className="block truncate text-sm font-semibold">{branding.name || dash.name}</strong></span>
          </div>
          <div className="flex shrink-0 gap-1">{mobileLayout === 'GRID' && <button onClick={() => setModal('app')} className="grid h-10 w-10 place-items-center rounded-[var(--element-radius)] text-[var(--muted)]" aria-label="Adicionar aplicativo"><Plus size={19} /></button>}<button onClick={() => setModal('brand')} className="grid h-10 w-10 place-items-center rounded-[var(--element-radius)] text-[var(--muted)]" aria-label="Personalizar"><Settings size={19} /></button><button onClick={() => setModal('account')} className="grid h-10 w-10 place-items-center rounded-[var(--element-radius)] text-[var(--muted)]" aria-label="Minha conta"><UserRound size={19} /></button></div>
        </header>
      )}
      {isMobile && mobileLayout !== 'GRID' && mobileMenuOpen && (
        <>
          <button aria-label="Fechar menu" onClick={() => setMobileMenuOpen(false)} className="fixed inset-0 z-40 bg-black/50" />
          <aside className={`fixed z-50 flex gap-4 border-[var(--border-color)] bg-[var(--surface-bg)] p-5 shadow-2xl ${mobileLayout === 'DRAWER' ? 'inset-y-0 left-0 w-[min(86vw,360px)] flex-col border-r' : 'inset-x-0 bottom-0 max-h-[78dvh] flex-col rounded-t-[var(--element-radius)] border-t'}`}>
            <div className="flex shrink-0 items-center justify-between gap-3"><div><span className="text-[10px] tracking-[.14em] text-[var(--muted)]">APLICATIVOS</span><strong className="block text-sm">{branding.name || dash.name}</strong></div><button onClick={() => setMobileMenuOpen(false)} className="rounded p-2 text-[var(--muted)]" aria-label="Fechar"><X /></button></div>
            <div className="grid min-h-0 gap-2 overflow-y-auto pr-1">
              {mobileApps.map((app) => (
                <a key={app.id} href={app.url} target="_blank" rel="noreferrer" onClick={() => setMobileMenuOpen(false)} className="flex min-w-0 items-center gap-3 rounded-[var(--element-radius)] border border-[var(--border-color)] bg-[var(--panel-color)] p-3 text-sm">
                  <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded border border-[var(--border-color)] bg-[var(--surface-bg)]">{app.icon ? <img src={app.icon} alt="" className="h-full w-full object-cover" /> : app.name[0]}</span>
                  <span className="min-w-0"><strong className="block truncate font-medium">{app.name}</strong><small className="block truncate text-xs text-[var(--muted)]">{app.description || app.url}</small></span>
                </a>
              ))}
              {!mobileApps.length && <p className="m-0 rounded border border-dashed border-[var(--border-color)] p-4 text-sm text-[var(--muted)]">Nenhum aplicativo cadastrado.</p>}
            </div>
            <div className="grid shrink-0 grid-cols-2 gap-2">
              <button onClick={() => { setMobileMenuOpen(false); setModal('app'); }} className="rounded border border-[var(--border-color)] p-3 text-sm">Adicionar</button>
              <button onClick={() => { setMobileMenuOpen(false); setModal('brand'); }} className="rounded border border-[var(--border-color)] p-3 text-sm">Aparência</button>
              <button onClick={() => { setMobileMenuOpen(false); setModal('account'); }} className="rounded border border-[var(--border-color)] p-3 text-sm">Conta</button>
              <button onClick={onLogout} className="rounded border border-[var(--border-color)] p-3 text-sm text-[var(--muted)]">Sair</button>
            </div>
          </aside>
        </>
      )}
      {isMobile && mobileLayout === 'BOTTOM_NAV' && (
        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-[var(--border-color)] bg-[color-mix(in_srgb,var(--panel-color)_96%,transparent)] px-[max(12px,env(safe-area-inset-left))] pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur" aria-label="Navegação do dashboard">
          <button onClick={() => setMobileMenuOpen(true)} className="grid min-h-12 place-items-center gap-0.5 text-xs text-[var(--muted)]"><Menu size={18} />Apps</button>
          <button onClick={() => setModal('app')} className="grid min-h-12 place-items-center gap-0.5 text-xs text-[var(--muted)]"><Plus size={18} />Adicionar</button>
          <button onClick={() => setModal('brand')} className="grid min-h-12 place-items-center gap-0.5 text-xs text-[var(--muted)]"><Settings size={18} />Aparência</button>
          <button onClick={() => setModal('account')} className="grid min-h-12 place-items-center gap-0.5 text-xs text-[var(--muted)]"><UserRound size={18} />Conta</button>
        </nav>
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
