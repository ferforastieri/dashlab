import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { PwaService } from '../services/pwa.service';

@Controller('pwa')
export class PwaController {
  constructor(private pwaService: PwaService) {}

  @Get(':dashboardId/manifest.webmanifest')
  async manifest(@Param('dashboardId') dashboardId: string, @Res() response: Response) {
    const manifest = await this.pwaService.manifest(dashboardId);
    response.setHeader('Content-Type', 'application/manifest+json');
    response.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    return response.send(manifest);
  }

  @Get(':dashboardId/icon/:size.png')
  async icon(
    @Param('dashboardId') dashboardId: string,
    @Param('size') size: string,
    @Query('maskable') maskable: string,
    @Res() response: Response,
  ) {
    const image = await this.pwaService.icon(dashboardId, size, maskable === 'true');
    response.type('image/png');
    response.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    return response.send(image);
  }
}
