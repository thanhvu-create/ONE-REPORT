import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { VoiceService } from '../voice/voice.service';
import { AuthenticatedUser } from '../common/types/auth.types';

function asUser(overrides: Partial<AuthenticatedUser>): AuthenticatedUser {
  return {
    id: 1,
    email: 'x@y.com',
    fullName: 'X',
    role: 'employee',
    departmentId: 1,
    ...overrides,
  };
}

describe('ReportsService — role scoping', () => {
  let service: ReportsService;
  let prisma: {
    report: {
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    department: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  const ai = { analyze: jest.fn() } as unknown as AiService;
  const voice = {} as VoiceService;

  beforeEach(async () => {
    prisma = {
      report: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      department: { findUnique: jest.fn().mockResolvedValue({ id: 1 }) },
      $transaction: jest.fn().mockImplementation(async (calls: unknown[]) => Promise.all(calls)),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AiService, useValue: ai },
        { provide: VoiceService, useValue: voice },
      ],
    }).compile();
    service = moduleRef.get(ReportsService);
  });

  describe('list', () => {
    it('employee can only see own reports', async () => {
      await service.list(asUser({ role: 'employee', id: 42 }), {});
      const call = prisma.report.findMany.mock.calls[0][0];
      expect(call.where).toMatchObject({ userId: 42 });
    });

    it('manager can only see own-department reports', async () => {
      await service.list(asUser({ role: 'manager', departmentId: 7 }), {});
      const call = prisma.report.findMany.mock.calls[0][0];
      expect(call.where).toMatchObject({ departmentId: 7 });
    });

    it('admin sees everything (empty base scope)', async () => {
      await service.list(asUser({ role: 'admin', departmentId: null }), {});
      const call = prisma.report.findMany.mock.calls[0][0];
      expect(call.where).toEqual({});
    });

    it('rejects manager filtering by another department', async () => {
      await expect(
        service.list(asUser({ role: 'manager', departmentId: 7 }), { departmentId: 9 }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects employee filtering by another userId', async () => {
      await expect(
        service.list(asUser({ role: 'employee', id: 1 }), { userId: 2 }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('findOne', () => {
    it('forbids cross-department read for managers', async () => {
      prisma.report.findUnique.mockResolvedValue({ id: 5, userId: 99, departmentId: 8 });
      await expect(service.findOne(asUser({ role: 'manager', departmentId: 7 }), 5)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('forbids cross-user read for employees', async () => {
      prisma.report.findUnique.mockResolvedValue({ id: 5, userId: 99, departmentId: 1 });
      await expect(service.findOne(asUser({ role: 'employee', id: 1 }), 5)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('throws NotFound when missing', async () => {
      prisma.report.findUnique.mockResolvedValue(null);
      await expect(service.findOne(asUser({ role: 'admin' }), 5)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('forbids employees from changing status', async () => {
      await expect(
        service.updateStatus(asUser({ role: 'employee' }), 1, { status: 'reviewed' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
