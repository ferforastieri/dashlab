import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ChangePasswordDto, LoginDto, RefreshDto, RegisterDto } from './auth.dto';
import { AuthRequest, JwtAuthGuard } from './jwt.guard';

@Controller('auth')
export class AuthController {
  constructor(private service:AuthService){}
  @Post('register') register(@Body() dto:RegisterDto){return this.service.register(dto)}
  @Post('login') login(@Body() dto:LoginDto){return this.service.login(dto)}
  @Post('refresh') refresh(@Body() dto:RefreshDto){return this.service.refresh(dto.refreshToken)}
  @Post('logout') logout(@Body() dto:RefreshDto){return this.service.logout(dto.refreshToken)}
  @UseGuards(JwtAuthGuard) @Get('me') me(@Req() req:AuthRequest){return req.user}
  @UseGuards(JwtAuthGuard) @Post('change-password') change(@Req() req:AuthRequest,@Body() dto:ChangePasswordDto){return this.service.changePassword(req.user.sub,dto)}
}
