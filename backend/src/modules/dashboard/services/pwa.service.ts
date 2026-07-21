import { Injectable, NotFoundException } from '@nestjs/common';
import sharp from 'sharp';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

type DashboardBranding = {
  id: string;
  name: string;
  branding: Record<string, unknown>;
};

type CacheEntry<T> = { expiresAt: number; value: Promise<T> };

@Injectable()
export class PwaService {
  private readonly cacheTtl = 10 * 60 * 1000;
  private readonly dashboards = new Map<string, CacheEntry<DashboardBranding>>();
  private readonly manifests = new Map<string, CacheEntry<Record<string, unknown>>>();
  private readonly sources = new Map<string, CacheEntry<Buffer>>();
  private readonly icons = new Map<string, CacheEntry<Buffer>>();

  constructor(private db: PrismaService) {}

  manifest(dashboardId: string) {
    return this.cached(this.manifests, dashboardId, async () => {
      const dashboard = await this.dashboard(dashboardId);
      const branding = dashboard.branding;
      const name = String(branding.name || dashboard.name || 'DashLab').slice(0, 80);
      const backgroundColor = this.color(branding.backgroundColor, '#0b1017');
      const themeColor = this.color(branding.accent, backgroundColor);
      const hasCustomIcon = typeof branding.favicon === 'string' && branding.favicon.length > 0;
      const icon = (size: number, purpose: 'any' | 'maskable' = 'any') => ({
        src: hasCustomIcon
          ? `/api/pwa/${dashboard.id}/icon/${size}.png${purpose === 'maskable' ? '?maskable=true' : ''}`
          : `/icons/pwa${purpose === 'maskable' ? '-maskable' : ''}-${size}.png`,
        sizes: `${size}x${size}`,
        type: 'image/png',
        purpose,
      });
      return {
        name,
        short_name: name.slice(0, 24),
        description: 'Seu homelab, do seu jeito.',
        lang: 'pt-BR',
        id: `/?dashboard=${dashboard.id}`,
        start_url: `/?dashboard=${dashboard.id}`,
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: backgroundColor,
        theme_color: themeColor,
        icons: [icon(192), icon(512), icon(512, 'maskable')],
      };
    });
  }

  async icon(dashboardId: string, sizeValue: string, maskable: boolean) {
    const size = Number(sizeValue);
    if (![192, 512].includes(size)) throw new NotFoundException();
    const key = `${dashboardId}:${size}:${maskable ? 'maskable' : 'regular'}`;
    return this.cached(this.icons, key, async () => {
      const dashboard = await this.dashboard(dashboardId);
      const favicon = typeof dashboard.branding.favicon === 'string' ? dashboard.branding.favicon : '';
      const filename = favicon.match(/^\/api\/assets\/files\/([^/?#]+)$/)?.[1];
      if (!filename) throw new NotFoundException();
      const source = await this.source(dashboardId, filename);
      const contentSize = maskable ? Math.round(size * 0.72) : size;
      let pipeline = sharp(source).resize(contentSize, contentSize, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      });
      if (maskable) {
        const remaining = size - contentSize;
        pipeline = pipeline.extend({
          top: Math.floor(remaining / 2),
          bottom: Math.ceil(remaining / 2),
          left: Math.floor(remaining / 2),
          right: Math.ceil(remaining / 2),
          background: this.color(dashboard.branding.backgroundColor, '#0b1017'),
        });
      }
      return pipeline.png().toBuffer();
    });
  }

  invalidate(dashboardId: string) {
    this.dashboards.delete(dashboardId);
    this.manifests.delete(dashboardId);
    for (const key of this.sources.keys()) if (key.startsWith(`${dashboardId}:`)) this.sources.delete(key);
    for (const key of this.icons.keys()) if (key.startsWith(`${dashboardId}:`)) this.icons.delete(key);
  }

  private dashboard(dashboardId: string) {
    return this.cached(this.dashboards, dashboardId, async () => {
      const dashboard = await this.db.dashboard.findUnique({
        where: { id: dashboardId },
        select: { id: true, name: true, branding: true },
      });
      if (!dashboard) throw new NotFoundException();
      return {
        ...dashboard,
        branding: (dashboard.branding || {}) as Record<string, unknown>,
      };
    });
  }

  private source(dashboardId: string, filename: string) {
    const key = `${dashboardId}:${filename}`;
    return this.cached(this.sources, key, async () => {
      const asset = await this.db.asset.findFirst({
        where: { dashboardId, path: filename },
        select: { data: true },
      });
      if (!asset?.data) throw new NotFoundException();
      return Buffer.from(asset.data);
    });
  }

  private cached<T>(cache: Map<string, CacheEntry<T>>, key: string, load: () => Promise<T>) {
    const current = cache.get(key);
    if (current && current.expiresAt > Date.now()) return current.value;
    const value = load().catch((error) => {
      cache.delete(key);
      throw error;
    });
    cache.set(key, { expiresAt: Date.now() + this.cacheTtl, value });
    return value;
  }

  private color(value: unknown, fallback: string) {
    const color = String(value || '');
    return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
  }
}
