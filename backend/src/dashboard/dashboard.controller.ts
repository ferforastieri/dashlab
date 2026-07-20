import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AuthRequest, JwtAuthGuard } from '../auth/jwt.guard';
import { DashboardService } from './dashboard.service';

@Controller()
export class DashboardController {
  constructor(private service:DashboardService){}
  @Get('health') health(){return{status:'ok',name:'DashLab'}}
  @UseGuards(JwtAuthGuard) @Get('dashboard') dashboard(@Req() r:AuthRequest,@Query('surface') s='web'){return this.service.get(r.user.sub,s.toUpperCase() as any)}
  @UseGuards(JwtAuthGuard) @Put('branding') branding(@Req() r:AuthRequest,@Body() b:any){return this.service.branding(r.user.sub,b)}
  @UseGuards(JwtAuthGuard) @Post('applications') createApp(@Req() r:AuthRequest,@Body() b:any){return this.service.createApp(r.user.sub,b)}
  @UseGuards(JwtAuthGuard) @Patch('applications/:id') updateApp(@Req() r:AuthRequest,@Param('id') id:string,@Body() b:any){return this.service.updateApp(r.user.sub,id,b)}
  @UseGuards(JwtAuthGuard) @Delete('applications/:id') deleteApp(@Req() r:AuthRequest,@Param('id') id:string){return this.service.deleteApp(r.user.sub,id)}
  @UseGuards(JwtAuthGuard) @Post('widgets') createWidget(@Req() r:AuthRequest,@Body() b:any){return this.service.createWidget(r.user.sub,b)}
  @UseGuards(JwtAuthGuard) @Patch('widgets/:id') updateWidget(@Req() r:AuthRequest,@Param('id') id:string,@Body() b:any){return this.service.updateWidget(r.user.sub,id,b)}
  @UseGuards(JwtAuthGuard) @Delete('widgets/:id') deleteWidget(@Req() r:AuthRequest,@Param('id') id:string){return this.service.deleteWidget(r.user.sub,id)}
  @UseGuards(JwtAuthGuard) @Put('layouts/:surface') layout(@Req() r:AuthRequest,@Param('surface') s:string,@Body() b:any[]){return this.service.saveLayout(r.user.sub,s.toUpperCase() as any,b)}
  @UseGuards(JwtAuthGuard) @Get('metrics/overview') metrics(){return this.service.metrics()}
  @UseGuards(JwtAuthGuard) @Get('widgets/:id/data') widgetData(@Req() r:AuthRequest,@Param('id') id:string){return this.service.promql(r.user.sub,id)}
}
