import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ChangePasswordDto, LoginDto, RegisterDto } from '../dto/auth.dto';

const branding = {
  name: 'DashLab',
  accent: '#ff7a1a',
  theme: 'dark',
  wallpaper: '',
  logo: '',
  favicon: '',
};
const apps = [
  ['Nextcloud', 'https://nextcloud.example.invalid', 'nextcloud'],
  ['Immich', 'https://immich.example.invalid', 'immich'],
  ['Jellyfin', 'https://jellyfin.example.invalid', 'jellyfin'],
  ['Atacte', 'https://atacte.example.invalid', 'shield-checkmark'],
  ['Gitea', 'https://gitea.example.invalid', 'git-branch'],
  ['Grafana', 'https://grafana.example.invalid', 'stats-chart'],
  ['AdGuard', 'https://adguard.example.invalid', 'shield'],
  ['Proxmox', 'https://proxmox.example.invalid', 'server'],
];

@Injectable()
export class AuthService {
  constructor(
    private db: PrismaService,
    private jwt: JwtService,
  ) {}
  async register(dto: RegisterDto) {
    const username = dto.username.toLowerCase();
    if (await this.db.user.findUnique({ where: { username } }))
      throw new ConflictException('Usuário já existe');
    const user = await this.db.user.create({
      data: {
        username,
        passwordHash: await argon2.hash(dto.password),
        dashboards: { create: { branding } },
      },
      include: { dashboards: true },
    });
    const dashboardId = user.dashboards[0].id;
    for (let i = 0; i < apps.length; i++) {
      const [name, url, icon] = apps[i];
      const app = await this.db.application.create({
        data: {
          name,
          url,
          icon,
          dashboardId,
          inDock: i < 4,
          category: i < 4 ? 'Aplicativos' : 'Administração',
        },
      });
      await this.db.layoutItem.createMany({
        data: [
          {
            surface: 'WEB',
            kind: 'APPLICATION',
            x: i % 4,
            y: Math.floor(i / 4),
            w: 1,
            h: 1,
            order: i,
            dashboardId,
            applicationId: app.id,
          },
          {
            surface: 'MOBILE',
            kind: 'APPLICATION',
            x: i % 3,
            y: Math.floor(i / 3),
            w: 1,
            h: 1,
            order: i,
            dashboardId,
            applicationId: app.id,
          },
        ],
      });
    }
    const presets: any[] = [
      ['Relógio', 'CLOCK', {}],
      ['Clima', 'WEATHER', {}],
      ['Pesquisa', 'SEARCH', { provider: 'google' }],
      ['Sistema', 'SYSTEM', {}],
      ['Discos', 'STORAGE', {}],
      ['Rede', 'NETWORK', {}],
    ];
    for (let i = 0; i < presets.length; i++) {
      const [title, type, config] = presets[i];
      const widget = await this.db.widget.create({
        data: { title, type, config, dashboardId },
      });
      await this.db.layoutItem.createMany({
        data: [
          {
            surface: 'WEB',
            kind: 'WIDGET',
            x: i % 3,
            y: 3 + Math.floor(i / 3),
            w: 2,
            h: 1,
            order: 100 + i,
            dashboardId,
            widgetId: widget.id,
          },
          {
            surface: 'MOBILE',
            kind: 'WIDGET',
            x: 0,
            y: 4 + i,
            w: 3,
            h: 1,
            order: 100 + i,
            dashboardId,
            widgetId: widget.id,
          },
        ],
      });
    }
    return this.issue(user.id, user.username, 'Conta criada com sucesso');
  }
  async login(dto: LoginDto) {
    const user = await this.db.user.findUnique({
      where: { username: dto.username.toLowerCase() },
    });
    if (!user || !(await argon2.verify(user.passwordHash, dto.password)))
      throw new UnauthorizedException('Usuário ou senha inválidos');
    return this.issue(user.id, user.username, 'Login realizado com sucesso');
  }
  async refresh(token: string) {
    const hash = createHash('sha256').update(token).digest('hex');
    const session = await this.db.session.findUnique({
      where: { tokenHash: hash },
      include: { user: true },
    });
    if (!session || session.expiresAt < new Date())
      throw new UnauthorizedException('Sessão expirada');
    await this.db.session.delete({ where: { id: session.id } });
    return this.issue(session.user.id, session.user.username, 'Sessão renovada');
  }
  async logout(token: string) {
    await this.db.session.deleteMany({
      where: { tokenHash: createHash('sha256').update(token).digest('hex') },
    });
    return { ok: true, message: 'Sessão encerrada com sucesso' };
  }
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.db.user.findUniqueOrThrow({
      where: { id: userId },
    });
    if (!(await argon2.verify(user.passwordHash, dto.currentPassword)))
      throw new UnauthorizedException('Senha atual inválida');
    await this.db.user.update({
      where: { id: userId },
      data: { passwordHash: await argon2.hash(dto.newPassword) },
    });
    await this.db.session.deleteMany({ where: { userId } });
    return { ok: true, message: 'Senha alterada com sucesso' };
  }
  async sessions(userId: string) {
    return this.db.session.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      select: { id: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }
  async revokeSession(userId: string, id: string) {
    await this.db.session.deleteMany({ where: { id, userId } });
    return { ok: true, message: 'Sessão revogada com sucesso' };
  }
  async logoutAll(userId: string) {
    await this.db.session.deleteMany({ where: { userId } });
    return { ok: true, message: 'Todas as sessões foram encerradas' };
  }
  async deleteAccount(userId: string, password: string) {
    const user = await this.db.user.findUniqueOrThrow({ where: { id: userId } });
    if (!(await argon2.verify(user.passwordHash, password)))
      throw new UnauthorizedException('Senha inválida');
    await this.db.user.delete({ where: { id: userId } });
    return { ok: true, message: 'Conta excluída com sucesso' };
  }
  private async issue(id: string, username: string, message: string) {
    const refreshToken = randomBytes(48).toString('base64url');
    await this.db.session.create({
      data: {
        userId: id,
        tokenHash: createHash('sha256').update(refreshToken).digest('hex'),
        expiresAt: new Date(Date.now() + 30 * 86400000),
      },
    });
    return {
      accessToken: await this.jwt.signAsync(
        { sub: id, username },
        { secret: process.env.JWT_SECRET, expiresIn: '15m' },
      ),
      refreshToken,
      user: { id, username },
      message,
    };
  }
}
