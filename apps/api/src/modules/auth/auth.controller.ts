import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { loginSchema, registerSchema, type LoginRequest, type RegisterRequest } from '@ama/shared-types';
import { UnauthenticatedError } from '../../common/errors';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { clearRefreshCookie, setRefreshCookie } from './auth.util';
import { AuthUser} from './decorators/current-user.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { AuthService } from './auth.service';

type RequestWithCookies = Request & { cookies?: Record<string, string> };

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('register')
  @ApiOperation({ summary: 'Register a new account' })
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body(new ZodValidationPipe(registerSchema)) body: RegisterRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { accessToken, refreshToken } = await this.auth.register(body);
    setRefreshCookie(response, refreshToken);
    return { accessToken };
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('login')
  @ApiOperation({ summary: 'Sign in' })
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { accessToken, refreshToken } = await this.auth.login(body);
    setRefreshCookie(response, refreshToken);
    return { accessToken };
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Post('refresh')
  @ApiOperation({ summary: 'Rotate refresh token and issue a new access token' })
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() request: RequestWithCookies,
    @Res({ passthrough: true }) response: Response,
  ) {
    const token = request.cookies?.ama_refresh;
    if (!token) throw new UnauthenticatedError('Missing refresh token.');
    const { accessToken, refreshToken } = await this.auth.refresh(token);
    setRefreshCookie(response, refreshToken);
    return { accessToken };
  }

  @Public()
  @Post('logout')
  @ApiOperation({ summary: 'Revoke the refresh token' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() request: RequestWithCookies,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.logout(request.cookies?.ama_refresh);
    clearRefreshCookie(response);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get the current user' })
  async me(@CurrentUser() user: AuthUser) {
    return this.auth.getSession(user.id);
  }
}
