import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateUserInput, LoginInput } from './auth.dto';
import type { AppRole, AuthUser, JwtPayload } from './auth.types';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login({
    email,
    password,
  }: LoginInput): Promise<{ token: string; user: AuthUser }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return { token: this.sign(user), user: this.toAuthUser(user) };
  }

  async createUser(data: CreateUserInput): Promise<AuthUser> {
    const exists = await this.prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true },
    });
    if (exists) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        role: data.role,
        passwordHash,
      },
    });
    return this.toAuthUser(user);
  }

  listUsers(): Promise<AuthUser[]> {
    return this.prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  private sign(user: { id: string; email: string; role: AppRole }): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return this.jwt.sign(payload);
  }

  private toAuthUser(u: {
    id: string;
    email: string;
    name: string;
    role: AppRole;
  }): AuthUser {
    return { id: u.id, email: u.email, name: u.name, role: u.role };
  }
}
