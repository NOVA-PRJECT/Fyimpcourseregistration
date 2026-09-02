import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { DatabaseModule } from './core/database/database.module'
import { LoggingModule } from './core/logging/logging.module'
import { SecurityModule } from './core/security/security.module'
import { AuthModule } from './modules/auth/auth.module'
import { AdminModule } from './modules/admin/admin.module'
import { HodModule } from './modules/hod/hod.module'
import { FacultyModule } from './modules/faculty/faculty.module'
import { StudentModule } from './modules/student/student.module'
import { RegistrationsModule } from './modules/registrations/registrations.module'
import { DirectorModule } from './modules/director/director.module'
import { TimetableModule } from './modules/timetable/timetable.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    DatabaseModule,
    LoggingModule,
    SecurityModule,
    AuthModule,
    AdminModule,
    HodModule,
    FacultyModule,
    StudentModule,
    RegistrationsModule,
    DirectorModule,
    TimetableModule,
  ],
})
export class AppModule {}
