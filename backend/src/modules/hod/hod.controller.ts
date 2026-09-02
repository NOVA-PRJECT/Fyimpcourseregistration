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
import { HodService } from './hod.service'
import { AuthGuard } from '../../core/auth/guards/auth.guard'
import { RolesGuard } from '../../core/auth/guards/roles.guard'
import { Roles } from '../../core/auth/decorators/roles.decorator'
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator'
import { AuthUser } from '../../core/auth/types'

@Controller('api/hod')
@UseGuards(AuthGuard, RolesGuard)
@Roles('hod')
export class HodController {
  constructor(private readonly hodService: HodService) {}

  // ──────────────── Blueprint ────────────────
  @Get('blueprint')
  async getBlueprint(@Query('semester') semester: string | undefined, @CurrentUser() user: AuthUser) {
    const sem = semester ? Number(semester) : 1
    return this.hodService.getBlueprint(isNaN(sem) ? 1 : sem, user)
  }

  @Put('blueprint')
  async updateBlueprintPut(@Body() body: any, @CurrentUser() user: AuthUser) {
    return this.hodService.updateBlueprint(body, user)
  }

  @Post('blueprint')
  async updateBlueprintPost(@Body() body: any, @CurrentUser() user: AuthUser) {
    return this.hodService.updateBlueprint(body, user)
  }

  // ──────────────── Courses ────────────────
  @Get('courses')
  async getCourses(
    @Query('semester') semester: string | undefined,
    @Query('own') own: string | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    const sem = semester ? Number(semester) : 1
    return this.hodService.getCourses(isNaN(sem) ? 1 : sem, user, own === 'true')
  }

  @Post('courses')
  async createCourse(@Body() body: any, @CurrentUser() user: AuthUser) {
    return this.hodService.createCourse(body, user)
  }

  @Put('courses')
  async updateCourse(@Body() body: any, @CurrentUser() user: AuthUser) {
    return this.hodService.updateCourse(body.id, body, user)
  }

  @Delete('courses')
  async deleteCourse(@Body() body: { course_id: string }, @CurrentUser() user: AuthUser) {
    return this.hodService.deleteCourse(body.course_id, user)
  }

  // ──────────────── Departments ────────────────
  @Get('departments')
  async getDepartments(@CurrentUser() user: AuthUser) {
    return this.hodService.getDepartments(user)
  }

  // ──────────────── Students ────────────────
  @Get('students')
  async getStudents(@Query('semester') semester: string | undefined, @CurrentUser() user: AuthUser) {
    return this.hodService.getStudents(semester ? Number(semester) : undefined, user)
  }

  @Post('students/add')
  async addStudent(@Body() body: any, @CurrentUser() user: AuthUser) {
    return this.hodService.addStudent(body, user)
  }

  @Put('students/update')
  async updateStudent(@Body() body: any, @CurrentUser() user: AuthUser) {
    return this.hodService.updateStudent(body, user)
  }

  @Delete('students/remove')
  async removeStudent(@Body() body: { student_id: string }, @CurrentUser() user: AuthUser) {
    return this.hodService.removeStudent(body.student_id, user)
  }

  @Post('bulk-students')
  async bulkCreateStudents(
    @Body() body: { rows: any[]; batch_default_password?: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.hodService.bulkCreateStudents(body.rows, body.batch_default_password ?? 'Student@123', user)
  }

  @Get('export-students-excel')
  async exportStudentsExcel(@Query('semester') semester: string | undefined, @CurrentUser() user: AuthUser) {
    return this.hodService.exportStudentsExcel(semester ? Number(semester) : undefined, user)
  }
}
