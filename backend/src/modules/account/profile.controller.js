import bcrypt from 'bcrypt';

import { prisma } from '../../lib/prisma.js';
import { ApiError, asyncHandler } from '../../lib/errors.js';
import { changePasswordSchema, updateProfileSchema } from '../auth/auth.validation.js';

export const profileController = {
  get: asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        _count: { select: { orders: true, reviews: true, addresses: true } },
      },
    });

    if (!user) throw ApiError.notFound('Profile not found');

    res.json({ success: true, data: user });
  }),

  update: asyncHandler(async (req, res) => {
    const data = updateProfileSchema.parse(req.body);

    if (data.email) {
      const clash = await prisma.user.findFirst({
        where: { email: data.email, NOT: { id: req.user.id } },
        select: { id: true },
      });

      if (clash) throw ApiError.conflict('That email is already in use');
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: { id: true, username: true, email: true, role: true },
    });

    res.json({ success: true, message: 'Profile updated', data: user });
  }),

  changePassword: asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    if (!(await bcrypt.compare(currentPassword, user.password))) {
      throw ApiError.badRequest('Current password is incorrect');
    }

    await prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(newPassword, 10) } });

    // Force other devices to sign in again.
    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });

    res.json({ success: true, message: 'Password updated' });
  }),
};
