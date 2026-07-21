import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthRequest, JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { DashboardService } from '../services/dashboard.service';
import {
  BrandingDto,
  CreateApplicationDto,
  CreateSectionDto,
  CreateWidgetDto,
  MetricsHistoryDto,
  SaveLayoutDto,
  SurfaceDto,
  UpdateApplicationDto,
  UpdateSectionDto,
  UpdateWidgetDto,
  WeatherQueryDto,
} from '../dto/dashboard.dto';

@Controller()
export class DashboardController {
  constructor(private service: DashboardService) {}
  @Get('health') health() {
    return { status: 'ok', name: 'DashLab' };
  }
  @UseGuards(JwtAuthGuard) @Get('dashboard') dashboard(
    @Req() r: AuthRequest,
    @Query('surface') s = 'web',
  ) {
    return this.service.get(r.user.sub, s.toUpperCase() as any);
  }
  @UseGuards(JwtAuthGuard) @Put('branding') branding(
    @Req() r: AuthRequest,
    @Body() b: BrandingDto,
  ) {
    return this.service.branding(r.user.sub, b);
  }
  @UseGuards(JwtAuthGuard) @Post('applications') createApp(
    @Req() r: AuthRequest,
    @Body() b: CreateApplicationDto,
  ) {
    return this.service.createApp(r.user.sub, b);
  }
  @UseGuards(JwtAuthGuard) @Patch('applications/:id') updateApp(
    @Req() r: AuthRequest,
    @Param('id') id: string,
    @Body() b: UpdateApplicationDto,
  ) {
    return this.service.updateApp(r.user.sub, id, b);
  }
  @UseGuards(JwtAuthGuard) @Delete('applications/:id') deleteApp(
    @Req() r: AuthRequest,
    @Param('id') id: string,
  ) {
    return this.service.deleteApp(r.user.sub, id);
  }
  @UseGuards(JwtAuthGuard) @Post('sections') createSection(
    @Req() r: AuthRequest,
    @Body() b: CreateSectionDto,
  ) {
    return this.service.createSection(r.user.sub, b);
  }
  @UseGuards(JwtAuthGuard) @Patch('sections/:id') updateSection(
    @Req() r: AuthRequest,
    @Param('id') id: string,
    @Body() b: UpdateSectionDto,
  ) {
    return this.service.updateSection(r.user.sub, id, b);
  }
  @UseGuards(JwtAuthGuard) @Delete('sections/:id') deleteSection(
    @Req() r: AuthRequest,
    @Param('id') id: string,
  ) {
    return this.service.deleteSection(r.user.sub, id);
  }
  @UseGuards(JwtAuthGuard) @Post('widgets') createWidget(
    @Req() r: AuthRequest,
    @Body() b: CreateWidgetDto,
  ) {
    return this.service.createWidget(r.user.sub, b);
  }
  @UseGuards(JwtAuthGuard) @Patch('widgets/:id') updateWidget(
    @Req() r: AuthRequest,
    @Param('id') id: string,
    @Body() b: UpdateWidgetDto,
  ) {
    return this.service.updateWidget(r.user.sub, id, b);
  }
  @UseGuards(JwtAuthGuard) @Delete('widgets/:id') deleteWidget(
    @Req() r: AuthRequest,
    @Param('id') id: string,
  ) {
    return this.service.deleteWidget(r.user.sub, id);
  }
  @UseGuards(JwtAuthGuard) @Put('layouts/:surface') layout(
    @Req() r: AuthRequest,
    @Param('surface') s: string,
    @Body() b: SaveLayoutDto,
  ) {
    const surface = s.toUpperCase();
    if (!Object.values(SurfaceDto).includes(surface as SurfaceDto))
      throw new BadRequestException('Superfície inválida');
    return this.service.saveLayout(r.user.sub, surface as any, b.items);
  }
  @UseGuards(JwtAuthGuard) @Get('metrics/overview') metrics() {
    return this.service.metrics();
  }
  @UseGuards(JwtAuthGuard) @Get('metrics/history') metricsHistory(
    @Query() query: MetricsHistoryDto,
  ) {
    return this.service.metricsHistory(query.range);
  }
  @UseGuards(JwtAuthGuard) @Get('widgets/:id/data') widgetData(
    @Req() r: AuthRequest,
    @Param('id') id: string,
  ) {
    return this.service.promql(r.user.sub, id);
  }
  @UseGuards(JwtAuthGuard) @Get('applications/status') statuses(@Req() r: AuthRequest) {
    return this.service.statuses(r.user.sub);
  }
  @UseGuards(JwtAuthGuard) @Get('weather') weather(@Query() q: WeatherQueryDto) {
    return this.service.weather(q.latitude, q.longitude);
  }
}
