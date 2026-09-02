import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { RegistrationsService } from './registrations.service'
import { AuthGuard } from '../../core/auth/guards/auth.guard'
import { RolesGuard } from '../../core/auth/guards/roles.guard'
import { Roles } from '../../core/auth/decorators/roles.decorator'
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator'
import { AuthUser } from '../../core/auth/types'

@Controller('api/registrations')
@UseGuards(AuthGuard, RolesGuard)
@Roles('student')
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @Get('blueprint')
  async getBlueprint(@CurrentUser() user: AuthUser) {
    return this.registrationsService.getBlueprint(user)
  }

  @Get('pathway-slots')
  async getPathwaySlots(
    @Query('pathway_id') pathwayId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.registrationsService.getPathwaySlots(pathwayId, user)
  }

  @Post('submit')
  async submitCourses(
    @Body() body: { semester: number; pathway_id: string; courses: string[] },
    @CurrentUser() user: AuthUser,
  ) {
    return this.registrationsService.submitCourses(body, user)
  }
}
