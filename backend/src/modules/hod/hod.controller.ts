import {
  BadRequestException,
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
import { z } from 'zod'

const CreateCourseSchema = z.object({
  course_code: z.string().min(1, 'Course code is required').max(30),
  title: z.string().min(1, 'Course title is required').max(200),
  semester: z.coerce.number().int().min(1).max(8),
  credits: z.coerce.number().int().min(1).max(10),
  theory_hours_per_week: z.coerce.number().int().min(0).max(40).optional().default(0),
  practical_hours_per_week: z.coerce.number().int().min(0).max(40).optional().default(0),
  category: z.string().min(1, 'Category is required'),
  tag: z.string().nullable().optional(),
  seat_limit: z.coerce.number().int().min(1).max(500).optional().default(60),
  prerequisite_course_ids: z.array(z.string()).optional().default([]),
  allowed_department_ids: z.array(z.string()).optional().default([]),
})

const UpdateCourseSchema = z.object({
  id: z.string().min(1, 'Course ID is required'),
  course_code: z.string().min(1, 'Course code is required').max(30),
  title: z.string().min(1, 'Course title is required').max(200),
  credits: z.coerce.number().int().min(1).max(10),
  theory_hours_per_week: z.coerce.number().int().min(0).max(40).optional().default(0),
  practical_hours_per_week: z.coerce.number().int().min(0).max(40).optional().default(0),
  category: z.string().min(1, 'Category is required'),
  tag: z.string().nullable().optional(),
  seat_limit: z.coerce.number().int().min(1).max(500).optional(),
  prerequisite_course_ids: z.array(z.string()).optional(),
  allowed_department_ids: z.array(z.string()).optional(),
})

const AddStudentSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(100),
  cap_application_number: z.string().min(1, 'CAP Application Number is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8).optional(),
  current_semester: z.coerce.number().int().min(1).max(8),
  academic_year_joined: z.string().min(1, 'Academic year is required'),
})

const UpdateStudentSchema = z.object({
  id: z.string().min(1, 'Student ID is required'),
  full_name: z.string().min(1, 'Full name is required').max(100),
  current_semester: z.coerce.number().int().min(1).max(8),
})

const BlueprintSchema = z.object({
  semester: z.coerce.number().int().min(1).max(8),
  min_credits: z.coerce.number().int().min(0).max(50),
  max_credits: z.coerce.number().int().min(0).max(50),
  pathways: z.array(z.any()).optional().default([]),
})

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
  async updateBlueprintPut(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    const parsed = BlueprintSchema.safeParse(body)
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0].message)
    }
    return this.hodService.updateBlueprint(parsed.data as any, user)
  }

  @Post('blueprint')
  async updateBlueprintPost(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    const parsed = BlueprintSchema.safeParse(body)
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0].message)
    }
    return this.hodService.updateBlueprint(parsed.data as any, user)
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
  async createCourse(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    const parsed = CreateCourseSchema.safeParse(body)
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0].message)
    }
    return this.hodService.createCourse(parsed.data, user)
  }

  @Put('courses')
  async updateCourse(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    const parsed = UpdateCourseSchema.safeParse(body)
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0].message)
    }
    return this.hodService.updateCourse(parsed.data.id, parsed.data, user)
  }

  @Delete('courses')
  async deleteCourse(@Body() body: { course_id: string }, @CurrentUser() user: AuthUser) {
    if (!body?.course_id) {
      throw new BadRequestException('Course ID is required')
    }
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
  async addStudent(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    const parsed = AddStudentSchema.safeParse(body)
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0].message)
    }
    return this.hodService.addStudent(parsed.data as any, user)
  }

  @Put('students/update')
  async updateStudent(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    const parsed = UpdateStudentSchema.safeParse(body)
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0].message)
    }
    return this.hodService.updateStudent(parsed.data as any, user)
  }

  @Delete('students/remove')
  async removeStudent(@Body() body: { student_id: string }, @CurrentUser() user: AuthUser) {
    if (!body?.student_id) {
      throw new BadRequestException('Student ID is required')
    }
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
