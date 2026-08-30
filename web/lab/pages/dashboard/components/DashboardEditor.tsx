import { FormEvent, useEffect, useState } from 'react';
import { AppWindow, Grid2X2, Layers3, PanelBottom, PanelLeft, X } from 'lucide-react';
import { useCreateApplicationMutation } from '../../../api/applications/useCreateApplicationMutation';
import { useUpdateApplicationMutation } from '../../../api/applications/useUpdateApplicationMutation';
import { useCreateWidgetMutation } from '../../../api/widgets/useCreateWidgetMutation';
import { useUpdateWidgetMutation } from '../../../api/widgets/useUpdateWidgetMutation';
import { useUpdateBrandingMutation } from '../../../api/dashboard/useUpdateBrandingMutation';
import { useCreateSectionMutation } from '../../../api/sections/useCreateSectionMutation';
import { useUpdateSectionMutation } from '../../../api/sections/useUpdateSectionMutation';
import { ImageUpload } from '../../../components/ui/ImageUpload';
import { Modal } from '../../../components/ui/Modal';
import {
  DashboardApplication as AppItem,
  DashboardData as Dash,
  DashboardSection as Section,
  DashboardWidget as Widget,
} from '../dashboard.types';
import { dashboardClassNames as ui, dashboardCn as cn } from '../dashboard.styles';
import { apiClient } from '../../../api/core/apiClient';

const defaultBranding = {
  accent: '#ff7a1a',
  theme: 'dark',
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

export function DashboardEditor({
  type,
  dash,
  editing,
  close,
  done,
}: {
  type: string;
  dash: Dash;
  editing: AppItem | Widget | Section | null;
  close: () => void;
  done: () => void;
}) {
  const createApplication = useCreateApplicationMutation(),
    updateApplication = useUpdateApplicationMutation(),
    createWidget = useCreateWidgetMutation(),
    updateWidget = useUpdateWidgetMutation(),
    createSection = useCreateSectionMutation(),
    updateSection = useUpdateSectionMutation(),
    updateBranding = useUpdateBrandingMutation();
  const [mode, setMode] = useState(type),
    [form, setForm] = useState<any>({
      name: '',
      url: 'https://',
      icon: '',
      title: '',
      type: 'SYSTEM',
      config: {},
      ...defaultBranding,
      ...dash.branding,
      ...(editing || {}),
      applicationIds:
        editing && type === 'section'
          ? dash.applications.filter((app) => app.sectionId === editing.id).map((app) => app.id)
          : [],
      query: (editing as Widget | null)?.config?.query || '',
      prometheusUrl: '',
      targetLabels: '',
      networkLabels: 'device!="lo"',
      diskLabels: 'device=~"nvme[0-9]+n[0-9]+|sd[a-z]+"',
    });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    if (mode !== 'brand') return;
    void apiClient.get('/settings').then(({ data }) => {
      setForm((current: any) => ({ ...current, prometheusUrl: data.prometheusUrl || '', targetLabels: data.targetLabels || '', networkLabels: data.networkLabels || current.networkLabels, diskLabels: data.diskLabels || current.diskLabels }));
    }).catch(() => undefined);
  }, [mode]);
  const title =
    mode === 'brand'
      ? 'Personalizar meu DashLab+'
      : mode === 'app'
        ? `${editing ? 'Editar' : 'Novo'} aplicativo`
        : mode === 'section'
          ? `${editing ? 'Editar' : 'Nova'} seção`
          : `${editing ? 'Editar' : 'Novo'} widget`;
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'app') {
        const application = {
          name: form.name,
          url: form.url,
          description: form.description || undefined,
          deepLink: form.deepLink || undefined,
          icon: form.icon || undefined,
          category: form.category || undefined,
          statusUrl: form.statusUrl || undefined,
          visible: form.visible,
        };
        await (editing
          ? updateApplication.mutateAsync({ id: editing.id, data: application })
          : createApplication.mutateAsync(application));
      } else if (mode === 'widget') {
        const widget = {
          title: form.title,
          type: form.type,
          visible: form.visible,
          config: form.type === 'PROMQL' ? { ...form.config, query: form.query } : form.config,
        };
        await (editing
          ? updateWidget.mutateAsync({ id: editing.id, data: widget })
          : createWidget.mutateAsync(widget));
      } else if (mode === 'section') {
        await (editing
          ? updateSection.mutateAsync({
              id: editing.id,
              data: { name: form.name, applicationIds: form.applicationIds },
            })
          : createSection.mutateAsync({ name: form.name, applicationIds: form.applicationIds }));
      } else if (mode === 'brand') {
        await updateBranding.mutateAsync({
          name: form.name,
          wallpaper: form.wallpaper || '',
          logo: form.logo || '',
          favicon: form.favicon || '',
          accent: form.accent,
          theme: form.theme,
          backgroundColor: form.backgroundColor,
          panelColor: form.panelColor,
          textColor: form.textColor,
          borderColor: form.borderColor,
          radius: Number(form.radius),
          panelOpacity: Number(form.panelOpacity),
          wallpaperOverlay: Number(form.wallpaperOverlay),
          fontScale: Number(form.fontScale),
          mobileLayout: form.mobileLayout || 'GRID',
        });
        await apiClient.put('/settings', {
          prometheusUrl: form.prometheusUrl || '',
          targetLabels: form.targetLabels || '',
          networkLabels: form.networkLabels || '',
          diskLabels: form.diskLabels || '',
        });
      } else return;
      done();
    } catch {
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal onClose={close}>
      <form className="modal-form" onSubmit={save}>
        <header className="modal-header">
          <h2>{title}</h2>
          <button type="button" className={cn('close')} onClick={close} aria-label="Fechar">
            <X />
          </button>
        </header>
        {type !== 'brand' && !editing && (
          <div className={cn('tabs')}>
            <button
              type="button"
              className={mode === 'app' ? ui.active : ''}
              onClick={() => setMode('app')}
            >
              <AppWindow aria-hidden="true" /> Aplicativo
            </button>
            <button
              type="button"
              className={mode === 'widget' ? ui.active : ''}
              onClick={() => setMode('widget')}
            >
              <Grid2X2 aria-hidden="true" /> Widget
            </button>
            <button
              type="button"
              className={mode === 'section' ? ui.active : ''}
              onClick={() => setMode('section')}
            >
              <Layers3 aria-hidden="true" /> Seção
            </button>
          </div>
        )}
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
          </>
        )}
        {mode === 'section' && (
          <>
            <label>
              Nome da seção
              <input
                required
                value={form.name || ''}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <fieldset className="section-app-picker">
              <legend>Aplicativos</legend>
              <p>
                Escolha os apps que aparecem nesta seção. Eles continuam disponíveis na tela
                principal.
              </p>
              <div>
                {dash.applications.map((app) => (
                  <label key={app.id}>
                    <input
                      type="checkbox"
                      checked={form.applicationIds.includes(app.id)}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          applicationIds: event.target.checked
                            ? [...form.applicationIds, app.id]
                            : form.applicationIds.filter((id: string) => id !== app.id),
                        })
                      }
                    />
                    <span>
                      {app.icon && <img src={app.icon} alt="" />}
                      <b>{app.name}</b>
                      <small>{app.description || 'Sem descrição'}</small>
                    </span>
                  </label>
                ))}
                {!dash.applications.length && (
                  <span className="section-app-picker-empty">
                    Cadastre um aplicativo antes de criar a seção.
                  </span>
                )}
              </div>
            </fieldset>
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
                  ['SYSTEM', 'Sistema'],
                  ['STORAGE', 'Armazenamento'],
                  ['NETWORK', 'Rede'],
                  ['STATUS', 'Status'],
                  ['PROMQL', 'Consulta PromQL'],
                  ['DIVIDER', 'Divisória'],
                ].map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
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
          </>
        )}
        {mode === 'brand' && (
          <>
            <fieldset className="grid gap-3 border-0 p-0">
              <legend className="text-sm font-semibold">Integrações</legend>
              <label>
                URL do Prometheus
                <input
                  type="url"
                  placeholder="http://prometheus:9090"
                  value={form.prometheusUrl || ''}
                  onChange={(e) => setForm({ ...form, prometheusUrl: e.target.value })}
                />
              </label>
              <label>Labels dos targets<input value={form.targetLabels || ''} placeholder='job="node-exporter"' onChange={(e) => setForm({ ...form, targetLabels: e.target.value })} /></label>
              <label>Labels de rede<input value={form.networkLabels || ''} placeholder='device!="lo"' onChange={(e) => setForm({ ...form, networkLabels: e.target.value })} /></label>
              <label>Labels de disco<input value={form.diskLabels || ''} placeholder='device=~"nvme.*|sd.*"' onChange={(e) => setForm({ ...form, diskLabels: e.target.value })} /></label>
              <p className="m-0 text-xs leading-relaxed text-[var(--muted)]">
                Os filtros são aplicados pela API local.
              </p>
            </fieldset>
            <label>
              Nome
              <input
                value={form.name || ''}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <ImageUpload
              label="Wallpaper"
              value={form.wallpaper}
              onChange={(wallpaper) => setForm({ ...form, wallpaper })}
            />
            <ImageUpload
              label="Logo"
              value={form.logo}
              onChange={(logo) => setForm({ ...form, logo })}
              hint="Prefira uma imagem quadrada em PNG ou WebP"
            />
            <ImageUpload
              label="Favicon da aba"
              value={form.favicon}
              onChange={(favicon) => setForm({ ...form, favicon })}
              hint="Use uma imagem quadrada em PNG ou WebP"
            />
            <label>
              Cor de destaque
              <input
                type="color"
                value={form.accent}
                onChange={(e) => setForm({ ...form, accent: e.target.value })}
              />
            </label>
            <div className="visual-color-grid">
              <label>
                Fundo
                <input
                  type="color"
                  value={form.backgroundColor}
                  onChange={(e) => setForm({ ...form, backgroundColor: e.target.value })}
                />
              </label>
              <label>
                Painéis
                <input
                  type="color"
                  value={form.panelColor}
                  onChange={(e) => setForm({ ...form, panelColor: e.target.value })}
                />
              </label>
              <label>
                Texto
                <input
                  type="color"
                  value={form.textColor}
                  onChange={(e) => setForm({ ...form, textColor: e.target.value })}
                />
              </label>
              <label>
                Bordas
                <input
                  type="color"
                  value={form.borderColor}
                  onChange={(e) => setForm({ ...form, borderColor: e.target.value })}
                />
              </label>
            </div>
            <label className="range-field">
              <span>
                Arredondamento <output>{form.radius}px</output>
              </span>
              <input
                type="range"
                min="0"
                max="40"
                value={form.radius}
                onChange={(e) => setForm({ ...form, radius: Number(e.target.value) })}
              />
            </label>
            <label className="range-field">
              <span>
                Opacidade dos painéis <output>{form.panelOpacity}%</output>
              </span>
              <input
                type="range"
                min="10"
                max="100"
                value={form.panelOpacity}
                onChange={(e) => setForm({ ...form, panelOpacity: Number(e.target.value) })}
              />
            </label>
            <label className="range-field">
              <span>
                Escurecer wallpaper <output>{form.wallpaperOverlay}%</output>
              </span>
              <input
                type="range"
                min="0"
                max="100"
                value={form.wallpaperOverlay}
                onChange={(e) => setForm({ ...form, wallpaperOverlay: Number(e.target.value) })}
              />
            </label>
            <label className="range-field">
              <span>
                Escala da interface <output>{form.fontScale}%</output>
              </span>
              <input
                type="range"
                min="75"
                max="140"
                value={form.fontScale}
                onChange={(e) => setForm({ ...form, fontScale: Number(e.target.value) })}
              />
            </label>
            <fieldset className="grid gap-3 border-0 p-0">
              <legend className="mb-1 text-sm text-[var(--muted)]">Layout no celular</legend>
              <p className="m-0 text-xs leading-relaxed text-[var(--muted)]">
                Escolha como os atalhos e controles aparecem em telas pequenas.
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {[
                  {
                    value: 'GRID',
                    title: 'Grade',
                    text: 'Conteúdo alinhado em duas colunas.',
                    Icon: Grid2X2,
                  },
                  {
                    value: 'DRAWER',
                    title: 'Menu lateral',
                    text: 'Atalhos concentrados em um drawer.',
                    Icon: PanelLeft,
                  },
                  {
                    value: 'BOTTOM_NAV',
                    title: 'Barra inferior',
                    text: 'Ações sempre ao alcance do polegar.',
                    Icon: PanelBottom,
                  },
                ].map(({ value, title, text, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm({ ...form, mobileLayout: value })}
                    className={`grid min-h-36 content-between rounded-[var(--element-radius)] border p-3 text-left transition ${form.mobileLayout === value || (!form.mobileLayout && value === 'GRID') ? 'border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_12%,var(--panel-color))] text-[var(--text-color)]' : 'border-[var(--border-color)] bg-[var(--panel-color)] text-[var(--muted)] hover:border-[var(--accent)]'}`}
                  >
                    <span className="grid gap-2">
                      <Icon size={20} className="text-[var(--accent)]" />
                      <strong className="text-sm font-semibold">{title}</strong>
                    </span>
                    <span className="text-xs leading-snug">{text}</span>
                    <span className="mt-3 grid h-7 grid-cols-3 gap-1 rounded-[var(--element-radius)] border border-current/30 p-1 opacity-80">
                      <i
                        className={`rounded-[var(--element-radius)] bg-current/60 ${value === 'DRAWER' ? 'col-span-1' : 'col-span-3'}`}
                      />
                      {value === 'BOTTOM_NAV' && (
                        <i className="col-span-3 rounded-[var(--element-radius)] bg-current/40" />
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>
          </>
        )}
        {error && <div className={cn('error')}>{error}</div>}
        <button className={cn('primary')} disabled={busy}>
          {busy ? 'Salvando…' : 'Salvar'}
        </button>
      </form>
    </Modal>
  );
}
