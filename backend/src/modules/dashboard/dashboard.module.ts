import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AssetsController } from './controllers/assets.controller';
import { DashboardController } from './controllers/dashboard.controller';
import { DashboardService } from './services/dashboard.service';

@Module({
  imports: [AuthModule],
  controllers: [DashboardController, AssetsController],
  providers: [DashboardService],
})
export class DashboardModule {}
