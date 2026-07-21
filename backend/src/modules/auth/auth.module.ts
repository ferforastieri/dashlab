import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { JwtAuthGuard } from './guards/jwt.guard';
import { AuthService } from './services/auth.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
