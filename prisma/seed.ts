import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEPARTMENTS = [
  { name: 'Kinh Doanh', description: 'Bán hàng và phát triển kinh doanh' },
  { name: 'IT', description: 'Công nghệ thông tin nội bộ' },
  { name: 'Nhân Sự', description: 'Quản lý nhân sự và tuyển dụng' },
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
  console.log('✅ Seed complete — departments created');
}

main().catch(console.error).finally(() => prisma.$disconnect());
