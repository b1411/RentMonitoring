import { Body, Controller, Get, Post } from '@nestjs/common';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import {
  CreateUserSchema,
  LoginSchema,
  type CreateUserInput,
  type LoginInput,
} from './auth.dto';
import { AuthService } from './auth.service';
import type { AuthUser } from './auth.types';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { Roles } from './decorators/roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  login(@Body(new ZodValidationPipe(LoginSchema)) data: LoginInput) {
    return this.auth.login(data);
  }

  /** Current session — requires a valid token (global JwtAuthGuard). */
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return user;
  }

  @Roles('ADMIN')
  @Get('users')
  listUsers() {
    return this.auth.listUsers();
  }

  @Roles('ADMIN')
  @Post('users')
  createUser(
    @Body(new ZodValidationPipe(CreateUserSchema)) data: CreateUserInput,
  ) {
    return this.auth.createUser(data);
  }
}
