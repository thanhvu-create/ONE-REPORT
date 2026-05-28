import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

const DEPARTMENTS = [
  { name: 'Kinh Doanh', description: 'Bán hàng và phát triển kinh doanh' },
  { name: 'IT', description: 'Công nghệ thông tin nội bộ' },
  { name: 'Nhân Sự', description: 'Quản lý nhân sự và tuyển dụng' },
];

const USERS = [
  { email: 'admin@ctyhp.vn', fullName: 'Admin Hệ Thống', password: 'admin123', role: 'admin' as const },
  { email: 'executive@ctyhp.vn', fullName: 'Ban Lãnh Đạo', password: 'exec123', role: 'executive' as const },
  { email: 'supervisor@ctyhp.vn', fullName: 'Giám Sát Nội Bộ', password: 'super123', role: 'supervisor' as const },
  { email: 'leader@ctyhp.vn', fullName: 'Trưởng Phòng Kinh Doanh', password: 'leader123', role: 'leader' as const, department: 'Kinh Doanh' },
  { email: 'manager@ctyhp.vn', fullName: 'Quản Lý Kinh Doanh', password: 'mgr123', role: 'manager' as const, department: 'Kinh Doanh' },
  { email: 'employee@ctyhp.vn', fullName: 'Nhân Viên Kinh Doanh', password: 'emp123', role: 'employee' as const, department: 'Kinh Doanh' },
];

async function main() {
  console.log('Seeding departments...');
  for (const dept of DEPARTMENTS) {
    await prisma.department.upsert({
      where: { name: dept.name },
      update: {},
      create: dept,
    });
  }

  const allDepts = await prisma.department.findMany();
  const deptMap = new Map(allDepts.map((d) => [d.name, d.id]));

  console.log('Seeding demo users...');
  for (const { password, department, ...rest } of USERS) {
    const departmentId = department ? (deptMap.get(department) ?? null) : null;
    await prisma.user.upsert({
      where: { email: rest.email },
      update: {},
      create: {
        ...rest,
        departmentId,
        passwordHash: await hash(password, 10),
      },
    });
  }

  console.log('✅ Seed complete — 6 demo users created');
}

main().catch(console.error).finally(() => prisma.$disconnect());
