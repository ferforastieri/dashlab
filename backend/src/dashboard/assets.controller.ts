import { BadRequestException, Controller, Delete, Param, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync, unlinkSync } from 'fs';
import { randomUUID } from 'crypto';
import { AuthRequest, JwtAuthGuard } from '../auth/jwt.guard';
import { PrismaService } from '../prisma/prisma.service';

const uploadDir = join(process.cwd(), process.env.UPLOAD_DIR || 'uploads');
mkdirSync(uploadDir, { recursive: true });

@Controller('assets')
@UseGuards(JwtAuthGuard)
export class AssetsController {
  constructor(private db: PrismaService) {}
  @Post()
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({ destination: uploadDir, filename: (_r, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`) }),
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter: (_r, file, cb) => cb(file.mimetype.startsWith('image/') && !file.mimetype.includes('svg') ? null : new BadRequestException('Envie uma imagem PNG, JPG, WebP ou GIF'), file.mimetype.startsWith('image/') && !file.mimetype.includes('svg')),
  }))
  async upload(@Req() req: AuthRequest, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Arquivo ausente');
    const dashboard = await this.db.dashboard.findUniqueOrThrow({ where: { userId: req.user.sub } });
    const asset = await this.db.asset.create({ data: { dashboardId: dashboard.id, name: file.originalname.slice(0,120), mimeType: file.mimetype, path: file.filename } });
    return { ...asset, url: `/api/assets/files/${file.filename}` };
  }
  @Delete(':id')
  async remove(@Req() req: AuthRequest, @Param('id') id: string) {
    const asset = await this.db.asset.findFirst({ where: { id, dashboard: { userId: req.user.sub } } });
    if (!asset) return { ok: true };
    await this.db.asset.delete({ where: { id } });
    try { unlinkSync(join(uploadDir, asset.path)); } catch {}
    return { ok: true };
  }
}
