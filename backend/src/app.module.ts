import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from './prisma/prisma.service';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { JwtAuthGuard } from './auth/jwt.guard';
import { DashboardController } from './dashboard/dashboard.controller';
import { DashboardService } from './dashboard/dashboard.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), JwtModule.register({ global: true })],
  controllers: [AuthController, DashboardController],
  providers: [PrismaService, AuthService, JwtAuthGuard, DashboardService],
})
export class AppModule {}
