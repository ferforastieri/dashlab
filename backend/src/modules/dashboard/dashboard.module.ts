import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AssetsController } from './controllers/assets.controller';
import { DashboardController } from './controllers/dashboard.controller';
import { PwaController } from './controllers/pwa.controller';
import { DashboardService } from './services/dashboard.service';
import { PwaService } from './services/pwa.service';

@Module({
  imports: [AuthModule],
  controllers: [DashboardController, AssetsController, PwaController],
  providers: [DashboardService, PwaService],
})
export class DashboardModule {}
