import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEPARTMENTS = [
  { name: 'Nhân Sự', description: 'Quản lý nhân sự và tuyển dụng' },
  { name: 'R&D', description: 'Nghiên cứu và phát triển sản phẩm' },
  { name: 'Kinh Doanh', description: 'Bán hàng và phát triển kinh doanh' },
  { name: 'Marketing', description: 'Thương hiệu, nội dung và chiến dịch' },
  { name: 'IT', description: 'Công nghệ thông tin nội bộ' },
  { name: 'Sản Xuất', description: 'Quản lý sản xuất và chất lượng' },
  { name: 'Kho Tổng', description: 'Quản lý kho và logistics' },
  { name: 'Kế Toán', description: 'Tài chính và kế toán' },
];

const USERS: Array<{
  email: string;
  fullName: string;
  password: string;
  role: Role;
  department?: string;
}> = [
  // Admin (IT)
  { email: 'admin@ctyhp.vn', fullName: 'Admin Hệ Thống', password: 'admin123', role: 'admin', department: 'IT' },

  // Executive (Chủ TGĐ + Ban GĐ — same role)
  { email: 'ceo@ctyhp.vn', fullName: 'Chủ Tổng Giám Đốc', password: 'exec123', role: 'executive' },
  { email: 'bgd@ctyhp.vn', fullName: 'Ban Giám Đốc', password: 'exec123', role: 'executive' },

  // Supervisor (Ban Giám Sát Nội Bộ)
  { email: 'gsnb@ctyhp.vn', fullName: 'Giám Sát Nội Bộ', password: 'super123', role: 'supervisor' },

  // Leaders
  { email: 'leader.nhansu@ctyhp.vn', fullName: 'Trưởng Phòng Nhân Sự', password: 'leader123', role: 'leader', department: 'Nhân Sự' },
  { email: 'leader.rd@ctyhp.vn', fullName: 'Trưởng Phòng R&D', password: 'leader123', role: 'leader', department: 'R&D' },
  { email: 'leader.kinhdoanh@ctyhp.vn', fullName: 'Trưởng Phòng Kinh Doanh', password: 'leader123', role: 'leader', department: 'Kinh Doanh' },
  { email: 'leader.marketing@ctyhp.vn', fullName: 'Trưởng Phòng Marketing', password: 'leader123', role: 'leader', department: 'Marketing' },
  { email: 'leader.it@ctyhp.vn', fullName: 'Trưởng Phòng IT', password: 'leader123', role: 'leader', department: 'IT' },
  { email: 'leader.sanxuat@ctyhp.vn', fullName: 'Trưởng Phòng Sản Xuất', password: 'leader123', role: 'leader', department: 'Sản Xuất' },
  { email: 'leader.khotong@ctyhp.vn', fullName: 'Trưởng Phòng Kho Tổng', password: 'leader123', role: 'leader', department: 'Kho Tổng' },
  { email: 'leader.ketoan@ctyhp.vn', fullName: 'Trưởng Phòng Kế Toán', password: 'leader123', role: 'leader', department: 'Kế Toán' },

  // Employees (2 per department for demo)
  { email: 'nv01.nhansu@ctyhp.vn', fullName: 'Nhân Viên Nhân Sự 1', password: 'emp123', role: 'employee', department: 'Nhân Sự' },
  { email: 'nv02.nhansu@ctyhp.vn', fullName: 'Nhân Viên Nhân Sự 2', password: 'emp123', role: 'employee', department: 'Nhân Sự' },
  { email: 'nv01.rd@ctyhp.vn', fullName: 'Nhân Viên R&D 1', password: 'emp123', role: 'employee', department: 'R&D' },
  { email: 'nv01.kinhdoanh@ctyhp.vn', fullName: 'Nhân Viên Kinh Doanh 1', password: 'emp123', role: 'employee', department: 'Kinh Doanh' },
  { email: 'nv02.kinhdoanh@ctyhp.vn', fullName: 'Nhân Viên Kinh Doanh 2', password: 'emp123', role: 'employee', department: 'Kinh Doanh' },
  { email: 'nv01.marketing@ctyhp.vn', fullName: 'Nhân Viên Marketing 1', password: 'emp123', role: 'employee', department: 'Marketing' },
  { email: 'nv01.it@ctyhp.vn', fullName: 'Nhân Viên IT 1', password: 'emp123', role: 'employee', department: 'IT' },
  { email: 'nv01.sanxuat@ctyhp.vn', fullName: 'Nhân Viên Sản Xuất 1', password: 'emp123', role: 'employee', department: 'Sản Xuất' },
  { email: 'nv01.khotong@ctyhp.vn', fullName: 'Nhân Viên Kho Tổng 1', password: 'emp123', role: 'employee', department: 'Kho Tổng' },
  { email: 'nv01.ketoan@ctyhp.vn', fullName: 'Nhân Viên Kế Toán 1', password: 'emp123', role: 'employee', department: 'Kế Toán' },
];

async function main() {
  console.log('Seeding departments...');
  for (const dept of DEPARTMENTS) {
    await prisma.department.upsert({
      where: { name: dept.name },
      update: { description: dept.description },
      create: dept,
    });
  }

  const departments = await prisma.department.findMany();
  const deptByName = new Map(departments.map((d) => [d.name, d.id]));

  console.log('Seeding users...');
  for (const user of USERS) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    const departmentId = user.department ? (deptByName.get(user.department) ?? null) : null;
    await prisma.user.upsert({
      where: { email: user.email },
      update: { fullName: user.fullName, passwordHash, role: user.role, departmentId, isActive: true },
      create: { email: user.email, fullName: user.fullName, passwordHash, role: user.role, departmentId, isActive: true },
    });
  }

  console.log(`Seed complete. ${USERS.length} users, ${DEPARTMENTS.length} departments.`);
  console.log('\nTest accounts:');
  console.log('  admin@ctyhp.vn          / admin123   (admin)');
  console.log('  ceo@ctyhp.vn            / exec123    (executive)');
  console.log('  gsnb@ctyhp.vn           / super123   (supervisor)');
  console.log('  leader.kinhdoanh@ctyhp.vn / leader123 (leader - Kinh Doanh)');
  console.log('  nv01.kinhdoanh@ctyhp.vn / emp123    (employee - Kinh Doanh)');
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
