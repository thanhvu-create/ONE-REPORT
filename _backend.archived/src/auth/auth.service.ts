import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/types/auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async validateCredentials(email: string, password: string): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.toAuthenticatedUser(user);
  }

  async login(user: AuthenticatedUser): Promise<{
    access_token: string;
    token_type: 'bearer';
    user: AuthenticatedUser;
  }> {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const access_token = await this.jwt.signAsync(payload);
    return { access_token, token_type: 'bearer', user };
  }

  async findActiveUserById(id: number): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || !user.isActive) return null;
    return this.toAuthenticatedUser(user);
  }

  private toAuthenticatedUser(user: {
    id: number;
    email: string;
    role: 'employee' | 'manager' | 'admin';
    departmentId: number | null;
    fullName: string;
  }): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
      fullName: user.fullName,
    };
  }
}
