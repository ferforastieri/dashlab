export const dashboardClassNames: Record<string, string> = {
  desktop: 'dash-desktop', brand: 'flex items-center gap-2.5', 'brand-mark': 'brand-mark',
  small: 'brand-mark-small', search: 'dash-search', 'header-tools': 'header-tools',
  'icon-button': 'icon-button', active: 'is-active', 'app-wrap': 'app-wrap', 'app-icon': 'app-icon',
  widget: 'widget-card', 'widget-title': 'widget-title', 'widget-values': 'widget-values',
  metric: 'metric', 'metric-chart': 'metric-chart',
  'item-control': 'hidden',
  'item-menu': 'ui-muted absolute right-1 top-1 h-8 w-8 border-0 bg-transparent',
  context: 'context-menu',
  'widget-actions': 'widget-actions',
  'widget-delete': 'absolute left-[5px] top-[5px] z-10 border-0 bg-transparent p-2 text-inherit [&_svg]:w-[15px]',
  add: 'add-button', loading: 'loading-screen', overlay: 'modal-overlay',
  modal: 'modal-panel',
  close: 'ui-muted absolute right-4 top-4 grid h-8 w-8 place-items-center border-0 bg-transparent',
  tabs: 'tab-list', primary: 'button-primary', secondary: 'button-secondary',
  danger: 'ui-danger inline-flex h-11 items-center justify-center rounded-xl border bg-transparent px-3',
  solid: 'ui-danger-solid', link: 'button-link',
  error: 'ui-error text-sm', check: 'flex items-center gap-2 [&>input]:h-4 [&>input]:w-4',
  'field-row': 'responsive-field-row', account: 'grid gap-3',
  session: 'ui-muted flex items-center justify-between text-xs',
  'confirm-overlay': 'z-40',
  'confirm-modal': 'confirm-modal block max-w-[430px] [&>p]:leading-relaxed',
  'confirm-actions': 'mt-[22px] flex justify-end gap-2.5 [&>button]:min-w-[110px]', success: '',
};

export const dashboardCn = (...names: Array<string | false | null | undefined>) =>
  names.flatMap((name) => (name || '').split(' ')).map((name) => dashboardClassNames[name] || name).join(' ');
