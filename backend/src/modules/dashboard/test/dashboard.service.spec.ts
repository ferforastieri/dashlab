import { NotFoundException } from '@nestjs/common';
import { DashboardService } from '../services/dashboard.service';

describe('DashboardService tenant isolation', () => {
  it('does not update an application owned by another user', async () => {
    const db: any = {
      application: { findFirst: jest.fn().mockResolvedValue(null), update: jest.fn() },
    };
    const service = new DashboardService(db);
    await expect(
      service.updateApp('user-a', 'app-b', { name: 'intrusion' } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(db.application.update).not.toHaveBeenCalled();
  });
  it('does not expose another users widget query', async () => {
    const db: any = { widget: { findFirst: jest.fn().mockResolvedValue(null) } };
    await expect(new DashboardService(db).promql('user-a', 'widget-b')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
  it('saves layout changes only in the active preset', async () => {
    const tx: any = { layoutItem: { deleteMany: jest.fn(), create: jest.fn() } };
    const db: any = {
      dashboard: { findUnique: jest.fn().mockResolvedValue({ id: 'd1', layoutPreset: 'FREE' }) },
      application: { findMany: jest.fn().mockResolvedValue([{ id: 'a1' }]) },
      widget: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn((fn: any) => fn(tx)),
    };
    await new DashboardService(db).saveLayout('u1', 'WEB', [
      { kind: 'APPLICATION', applicationId: 'a1', x: 3, y: 0, w: 2, h: 2 } as any,
    ]);
    expect(tx.layoutItem.deleteMany).toHaveBeenCalledWith({
      where: { dashboardId: 'd1', surface: 'WEB', preset: 'FREE' },
    });
    expect(tx.layoutItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ preset: 'FREE', applicationId: 'a1' }),
    });
  });
  it('returns stable empty series when Prometheus history is unavailable', async () => {
    const previous = global.fetch;
    const previousPrometheusUrl = process.env.PROMETHEUS_URL;
    process.env.PROMETHEUS_URL = 'http://prometheus.test';
    global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as any;
    const result = await new DashboardService({} as any).metricsHistory('15m');
    expect(result).toMatchObject({
      range: '15m',
      cpu: [],
      memory: [],
      disks: [],
      download: [],
      upload: [],
    });
    global.fetch = previous;
    if (previousPrometheusUrl) process.env.PROMETHEUS_URL = previousPrometheusUrl;
    else delete process.env.PROMETHEUS_URL;
  });
  it('keeps filesystem metrics separated by Prometheus instance', async () => {
    const previous = global.fetch;
    const previousPrometheusUrl = process.env.PROMETHEUS_URL;
    process.env.PROMETHEUS_URL = 'http://prometheus.test';
    global.fetch = jest.fn().mockImplementation((url: string) =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          data: {
            result: url.includes('node_filesystem')
              ? [
                  { metric: { instance: 'host-a:9100', mountpoint: '/', device: '/dev/sda1' }, value: [1, '45'] },
                  { metric: { instance: 'host-b:9100', mountpoint: '/', device: '/dev/sda1' }, value: [1, '72'] },
                ]
              : [{ value: [1, '1'] }],
          },
        }),
      }),
    ) as any;

    const result = await new DashboardService({} as any).metrics();

    expect(result.disks).toEqual([
      { instance: 'host-a:9100', name: '/', device: '/dev/sda1', value: 45 },
      { instance: 'host-b:9100', name: '/', device: '/dev/sda1', value: 72 },
    ]);
    expect((global.fetch as jest.Mock).mock.calls.some(([url]) =>
      decodeURIComponent(url).includes('mountpoint!~"/(boot|run)($|/)"'),
    )).toBe(true);
    global.fetch = previous;
    if (previousPrometheusUrl) process.env.PROMETHEUS_URL = previousPrometheusUrl;
    else delete process.env.PROMETHEUS_URL;
  });
});
