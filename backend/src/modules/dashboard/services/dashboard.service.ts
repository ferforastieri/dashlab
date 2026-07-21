import {
  BadGatewayException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  BrandingDto,
  CreateApplicationDto,
  CreateWidgetDto,
  LayoutItemDto,
  UpdateApplicationDto,
  UpdateWidgetDto,
} from '../dto/dashboard.dto';

@Injectable()
export class DashboardService {
  constructor(private db: PrismaService) {}
  private async dashboard(userId: string) {
    const d = await this.db.dashboard.findUnique({ where: { userId } });
    if (!d) throw new NotFoundException();
    return d;
  }
  async get(userId: string, surface: 'WEB' | 'MOBILE') {
    const d = await this.db.dashboard.findUniqueOrThrow({
      where: { userId },
      include: {
        applications: { orderBy: { createdAt: 'asc' } },
        widgets: { orderBy: { createdAt: 'asc' } },
        layouts: { where: { surface, preset: 'FREE' }, orderBy: { order: 'asc' } },
      },
    });
    const effectivePreset = surface === 'MOBILE' ? 'ZIMA' : d.layoutPreset;
    if (effectivePreset !== 'FREE')
      d.layouts = await this.db.layoutItem.findMany({
        where: { dashboardId: d.id, surface, preset: effectivePreset },
        orderBy: { order: 'asc' },
      });
    if (!d.layouts.length) {
      await this.seedPreset(d.id, effectivePreset as any, surface);
      d.layouts = await this.db.layoutItem.findMany({
        where: { dashboardId: d.id, surface, preset: effectivePreset },
        orderBy: { order: 'asc' },
      });
    }
    if (surface === 'MOBILE') d.layoutPreset = 'ZIMA';
    return d;
  }
  async branding(userId: string, data: BrandingDto) {
    const d = await this.dashboard(userId);
    const current = (d.branding || {}) as Record<string, unknown>;
    const result = await this.db.dashboard.update({
      where: { id: d.id },
      data: { name: data.name || d.name, branding: { ...current, ...data } },
    });
    return { ...result, message: 'Personalização salva com sucesso' };
  }
  async createApp(userId: string, data: CreateApplicationDto) {
    const d = await this.dashboard(userId);
    const app = await this.db.application.create({
      data: {
        dashboardId: d.id,
        name: String(data.name).slice(0, 80),
        url: String(data.url),
        description: data.description,
        deepLink: data.deepLink,
        icon: data.icon,
        category: data.category,
        statusUrl: data.statusUrl,
        inDock: !!data.inDock,
      },
    });
    await this.addLayouts(d.id, 'APPLICATION', app.id);
    return { ...app, message: 'Aplicativo criado com sucesso' };
  }
  async updateApp(userId: string, id: string, data: UpdateApplicationDto) {
    await this.assertApp(userId, id);
    const result = await this.db.application.update({
      where: { id },
      data: {
        name: data.name,
        url: data.url,
        description: data.description,
        deepLink: data.deepLink,
        icon: data.icon,
        category: data.category,
        statusUrl: data.statusUrl,
        inDock: data.inDock,
        visible: data.visible,
      },
    });
    return { ...result, message: 'Aplicativo atualizado com sucesso' };
  }
  async deleteApp(userId: string, id: string) {
    await this.assertApp(userId, id);
    await this.db.application.delete({ where: { id } });
    return { ok: true, message: 'Aplicativo excluído com sucesso' };
  }
  async createWidget(userId: string, data: CreateWidgetDto) {
    const d = await this.dashboard(userId);
    const allowed = [
      'SYSTEM',
      'STORAGE',
      'NETWORK',
      'CLOCK',
      'WEATHER',
      'SEARCH',
      'STATUS',
      'PROMQL',
    ];
    if (!allowed.includes(data.type)) throw new ForbiddenException('Tipo inválido');
    const widget = await this.db.widget.create({
      data: {
        dashboardId: d.id,
        title: String(data.title).slice(0, 80),
        type: data.type,
        config: (data.config || {}) as any,
      },
    });
    await this.addLayouts(d.id, 'WIDGET', widget.id);
    return { ...widget, message: 'Widget criado com sucesso' };
  }
  async updateWidget(userId: string, id: string, data: UpdateWidgetDto) {
    await this.assertWidget(userId, id);
    const result = await this.db.widget.update({
      where: { id },
      data: {
        title: data.title,
        type: data.type,
        config: data.config as any,
        visible: data.visible,
      },
    });
    return { ...result, message: 'Widget atualizado com sucesso' };
  }
  async deleteWidget(userId: string, id: string) {
    await this.assertWidget(userId, id);
    await this.db.widget.delete({ where: { id } });
    return { ok: true, message: 'Widget excluído com sucesso' };
  }
  async saveLayout(userId: string, surface: 'WEB' | 'MOBILE', items: LayoutItemDto[]) {
    const d = await this.dashboard(userId);
    const effectivePreset = surface === 'MOBILE' ? 'ZIMA' : d.layoutPreset;
    const ownedApps = new Set(
      (
        await this.db.application.findMany({
          where: { dashboardId: d.id },
          select: { id: true },
        })
      ).map((x) => x.id),
    );
    const ownedWidgets = new Set(
      (
        await this.db.widget.findMany({
          where: { dashboardId: d.id },
          select: { id: true },
        })
      ).map((x) => x.id),
    );
    await this.db.$transaction(async (tx) => {
      await tx.layoutItem.deleteMany({
        where: { dashboardId: d.id, surface, preset: effectivePreset },
      });
      for (const [order, item] of items.entries()) {
        const isApp = item.kind === 'APPLICATION';
        const target = isApp ? item.applicationId : item.widgetId;
        if (!target || !(isApp ? ownedApps : ownedWidgets).has(target))
          throw new ForbiddenException();
        await tx.layoutItem.create({
          data: {
            dashboardId: d.id,
            surface,
            preset: effectivePreset,
            kind: item.kind,
            x: +item.x || 0,
            y: +item.y || 0,
            w: Math.max(1, +item.w || 1),
            h: Math.max(1, +item.h || 1),
            order,
            applicationId: isApp ? target : null,
            widgetId: isApp ? null : target,
          },
        });
      }
    });
    return { ok: true, message: 'Organização salva com sucesso' };
  }
  async metrics() {
    const base = process.env.PROMETHEUS_URL || 'http://127.0.0.1:9090';
    const queries: any = {
      cpu: '100 - avg(rate(node_cpu_seconds_total{tipo="Servidor",mode="idle"}[5m])) * 100',
      memory:
        '(1-node_memory_MemAvailable_bytes{tipo="Servidor"}/node_memory_MemTotal_bytes{tipo="Servidor"})*100',
      disk: '(1-node_filesystem_avail_bytes{tipo="Servidor",mountpoint="/"}/node_filesystem_size_bytes{tipo="Servidor",mountpoint="/"})*100',
      download: 'sum(rate(node_network_receive_bytes_total{tipo="Servidor",device!="lo"}[5m]))',
      upload: 'sum(rate(node_network_transmit_bytes_total{tipo="Servidor",device!="lo"}[5m]))',
    };
    const result: any = {};
    await Promise.all(
      Object.entries(queries).map(async ([key, q]) => {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 4000);
          const response = await fetch(
            `${base}/api/v1/query?query=${encodeURIComponent(q as string)}`,
            { signal: controller.signal },
          );
          const json: any = await response.json();
          clearTimeout(timer);
          result[key] = Number(json?.data?.result?.[0]?.value?.[1] || 0);
        } catch {
          result[key] = null;
        }
      }),
    );
    return result;
  }
  async metricsHistory(range: '15m' | '1h' | '6h' | '24h' = '1h') {
    const base = process.env.PROMETHEUS_URL || 'http://127.0.0.1:9090',
      seconds = { '15m': 900, '1h': 3600, '6h': 21600, '24h': 86400 }[range],
      end = Math.floor(Date.now() / 1000),
      start = end - seconds,
      step = Math.max(15, Math.floor(seconds / 60));
    const queries: any = {
      cpu: '100 - avg(rate(node_cpu_seconds_total{tipo="Servidor",mode="idle"}[5m])) * 100',
      memory:
        '(1-node_memory_MemAvailable_bytes{tipo="Servidor"}/node_memory_MemTotal_bytes{tipo="Servidor"})*100',
      disk: '(1-node_filesystem_avail_bytes{tipo="Servidor",mountpoint="/"}/node_filesystem_size_bytes{tipo="Servidor",mountpoint="/"})*100',
      download: 'sum(rate(node_network_receive_bytes_total{tipo="Servidor",device!="lo"}[5m]))',
      upload: 'sum(rate(node_network_transmit_bytes_total{tipo="Servidor",device!="lo"}[5m]))',
    };
    const result: any = { range };
    await Promise.all(
      Object.entries(queries).map(async ([key, q]) => {
        try {
          const json: any = await this.fetchJson(
            `${base}/api/v1/query_range?query=${encodeURIComponent(q as string)}&start=${start}&end=${end}&step=${step}`,
            5000,
          );
          result[key] = (json?.data?.result?.[0]?.values || []).map(
            ([timestamp, value]: [number, string]) => ({ timestamp, value: Number(value) }),
          );
        } catch {
          result[key] = [];
        }
      }),
    );
    return result;
  }
  async promql(userId: string, id: string) {
    const widget = await this.assertWidget(userId, id);
    if (widget.type !== 'PROMQL') throw new ForbiddenException();
    const query = String((widget.config as any)?.query || '');
    if (!query || query.length > 1000) throw new ForbiddenException('Consulta inválida');
    const base = process.env.PROMETHEUS_URL || '';
    try {
      return await this.fetchJson(`${base}/api/v1/query?query=${encodeURIComponent(query)}`, 5000);
    } catch {
      throw new BadGatewayException('Prometheus indisponível');
    }
  }
  async statuses(userId: string) {
    const d = await this.dashboard(userId);
    const apps = await this.db.application.findMany({
      where: { dashboardId: d.id, visible: true },
      select: { id: true, url: true, statusUrl: true },
    });
    return Promise.all(
      apps.map(async (app) => {
        const started = Date.now();
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 3500);
          const response = await fetch(app.statusUrl || app.url, {
            method: 'HEAD',
            redirect: 'manual',
            signal: controller.signal,
          });
          clearTimeout(timer);
          return {
            id: app.id,
            online: response.status < 500,
            status: response.status,
            latency: Date.now() - started,
          };
        } catch {
          return { id: app.id, online: false, status: null, latency: Date.now() - started };
        }
      }),
    );
  }
  async weather(latitude: number, longitude: number) {
    const query = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current: 'temperature_2m,apparent_temperature,weather_code,is_day',
      timezone: 'auto',
      forecast_days: '1',
    });
    try {
      return await this.fetchJson(`https://api.open-meteo.com/v1/forecast?${query}`, 5000);
    } catch {
      throw new BadGatewayException('Serviço de clima indisponível');
    }
  }
  presets() {
    return [
      {
        id: 'FREE',
        name: 'Livre',
        description: 'Grade flexível com aplicativos e widgets misturados',
      },
      { id: 'ZIMA', name: 'Zima', description: 'Widgets laterais e aplicativos na área principal' },
      { id: 'FOCUS', name: 'Foco', description: 'Aplicativos em destaque e widgets abaixo' },
      { id: 'COMPACT', name: 'Compacto', description: 'Mais conteúdo usando menos espaço' },
    ];
  }
  async selectPreset(
    userId: string,
    preset: 'FREE' | 'ZIMA' | 'FOCUS' | 'COMPACT',
    surface: 'WEB' | 'MOBILE',
  ) {
    const d = await this.dashboard(userId);
    if (!(await this.db.layoutItem.count({ where: { dashboardId: d.id, preset, surface } })))
      await this.seedPreset(d.id, preset, surface);
    await this.db.dashboard.update({ where: { id: d.id }, data: { layoutPreset: preset } });
    return {
      ok: true,
      message: `Layout ${this.presets().find((x) => x.id === preset)?.name} ativado`,
    };
  }
  async resetPreset(
    userId: string,
    preset: 'FREE' | 'ZIMA' | 'FOCUS' | 'COMPACT',
    surface: 'WEB' | 'MOBILE',
  ) {
    const d = await this.dashboard(userId);
    await this.db.layoutItem.deleteMany({ where: { dashboardId: d.id, preset, surface } });
    await this.seedPreset(d.id, preset, surface);
    return { ok: true, message: 'Layout restaurado ao padrão' };
  }
  private async seedPreset(
    dashboardId: string,
    preset: 'FREE' | 'ZIMA' | 'FOCUS' | 'COMPACT',
    surface: 'WEB' | 'MOBILE',
  ) {
    const apps = await this.db.application.findMany({
      where: { dashboardId },
      orderBy: { createdAt: 'asc' },
    });
    const widgets = await this.db.widget.findMany({
      where: { dashboardId },
      orderBy: { createdAt: 'asc' },
    });
    const mobile = surface === 'MOBILE';
    const items: any[] = [];
    const push = (
      kind: 'APPLICATION' | 'WIDGET',
      id: string,
      order: number,
      x: number,
      y: number,
      w: number,
      h: number,
    ) =>
      items.push({
        dashboardId,
        surface,
        preset,
        kind,
        order,
        x,
        y,
        w,
        h,
        applicationId: kind === 'APPLICATION' ? id : null,
        widgetId: kind === 'WIDGET' ? id : null,
      });
    if (preset === 'ZIMA' && !mobile) {
      widgets.forEach((w, i) =>
        push('WIDGET', w.id, i, 0, i + (i > 3 ? 1 : 0), 3, i === 3 ? 2 : 1),
      );
      apps.forEach((a, i) =>
        push('APPLICATION', a.id, 100 + i, 3 + (i % 5) * 2, Math.floor(i / 5) * 2, 2, 2),
      );
    } else if (preset === 'FOCUS') {
      apps.forEach((a, i) =>
        push(
          'APPLICATION',
          a.id,
          i,
          (i % (mobile ? 3 : 4)) * (mobile ? 2 : 3),
          Math.floor(i / (mobile ? 3 : 4)) * 2,
          mobile ? 2 : 3,
          2,
        ),
      );
      widgets.forEach((w, i) =>
        push(
          'WIDGET',
          w.id,
          100 + i,
          (i % (mobile ? 1 : 3)) * (mobile ? 6 : 4),
          6 + Math.floor(i / (mobile ? 1 : 3)) * 2,
          mobile ? 6 : 4,
          2,
        ),
      );
    } else if (preset === 'COMPACT') {
      apps.forEach((a, i) =>
        push(
          'APPLICATION',
          a.id,
          i,
          (i % (mobile ? 4 : 6)) * (mobile ? 1 : 2),
          Math.floor(i / (mobile ? 4 : 6)),
          mobile ? 1 : 2,
          1,
        ),
      );
      widgets.forEach((w, i) =>
        push(
          'WIDGET',
          w.id,
          100 + i,
          (i % (mobile ? 2 : 4)) * (mobile ? 2 : 3),
          4 + Math.floor(i / (mobile ? 2 : 4)),
          mobile ? 2 : 3,
          1,
        ),
      );
    } else {
      apps.forEach((a, i) =>
        push('APPLICATION', a.id, i, i % (mobile ? 3 : 4), Math.floor(i / (mobile ? 3 : 4)), 1, 1),
      );
      widgets.forEach((w, i) =>
        push(
          'WIDGET',
          w.id,
          100 + i,
          (i % (mobile ? 1 : 3)) * (mobile ? 3 : 4),
          3 + Math.floor(i / (mobile ? 1 : 3)),
          mobile ? 3 : 4,
          1,
        ),
      );
    }
    if (items.length) await this.db.layoutItem.createMany({ data: items });
  }
  private async fetchJson(url: string, timeout: number) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(String(response.status));
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }
  private async assertApp(userId: string, id: string) {
    const x = await this.db.application.findFirst({
      where: { id, dashboard: { userId } },
    });
    if (!x) throw new NotFoundException();
    return x;
  }
  private async assertWidget(userId: string, id: string) {
    const x = await this.db.widget.findFirst({
      where: { id, dashboard: { userId } },
    });
    if (!x) throw new NotFoundException();
    return x;
  }
  private async addLayouts(dashboardId: string, kind: 'APPLICATION' | 'WIDGET', id: string) {
    const data: any[] = [];
    for (const preset of ['FREE', 'ZIMA', 'FOCUS', 'COMPACT'] as const)
      for (const surface of ['WEB', 'MOBILE'] as const) {
        const n = await this.db.layoutItem.count({ where: { dashboardId, preset, surface, kind } }),
          mobile = surface === 'MOBILE';
        let x = 0,
          y = 0,
          w = 1,
          h = 1;
        if (kind === 'APPLICATION') {
          if (preset === 'ZIMA' && !mobile) {
            x = 3 + (n % 5) * 2;
            y = Math.floor(n / 5) * 2;
            w = 2;
            h = 2;
          } else if (preset === 'FOCUS') {
            x = (n % (mobile ? 3 : 4)) * (mobile ? 2 : 3);
            y = Math.floor(n / (mobile ? 3 : 4)) * 2;
            w = mobile ? 2 : 3;
            h = 2;
          } else if (preset === 'COMPACT') {
            x = (n % (mobile ? 4 : 6)) * (mobile ? 1 : 2);
            y = Math.floor(n / (mobile ? 4 : 6));
            w = mobile ? 1 : 2;
          } else {
            x = n % (mobile ? 3 : 4);
            y = Math.floor(n / (mobile ? 3 : 4));
          }
        } else {
          if (preset === 'ZIMA' && !mobile) {
            x = 0;
            y = n + (n > 3 ? 1 : 0);
            w = 3;
            h = n === 3 ? 2 : 1;
          } else if (preset === 'FOCUS') {
            x = (n % (mobile ? 1 : 3)) * (mobile ? 6 : 4);
            y = 6 + Math.floor(n / (mobile ? 1 : 3)) * 2;
            w = mobile ? 6 : 4;
            h = 2;
          } else if (preset === 'COMPACT') {
            x = (n % (mobile ? 2 : 4)) * (mobile ? 2 : 3);
            y = 4 + Math.floor(n / (mobile ? 2 : 4));
            w = mobile ? 2 : 3;
          } else {
            x = (n % (mobile ? 1 : 3)) * (mobile ? 3 : 4);
            y = 3 + Math.floor(n / (mobile ? 1 : 3));
            w = mobile ? 3 : 4;
          }
        }
        data.push({
          dashboardId,
          surface,
          preset,
          kind,
          order: kind === 'APPLICATION' ? n : 100 + n,
          x,
          y,
          w,
          h,
          applicationId: kind === 'APPLICATION' ? id : null,
          widgetId: kind === 'WIDGET' ? id : null,
        });
      }
    await this.db.layoutItem.createMany({ data });
  }
}
