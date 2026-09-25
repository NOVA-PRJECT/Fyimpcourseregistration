import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common'
import { Request, Response } from 'express'
import { AuthService } from './auth.service'
import { AuthGuard } from '../../core/auth/guards/auth.guard'
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator'
import { AuthUser } from '../../core/auth/types'
import { z } from 'zod'

const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})


@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const parsed = LoginSchema.safeParse(body)
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0].message)
    }

    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || (req as any).ip || 'unknown'
    const result = await this.authService.login(parsed.data.email, parsed.data.password, ip)

    // Set HTTP-only cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 60 * 60 * 24 * 7 * 1000, // 7 days in ms
    }

    res.cookie('auth_token', result.token, cookieOptions)
    res.cookie('user_role', result.role, cookieOptions)

    return {
      redirectTo: result.redirectTo,
      role: result.role,
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || (req as any).ip || 'unknown'
    const authHeader = (req.headers as any).authorization as string | undefined
    const token = (req as any).cookies?.auth_token || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined)
    const user = (req as any).user as AuthUser | undefined

    await this.authService.logout(user || token, ip)

    res.clearCookie('auth_token', { path: '/' })
    res.clearCookie('user_role', { path: '/' })

    return { success: true }
  }

  @Get('profile')
  @UseGuards(AuthGuard)
  async getProfile(@CurrentUser() user: AuthUser) {
    return this.authService.getProfile(user)
  }

  @Post('complete-password-reset')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async completePasswordReset(@CurrentUser() user: AuthUser) {
    return this.authService.completePasswordReset(user.userId)
  }
}
