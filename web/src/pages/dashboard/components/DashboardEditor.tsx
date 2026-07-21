import { FormEvent, useState } from 'react';
import { X } from 'lucide-react';
import { useCreateApplicationMutation } from '../../../api/applications/useCreateApplicationMutation';
import { useUpdateApplicationMutation } from '../../../api/applications/useUpdateApplicationMutation';
import { useCreateWidgetMutation } from '../../../api/widgets/useCreateWidgetMutation';
import { useUpdateWidgetMutation } from '../../../api/widgets/useUpdateWidgetMutation';
import { useUpdateBrandingMutation } from '../../../api/dashboard/useUpdateBrandingMutation';
import { ImageUpload } from '../../../components/ui/ImageUpload';
import { Modal } from '../../../components/ui/Modal';
import { AccountPanel } from '../../account/components/AccountPanel';
import { DashboardApplication as AppItem, DashboardData as Dash, DashboardWidget as Widget } from '../dashboard.types';
import { dashboardClassNames as ui, dashboardCn as cn } from '../dashboard.styles';

export function DashboardEditor({
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
  const createApplication = useCreateApplicationMutation(),
    updateApplication = useUpdateApplicationMutation(),
    createWidget = useCreateWidgetMutation(),
    updateWidget = useUpdateWidgetMutation(),
    updateBranding = useUpdateBrandingMutation();
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
      if (mode === 'app') {
        const application = {
          name: form.name,
          url: form.url,
          description: form.description || undefined,
          deepLink: form.deepLink || undefined,
          icon: form.icon || undefined,
          category: form.category || undefined,
          statusUrl: form.statusUrl || undefined,
          inDock: Boolean(form.inDock),
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
              <span>Arredondamento <output>{form.radius}px</output></span>
              <input type="range" min="0" max="40" value={form.radius} onChange={(e) => setForm({ ...form, radius: Number(e.target.value) })} />
            </label>
            <label className="range-field">
              <span>Opacidade dos painéis <output>{form.panelOpacity}%</output></span>
              <input type="range" min="10" max="100" value={form.panelOpacity} onChange={(e) => setForm({ ...form, panelOpacity: Number(e.target.value) })} />
            </label>
            <label className="range-field">
              <span>Escurecer wallpaper <output>{form.wallpaperOverlay}%</output></span>
              <input type="range" min="0" max="100" value={form.wallpaperOverlay} onChange={(e) => setForm({ ...form, wallpaperOverlay: Number(e.target.value) })} />
            </label>
            <label className="range-field">
              <span>Escala da interface <output>{form.fontScale}%</output></span>
              <input type="range" min="75" max="140" value={form.fontScale} onChange={(e) => setForm({ ...form, fontScale: Number(e.target.value) })} />
            </label>
          </>
        )}
        {mode === 'account' && <AccountPanel onClose={close} />}
        {error && <div className={cn('error')}>{error}</div>}
        {mode !== 'account' && (
          <button className={cn('primary')} disabled={busy}>
            {busy ? 'Salvando…' : 'Salvar'}
          </button>
        )}
      </form>
    </Modal>
  );
}
