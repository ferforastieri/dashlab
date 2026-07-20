import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from './prisma/prisma.service';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { JwtAuthGuard } from './auth/jwt.guard';
import { DashboardController } from './dashboard/dashboard.controller';
import { DashboardService } from './dashboard/dashboard.service';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AssetsController } from './dashboard/assets.controller';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), JwtModule.register({ global: true }), ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }])],
  controllers: [AuthController, DashboardController, AssetsController],
  providers: [PrismaService, AuthService, JwtAuthGuard, DashboardService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
