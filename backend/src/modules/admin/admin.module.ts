import { Module } from '@nestjs/common'
import { AdminService } from './admin.service'
import { AdminController } from './admin.controller'
import { DataSeedService } from './data-seed.service'
import { AuthCoreModule } from '../../core/auth/auth-core.module'
import { RegistrationsModule } from '../registrations/registrations.module'

@Module({
  imports: [AuthCoreModule, RegistrationsModule],
  controllers: [AdminController],
  providers: [AdminService, DataSeedService],
  exports: [AdminService],
})
export class AdminModule {}
