export const dashboardClassNames: Record<string, string> = {
  desktop: 'dash-desktop', brand: 'flex items-center gap-2.5', 'brand-mark': 'brand-mark',
  small: 'brand-mark-small', search: 'dash-search', 'header-tools': 'header-tools',
  'icon-button': 'icon-button', active: 'is-active', 'app-wrap': 'app-wrap', 'app-icon': 'app-icon',
  widget: 'widget-card', 'widget-title': 'widget-title', 'widget-values': 'widget-values',
  metric: 'metric', 'metric-chart': 'metric-chart',
  'item-control': 'hidden',
  'item-menu': 'absolute right-1 top-1 h-8 w-8 border-0 bg-transparent text-slate-300',
  context: 'context-menu',
  'widget-actions': 'absolute right-[7px] top-[5px] z-10 flex [&_button]:border-0 [&_button]:bg-transparent [&_button]:p-[5px] [&_button]:text-[#aeb9c7] [&_svg]:w-[14px]',
  'widget-delete': 'absolute left-[5px] top-[5px] z-10 border-0 bg-transparent p-2 text-inherit [&_svg]:w-[15px]',
  add: 'add-button', loading: 'loading-screen', overlay: 'modal-overlay',
  modal: 'modal-panel',
  close: 'absolute right-4 top-4 grid h-8 w-8 place-items-center border-0 bg-transparent text-slate-300',
  tabs: 'tab-list', primary: 'button-primary', secondary: 'button-secondary',
  danger: 'inline-flex h-11 items-center justify-center rounded-xl border border-red-400/30 bg-transparent px-3 text-red-300',
  solid: 'bg-red-500 text-white', link: 'button-link',
  error: 'text-sm text-red-300', check: 'flex items-center gap-2 [&>input]:h-4 [&>input]:w-4',
  'field-row': 'grid grid-cols-2 gap-3', account: 'grid gap-3',
  session: 'flex items-center justify-between text-xs text-slate-300',
  'confirm-overlay': 'z-40',
  'confirm-modal': 'block max-w-[430px] [&>p]:leading-relaxed [&>p]:text-[#aeb9c7]',
  'confirm-actions': 'mt-[22px] flex justify-end gap-2.5 [&>button]:min-w-[110px]', success: '',
};

export const dashboardCn = (...names: Array<string | false | null | undefined>) =>
  names.flatMap((name) => (name || '').split(' ')).map((name) => dashboardClassNames[name] || name).join(' ');
