export type DashboardApplication = {
  id: string;
  name: string;
  url: string;
  description?: string;
  icon?: string;
  category?: string;
  statusUrl?: string;
  deepLink?: string;
  visible?: boolean;
  sectionId?: string;
};

export type DashboardSection = { id: string; name: string; collapsed: boolean };

export type DashboardWidget = { id: string; type: string; title: string; config: any };

export type DashboardLayout = {
  id: string;
  kind: string;
  applicationId?: string;
  widgetId?: string;
  sectionId?: string;
  elementKey?: 'BRAND' | 'CLOCK' | 'WEATHER' | 'SEARCH' | 'ACTIONS' | 'ADD' | 'FOOTER';
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
  sections: DashboardSection[];
  widgets: DashboardWidget[];
  layouts: DashboardLayout[];
  layoutPreset: 'FREE';
};
