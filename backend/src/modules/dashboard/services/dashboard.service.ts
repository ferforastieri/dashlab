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
  CreateSectionDto,
  CreateWidgetDto,
  LayoutItemDto,
  UpdateApplicationDto,
  UpdateSectionDto,
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
    const preset = surface === 'WEB' ? 'FREE' : 'ZIMA';
    const d = await this.db.dashboard.findUniqueOrThrow({
      where: { userId },
      include: {
        applications: { orderBy: { createdAt: 'asc' } },
        sections: { orderBy: { createdAt: 'asc' } },
        widgets: { orderBy: { createdAt: 'asc' } },
        layouts: { where: { surface, preset }, orderBy: { order: 'asc' } },
      },
    });
    if (!d.layouts.length) {
      await this.seedPreset(d.id, surface);
      d.layouts = await this.db.layoutItem.findMany({
        where: { dashboardId: d.id, surface, preset },
        orderBy: { order: 'asc' },
      });
    }
    d.layoutPreset = preset;
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
    if (data.sectionId) await this.assertSection(userId, data.sectionId);
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
        sectionId: data.sectionId === undefined ? undefined : data.sectionId || null,
      },
    });
    await this.addLayouts(d.id, 'APPLICATION', app.id);
    return { ...app, message: 'Aplicativo criado com sucesso' };
  }
  async updateApp(userId: string, id: string, data: UpdateApplicationDto) {
    await this.assertApp(userId, id);
    if (data.sectionId) await this.assertSection(userId, data.sectionId);
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
        visible: data.visible,
        sectionId: data.sectionId === undefined ? undefined : data.sectionId || null,
      },
    });
    return { ...result, message: 'Aplicativo atualizado com sucesso' };
  }
  async deleteApp(userId: string, id: string) {
    await this.assertApp(userId, id);
    await this.db.application.delete({ where: { id } });
    return { ok: true, message: 'Aplicativo excluído com sucesso' };
  }
  async createSection(userId: string, data: CreateSectionDto) {
    const d = await this.dashboard(userId);
    const section = await this.db.section.create({
      data: { dashboardId: d.id, name: data.name.slice(0, 80) },
    });
    await this.addLayouts(d.id, 'SECTION', section.id);
    return { ...section, message: 'Seção criada com sucesso' };
  }
  async updateSection(userId: string, id: string, data: UpdateSectionDto) {
    await this.assertSection(userId, id);
    const section = await this.db.section.update({ where: { id }, data: { name: data.name } });
    return { ...section, message: 'Seção atualizada com sucesso' };
  }
  async deleteSection(userId: string, id: string) {
    await this.assertSection(userId, id);
    await this.db.section.delete({ where: { id } });
    return { ok: true, message: 'Seção excluída com sucesso' };
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
      'DIVIDER',
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
    await this.addLayouts(d.id, 'WIDGET', widget.id, data.type);
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
    const preset = surface === 'WEB' ? 'FREE' : 'ZIMA';
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
    const ownedSections = new Set(
      (await this.db.section.findMany({ where: { dashboardId: d.id }, select: { id: true } }))
        .map((section) => section.id),
    );
    await this.db.$transaction(async (tx) => {
      await tx.layoutItem.deleteMany({
        where: { dashboardId: d.id, surface, preset },
      });
      for (const [order, item] of items.entries()) {
        const isApp = item.kind === 'APPLICATION';
        const isWidget = item.kind === 'WIDGET';
        const isSection = item.kind === 'SECTION';
        const target = isApp ? item.applicationId : isWidget ? item.widgetId : isSection ? item.sectionId : item.elementKey;
        const allowedElements = ['BRAND', 'CLOCK', 'WEATHER', 'SEARCH', 'ACTIONS', 'ADD', 'FOOTER'];
        if (!target || (isApp && !ownedApps.has(target)) || (isWidget && !ownedWidgets.has(target)) || (isSection && !ownedSections.has(target)) || (!isApp && !isWidget && !isSection && !allowedElements.includes(target))) throw new ForbiddenException();
        await tx.layoutItem.create({
          data: {
            dashboardId: d.id,
            surface,
            preset,
            kind: item.kind,
            x: +item.x || 0,
            y: +item.y || 0,
            w: Math.max(1, +item.w || 1),
            h: Math.max(1, +item.h || 1),
            order,
            applicationId: isApp ? target : null,
            widgetId: isWidget ? target : null,
            sectionId: isSection ? target : null,
            elementKey: !isApp && !isWidget && !isSection ? target : null,
          },
        });
      }
    });
    return { ok: true, message: 'Organização salva com sucesso' };
  }
  async metrics() {
    const base = process.env.PROMETHEUS_URL;
    if (!base) throw new BadGatewayException('Prometheus não configurado');
    const queries: any = {
      cpu: '100 - avg(rate(node_cpu_seconds_total{tipo="Servidor",mode="idle"}[5m])) * 100',
      memory:
        '(1-node_memory_MemAvailable_bytes{tipo="Servidor"}/node_memory_MemTotal_bytes{tipo="Servidor"})*100',
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
    const physical = 'device=~"nvme[0-9]+n[0-9]+|sd[a-z]+"';
    const diskQueries = {
      info: `node_disk_info{tipo="Servidor",${physical}}`,
      utilization: `rate(node_disk_io_time_seconds_total{tipo="Servidor",${physical}}[5m])*100`,
      read: `rate(node_disk_read_bytes_total{tipo="Servidor",${physical}}[5m])`,
      write: `rate(node_disk_written_bytes_total{tipo="Servidor",${physical}}[5m])`,
      temperature: 'smartmon_temperature_celsius_raw_value{tipo="Servidor"}',
      health: 'smartmon_device_smart_healthy{tipo="Servidor"}',
    };
    try {
      const entries = await Promise.all(Object.entries(diskQueries).map(async ([key, query]) => {
        const json: any = await this.fetchJson(
          `${base}/api/v1/query?query=${encodeURIComponent(query)}`,
          4000,
        );
        return [key, json?.data?.result || []] as const;
      }));
      const series = Object.fromEntries(entries) as Record<string, any[]>;
      const normalize = (value: string) => value.replace('/dev/', '').replace(/^nvme(\d+)$/, 'nvme$1n1');
      const byDevice = (items: any[]) => new Map(items.map((entry) => [
        normalize(String(entry.metric?.device || entry.metric?.disk || '')),
        entry,
      ]));
      const utilization = byDevice(series.utilization);
      const read = byDevice(series.read);
      const write = byDevice(series.write);
      const temperature = byDevice(series.temperature);
      const health = byDevice(series.health);
      result.disks = series.info.map((entry) => {
        const device = String(entry.metric.device);
        return {
          device,
          model: entry.metric.model || device,
          value: Number(utilization.get(device)?.value?.[1] || 0),
          read: Number(read.get(device)?.value?.[1] || 0),
          write: Number(write.get(device)?.value?.[1] || 0),
          temperature: temperature.has(device)
            ? Number(temperature.get(device)?.value?.[1])
            : null,
          healthy: health.has(device)
            ? Number(health.get(device)?.value?.[1]) === 1
            : null,
        };
      });
    } catch {
      result.disks = [];
    }
    return result;
  }
  async metricsHistory(range: '15m' | '1h' | '6h' | '24h' = '1h') {
    const base = process.env.PROMETHEUS_URL;
    if (!base) throw new BadGatewayException('Prometheus não configurado');
    const
      seconds = { '15m': 900, '1h': 3600, '6h': 21600, '24h': 86400 }[range],
      end = Math.floor(Date.now() / 1000),
      start = end - seconds,
      step = Math.max(15, Math.floor(seconds / 60));
    const queries: any = {
      cpu: '100 - avg(rate(node_cpu_seconds_total{tipo="Servidor",mode="idle"}[5m])) * 100',
      memory:
        '(1-node_memory_MemAvailable_bytes{tipo="Servidor"}/node_memory_MemTotal_bytes{tipo="Servidor"})*100',
      disks: 'rate(node_disk_io_time_seconds_total{tipo="Servidor",device=~"nvme[0-9]+n[0-9]+|sd[a-z]+"}[5m])*100',
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
          result[key] = key === 'disks'
            ? (json?.data?.result || []).map((entry: any) => ({
                name: entry.metric?.device || 'Disco',
                device: entry.metric?.device || '',
                instance: entry.metric?.instance || entry.metric?.nodename || '',
                points: (entry.values || []).map(([timestamp, value]: [number, string]) => ({
                  timestamp,
                  value: Number(value),
                })),
              }))
            : (json?.data?.result?.[0]?.values || []).map(
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
            method: 'GET',
            redirect: 'manual',
            signal: controller.signal,
          });
          await response.body?.cancel();
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
  private async seedPreset(dashboardId: string, surface: 'WEB' | 'MOBILE') {
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
        preset: surface === 'WEB' ? 'FREE' : 'ZIMA',
        kind,
        order,
        x,
        y,
        w,
        h,
        applicationId: kind === 'APPLICATION' ? id : null,
        widgetId: kind === 'WIDGET' ? id : null,
      });
    if (!mobile) {
      widgets.forEach((w, i) => push('WIDGET', w.id, i, 0, i * 132, 340, 116));
      apps.forEach((a, i) =>
        push('APPLICATION', a.id, 100 + i, 380 + (i % 4) * 126, Math.floor(i / 4) * 126, 112, 112),
      );
      const elements = [
        ['BRAND', 0, 4, 230, 64], ['CLOCK', 250, 4, 100, 64],
        ['WEATHER', 370, 4, 210, 64], ['SEARCH', 600, 12, 480, 44],
        ['ACTIONS', 1100, 8, 160, 52], ['ADD', 1280, 8, 52, 52],
        ['FOOTER', 0, 820, 1332, 30],
      ];
      elements.forEach(([elementKey, x, y, w, h], index) => items.push({
        dashboardId, surface, preset: 'FREE', kind: 'DASHBOARD_ELEMENT', elementKey,
        order: 1000 + index, x, y, w, h,
      }));
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
  private async assertSection(userId: string, id: string) {
    const section = await this.db.section.findFirst({ where: { id, dashboard: { userId } } });
    if (!section) throw new NotFoundException();
    return section;
  }
  private async addLayouts(
    dashboardId: string,
    kind: 'APPLICATION' | 'WIDGET' | 'SECTION',
    id: string,
    widgetType?: string,
  ) {
    const data: any[] = [];
    for (const surface of ['WEB', 'MOBILE'] as const) {
      const n = await this.db.layoutItem.count({
        where: { dashboardId, preset: surface === 'WEB' ? 'FREE' : 'ZIMA', surface, kind },
      });
      const mobile = surface === 'MOBILE';
      let x: number, y: number, w: number, h: number;
      if (kind === 'APPLICATION') {
        if (mobile) {
          x = n % 3;
          y = Math.floor(n / 3);
          w = 1;
          h = 1;
        } else {
          x = 380 + (n % 4) * 126;
          y = Math.floor(n / 4) * 126;
          w = 112;
          h = 112;
        }
      } else if (kind === 'SECTION') {
        x = mobile ? 0 : 360;
        y = mobile ? 3 + n : n * 260;
        w = mobile ? 3 : 520;
        h = mobile ? 2 : 240;
      } else if (widgetType === 'DIVIDER') {
        x = 0;
        y = mobile ? 3 + n : n * 132;
        w = mobile ? 3 : 760;
        h = mobile ? 1 : 32;
      } else if (mobile) {
        x = 0;
        y = 3 + n;
        w = 3;
        h = 1;
      } else {
        x = 0;
        y = n * 132;
        w = 340;
        h = 116;
      }
      data.push({
        dashboardId,
        surface,
        preset: surface === 'WEB' ? 'FREE' : 'ZIMA',
        kind,
        order: kind === 'APPLICATION' ? n : 100 + n,
        x,
        y,
        w,
        h,
        applicationId: kind === 'APPLICATION' ? id : null,
        widgetId: kind === 'WIDGET' ? id : null,
        sectionId: kind === 'SECTION' ? id : null,
      });
    }
    await this.db.layoutItem.createMany({ data });
  }
}
