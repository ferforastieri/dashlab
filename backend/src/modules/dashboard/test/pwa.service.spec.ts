import { PwaService } from '../services/pwa.service';

describe('PwaService cache', () => {
  it('coalesces manifest reads and invalidates branding changes', async () => {
    const findUnique = jest.fn().mockResolvedValue({
      id: 'dashboard-1',
      name: 'Minha infra',
      branding: { favicon: '/api/assets/files/icon.png', accent: '#123456' },
    });
    const service = new PwaService({ dashboard: { findUnique } } as any);

    const [first, second] = await Promise.all([
      service.manifest('dashboard-1'),
      service.manifest('dashboard-1'),
    ]);

    expect(first).toBe(second);
    expect(findUnique).toHaveBeenCalledTimes(1);

    service.invalidate('dashboard-1');
    await service.manifest('dashboard-1');
    expect(findUnique).toHaveBeenCalledTimes(2);
  });
});
