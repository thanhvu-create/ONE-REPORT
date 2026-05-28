import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

/**
 * Almost-e2e: boots AppModule and exercises HTTP, but stubs PrismaService so
 * the test doesn't need a live Postgres. This still verifies routing, DTO
 * validation, guards, and JWT issuance.
 */
describe('Auth flow (e2e)', () => {
  let app: INestApplication;

  const hashed = bcrypt.hashSync('secret', 10);
  const userRow = {
    id: 1,
    email: 'manager.ops@company.com',
    fullName: 'Ops Manager',
    passwordHash: hashed,
    role: 'manager' as const,
    departmentId: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const prismaStub: Record<string, unknown> = {
    user: {
      findUnique: jest
        .fn()
        .mockImplementation(({ where }: { where: { email?: string; id?: number } }) => {
          if (where?.email && where.email.toLowerCase() === userRow.email) return userRow;
          if (where?.id === userRow.id) return userRow;
          return null;
        }),
    },
    onModuleInit: jest.fn().mockResolvedValue(undefined),
    onModuleDestroy: jest.fn().mockResolvedValue(undefined),
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret-please-ignore-this-is-only-for-jest';
    process.env.JWT_EXPIRES_IN = '1h';
    process.env.OPENAI_API_KEY = '';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prismaStub)
      .compile();

    app = moduleRef.createNestApplication({ logger: false });
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects login with wrong password (401)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'manager.ops@company.com', password: 'wrong' })
      .expect(401);
  });

  it('rejects login when DTO is invalid (400)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'not-an-email', password: '' })
      .expect(400);
  });

  it('issues a JWT on correct credentials', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'manager.ops@company.com', password: 'secret' })
      .expect(200);

    expect(res.body.access_token).toEqual(expect.any(String));
    expect(res.body.token_type).toBe('bearer');
    expect(res.body.user).toMatchObject({ role: 'manager', email: 'manager.ops@company.com' });

    const me = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${res.body.access_token}`)
      .expect(200);
    expect(me.body.role).toBe('manager');
  });

  it('blocks /auth/me without a token', async () => {
    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
  });
});
