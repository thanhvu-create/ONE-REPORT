import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/server/prisma';
import { signToken, apiError } from '@/lib/server/auth';
import { ok, handleError } from '@/lib/server/route';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) throw apiError(400, 'Email and password are required');

    const user = await prisma.user.findUnique({ where: { email: String(email).toLowerCase() } });
    if (!user || !user.isActive) throw apiError(401, 'Invalid email or password');

    const valid = await bcrypt.compare(String(password), user.passwordHash);
    if (!valid) throw apiError(401, 'Invalid email or password');

    const token = await signToken({
      id: user.id,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
      fullName: user.fullName,
    });

    return ok({
      access_token: token,
      token_type: 'bearer',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        departmentId: user.departmentId,
        fullName: user.fullName,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
