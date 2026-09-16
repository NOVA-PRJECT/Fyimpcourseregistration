import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common'
import { AdminService } from './admin.service'
import { DataSeedService } from './data-seed.service'
import { AuthGuard } from '../../core/auth/guards/auth.guard'
import { RolesGuard } from '../../core/auth/guards/roles.guard'
import { Roles } from '../../core/auth/decorators/roles.decorator'
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator'
import { AuthUser } from '../../core/auth/types'

@Controller('api/admin')
@UseGuards(AuthGuard, RolesGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly dataSeedService: DataSeedService,
  ) {}

  // ──────────────── Data Seed ────────────────
  @Get('seed-status')
  @Roles('superadmin', 'campus_director')
  async getSeedStatus() {
    return this.dataSeedService.getStatus()
  }

  @Post('run-seed')
  @Roles('superadmin')
  async runSeed() {
    await this.dataSeedService.seedCoursesAndBlueprints()
    return this.dataSeedService.getStatus()
  }

  // ──────────────── Campuses ────────────────
  @Get('campuses')
  @Roles('superadmin')
  async getCampuses() {
    return this.adminService.getCampuses()
  }

  @Post('campuses')
  @Roles('superadmin')
  async createCampus(@Body() body: { name: string; code: string }, @CurrentUser() user: AuthUser) {
    return this.adminService.createCampus(body.name, body.code, user)
  }

  @Put('campuses')
  @Roles('superadmin')
  async updateCampus(@Body() body: { id: string; name: string; code: string }, @CurrentUser() user: AuthUser) {
    return this.adminService.updateCampus(body.id, body.name, body.code, user)
  }

  @Delete('campuses')
  @Roles('superadmin')
  async deleteCampus(@Body() body: { campus_id: string }, @CurrentUser() user: AuthUser) {
    return this.adminService.deleteCampus(body.campus_id, user)
  }

  // ──────────────── Departments ────────────────
  @Get('departments')
  @Roles('superadmin')
  async getDepartments() {
    return this.adminService.getDepartments()
  }

  @Post('departments')
  @Roles('superadmin')
  async createDepartment(
    @Body() body: { name: string; code: string; campus_id: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminService.createDepartment(body.name, body.code, body.campus_id, user)
  }

  @Put('departments')
  @Roles('superadmin')
  async updateDepartment(
    @Body() body: { id: string; name: string; code: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminService.updateDepartment(body.id, body.name, body.code, user)
  }

  @Delete('departments')
  @Roles('superadmin')
  async deleteDepartment(@Body() body: { department_id: string }, @CurrentUser() user: AuthUser) {
    return this.adminService.deleteDepartment(body.department_id, user)
  }

  // ──────────────── Faculty List ────────────────
  @Get('faculty-list')
  @Roles('superadmin')
  async getFacultyList() {
    return this.adminService.getFacultyList()
  }

  @Post('faculty-list')
  @Roles('superadmin')
  async createFaculty(
    @Body() body: {
      full_name: string
      email: string
      password: string
      role: string
      department_id?: string | null
      campus_id: string
    },
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminService.createFaculty(body, user)
  }

  @Put('faculty-list')
  @Roles('superadmin')
  async updateFaculty(
    @Body() body: {
      id: string
      full_name: string
      role: string
      department_id?: string | null
      campus_id: string
    },
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminService.updateFaculty(body.id, body, user)
  }

  @Delete('faculty-list')
  @Roles('superadmin')
  async deleteFaculty(@Body() body: { faculty_id: string }, @CurrentUser() user: AuthUser) {
    return this.adminService.deleteFaculty(body.faculty_id, user)
  }

  // ──────────────── Promote Students ────────────────
  @Post('campus/promote-students')
  @Roles('campus_director')
  async promoteStudents(@CurrentUser() user: AuthUser) {
    return this.adminService.promoteStudents(user)
  }

  // ──────────────── System & Audit Logs ────────────────
  @Get('logs')
  @Roles('superadmin')
  async getLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('log_type') logType?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getSystemLogs({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
      logType,
      status,
      search,
    })
  }
}
