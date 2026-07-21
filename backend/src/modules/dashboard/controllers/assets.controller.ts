import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  OnModuleInit,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname, join } from 'path';
import { readFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { Response } from 'express';
import { AuthRequest, JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

const uploadDir = join(process.cwd(), process.env.UPLOAD_DIR || 'uploads');

@Controller('assets')
export class AssetsController implements OnModuleInit {
  constructor(private db: PrismaService) {}

  async onModuleInit() {
    const legacyAssets = await this.db.asset.findMany({ where: { data: null } });
    await Promise.all(legacyAssets.map(async (asset) => {
      try {
        const data = await readFile(join(uploadDir, asset.path));
        await this.db.asset.update({ where: { id: asset.id }, data: { data } });
      } catch {}
    }));
  }

  @Get('files/:filename')
  async file(@Param('filename') filename: string, @Res() response: Response) {
    const asset = await this.db.asset.findFirst({ where: { path: filename } });
    if (!asset) return response.sendStatus(404);
    let data = asset.data;
    if (!data) {
      try {
        data = await readFile(join(uploadDir, asset.path));
        await this.db.asset.update({ where: { id: asset.id }, data: { data } });
      } catch {
        return response.sendStatus(404);
      }
    }
    response.type(asset.mimeType);
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return response.send(Buffer.from(data));
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
      fileFilter: (_r, file, cb) =>
        cb(
          file.mimetype.startsWith('image/') && !file.mimetype.includes('svg')
            ? null
            : new BadRequestException('Envie uma imagem PNG, JPG, WebP ou GIF'),
          file.mimetype.startsWith('image/') && !file.mimetype.includes('svg'),
        ),
    }),
  )
  async upload(@Req() req: AuthRequest, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Arquivo ausente');
    const dashboard = await this.db.dashboard.findUniqueOrThrow({
      where: { userId: req.user.sub },
    });
    const filename = `${randomUUID()}${extname(file.originalname).toLowerCase()}`;
    const asset = await this.db.asset.create({
      data: {
        dashboardId: dashboard.id,
        name: file.originalname.slice(0, 120),
        mimeType: file.mimetype,
        path: filename,
        data: Uint8Array.from(file.buffer),
      },
    });
    return {
      ...asset,
      url: `/api/assets/files/${filename}`,
      message: 'Imagem enviada com sucesso',
    };
  }
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Req() req: AuthRequest, @Param('id') id: string) {
    const asset = await this.db.asset.findFirst({
      where: { id, dashboard: { userId: req.user.sub } },
    });
    if (!asset) return { ok: true, message: 'Imagem já havia sido removida' };
    await this.db.asset.delete({ where: { id } });
    return { ok: true, message: 'Imagem removida com sucesso' };
  }
}
