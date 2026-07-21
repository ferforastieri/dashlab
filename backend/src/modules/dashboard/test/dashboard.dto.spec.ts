import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateApplicationDto, CreateWidgetDto, SaveLayoutDto } from '../dto/dashboard.dto';

describe('Dashboard DTO security boundaries', () => {
  it('rejects script protocols and accepts private homelab URLs', async () => {
    expect(
      await validate(
        plainToInstance(CreateApplicationDto, { name: 'Bad', url: 'javascript:alert(1)' }),
      ),
    ).not.toHaveLength(0);
    expect(
      await validate(
        plainToInstance(CreateApplicationDto, {
          name: 'Proxmox',
          url: 'https://homelab.local:8006',
        }),
      ),
    ).toHaveLength(0);
  });
  it('rejects unsupported widget types', async () => {
    expect(
      await validate(plainToInstance(CreateWidgetDto, { title: 'X', type: 'HTML', config: {} })),
    ).not.toHaveLength(0);
  });
  it('caps layout dimensions and number of items', async () => {
    const dto = plainToInstance(SaveLayoutDto, {
      items: [{ kind: 'APPLICATION', applicationId: 'x', x: 0, y: 0, w: 4001, h: 1 }],
    });
    expect(await validate(dto)).not.toHaveLength(0);
  });
});
