import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: { user: { findUnique: jest.Mock } };
  let jwt: { signAsync: jest.Mock };

  const passwordHash = bcrypt.hashSync('correct-password', 10);

  beforeEach(async () => {
    prisma = { user: { findUnique: jest.fn() } };
    jwt = { signAsync: jest.fn().mockResolvedValue('signed-jwt') };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  describe('validateCredentials', () => {
    it('returns user when password matches and user is active', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'employee01@company.com',
        fullName: 'Employee 01',
        passwordHash,
        role: 'employee',
        departmentId: 1,
        isActive: true,
      });
      const out = await service.validateCredentials('employee01@company.com', 'correct-password');
      expect(out).toMatchObject({ id: 1, role: 'employee' });
    });

    it('lowercases the email before lookup', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'a@b.com',
        fullName: 'X',
        passwordHash,
        role: 'employee',
        departmentId: null,
        isActive: true,
      });
      await service.validateCredentials('A@B.com', 'correct-password');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'a@b.com' } });
    });

    it('rejects on wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'x@y.com',
        fullName: 'X',
        passwordHash,
        role: 'employee',
        departmentId: null,
        isActive: true,
      });
      await expect(service.validateCredentials('x@y.com', 'nope')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects unknown email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.validateCredentials('nobody@z.com', 'whatever')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects deactivated user', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'x@y.com',
        fullName: 'X',
        passwordHash,
        role: 'employee',
        departmentId: null,
        isActive: false,
      });
      await expect(service.validateCredentials('x@y.com', 'correct-password')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('login', () => {
    it('signs a JWT and returns the token envelope', async () => {
      const user = {
        id: 1,
        email: 'admin@x.com',
        fullName: 'Admin',
        role: 'admin' as const,
        departmentId: null,
      };
      const out = await service.login(user);
      expect(jwt.signAsync).toHaveBeenCalledWith({ sub: 1, email: 'admin@x.com', role: 'admin' });
      expect(out.access_token).toBe('signed-jwt');
      expect(out.token_type).toBe('bearer');
      expect(out.user).toEqual(user);
    });
  });
});
