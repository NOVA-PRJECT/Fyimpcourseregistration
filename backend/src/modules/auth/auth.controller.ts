import {
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
import { Response, Request } from 'express'
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
      return res.status(HttpStatus.BAD_REQUEST).json({ error: parsed.error.issues[0].message })
    }

    const ip = (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown'
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

    return res.json({
      redirectTo: result.redirectTo,
      token: result.token,
      role: result.role,
    })
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown'
    const user = (req as any).user as AuthUser
    await this.authService.logout(user, ip)

    res.clearCookie('auth_token', { path: '/' })
    res.clearCookie('user_role', { path: '/' })

    return res.json({ success: true })
  }

  @Get('profile')
  @UseGuards(AuthGuard)
  async getProfile(@CurrentUser() user: AuthUser) {
    return this.authService.getProfile(user)
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.NOT_FOUND)
  async resetPassword() {
    return { error: 'Reset password feature is disabled' }
  }

  @Post('reset-password/confirm')
  @HttpCode(HttpStatus.NOT_FOUND)
  async resetPasswordConfirm() {
    return { error: 'Reset password feature is disabled' }
  }
}
