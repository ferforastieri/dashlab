import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { Throttle } from '@nestjs/throttler';
import { AuthService } from "../services/auth.service";
import {
  ChangePasswordDto,
  LoginDto,
  RefreshDto,
  RegisterDto,
  DeleteAccountDto,
} from "../dto/auth.dto";
import { AuthRequest, JwtAuthGuard } from "../guards/jwt.guard";

@Controller("auth")
export class AuthController {
  constructor(private service: AuthService) {}
  @Throttle({ default: { limit: 5, ttl: 60000 } }) @Post("register") register(@Body() dto: RegisterDto) {
    return this.service.register(dto);
  }
  @Throttle({ default: { limit: 8, ttl: 60000 } }) @Post("login") login(@Body() dto: LoginDto) {
    return this.service.login(dto);
  }
  @Post("refresh") refresh(@Body() dto: RefreshDto) {
    return this.service.refresh(dto.refreshToken);
  }
  @Post("logout") logout(@Body() dto: RefreshDto) {
    return this.service.logout(dto.refreshToken);
  }
  @UseGuards(JwtAuthGuard) @Get("me") me(@Req() req: AuthRequest) {
    return req.user;
  }
  @UseGuards(JwtAuthGuard) @Post("change-password") change(
    @Req() req: AuthRequest,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.service.changePassword(req.user.sub, dto);
  }
  @UseGuards(JwtAuthGuard) @Get("sessions") sessions(@Req() req: AuthRequest) {
    return this.service.sessions(req.user.sub);
  }
  @UseGuards(JwtAuthGuard) @Delete("sessions/:id") revoke(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.service.revokeSession(req.user.sub, id);
  }
  @UseGuards(JwtAuthGuard) @Post("logout-all") logoutAll(@Req() req: AuthRequest) {
    return this.service.logoutAll(req.user.sub);
  }
  @UseGuards(JwtAuthGuard) @Delete("account") deleteAccount(@Req() req: AuthRequest, @Body() dto: DeleteAccountDto) {
    return this.service.deleteAccount(req.user.sub, dto.password);
  }
}
