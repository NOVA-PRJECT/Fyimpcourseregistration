import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { AllocationService } from './allocation.service'
import { AuthGuard } from '../../core/auth/guards/auth.guard'
import { RolesGuard } from '../../core/auth/guards/roles.guard'
import { Roles } from '../../core/auth/decorators/roles.decorator'
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator'
import { AuthUser } from '../../core/auth/types'

@Controller('api/allocation')
@UseGuards(AuthGuard, RolesGuard)
export class AllocationController {
  constructor(private readonly allocationService: AllocationService) {}

  // ──────────────── Campus Director: Run Allocation ────────────────
  @Post('run')
  @Roles('campus_director')
  async runAllocation(
    @Body() body: { academicYear: string; semester: number },
    @CurrentUser() user: AuthUser,
  ) {
    return this.allocationService.runAllocation(body, user)
  }

  // ──────────────── Status Polling (Director & HOD) ────────────────
  @Get('status')
  @Roles('campus_director', 'hod')
  async getRunStatus(
    @Query('academicYear') academicYear: string,
    @Query('semester') semester: string,
    @CurrentUser() user: AuthUser,
  ) {
    const sem = semester ? Number(semester) : 1
    return this.allocationService.getRunStatus(academicYear || '', isNaN(sem) ? 1 : sem, user)
  }

  // ──────────────── HOD: Unresolved Students ────────────────
  @Get('unresolved')
  @Roles('hod')
  async getUnresolvedStudents(
    @Query('semesterId') semesterId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.allocationService.getUnresolvedStudents(semesterId, user)
  }

  // ──────────────── HOD: Remaining Seats ────────────────
  @Get('remaining-seats')
  @Roles('hod')
  async getRemainingSeats(
    @Query('semesterId') semesterId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.allocationService.getRemainingSeats(semesterId, user)
  }

  // ──────────────── HOD: Manual Allocation ────────────────
  @Post('manual-allocate')
  @Roles('hod')
  async manualAllocate(
    @Body() body: { student_id: string; slot_key: string; course_id: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.allocationService.manualAllocate(body, user)
  }
}
