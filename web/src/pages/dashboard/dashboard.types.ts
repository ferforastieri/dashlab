export type DashboardApplication = {
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

export type DashboardWidget = { id: string; type: string; title: string; config: any };

export type DashboardLayout = {
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

export type DashboardData = {
  id: string;
  name: string;
  branding: any;
  applications: DashboardApplication[];
  widgets: DashboardWidget[];
  layouts: DashboardLayout[];
  layoutPreset: 'ZIMA';
};
