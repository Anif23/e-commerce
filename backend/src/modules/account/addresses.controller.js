import { z } from 'zod';

import { prisma } from '../../lib/prisma.js';
import { ApiError, asyncHandler } from '../../lib/errors.js';

export const addressSchema = z.object({
  label: z.string().trim().max(40).optional(),
  fullName: z.string().trim().min(2, 'Name is required'),
  phone: z.string().trim().min(6, 'Phone number is required'),
  address1: z.string().trim().min(3, 'Street address is required'),
  address2: z.string().trim().max(120).optional(),
  city: z.string().trim().min(2, 'City is required'),
  state: z.string().trim().min(2, 'State is required'),
  country: z.string().trim().min(2, 'Country is required'),
  zipCode: z.string().trim().min(3, 'Postal code is required'),
  isDefault: z.boolean().optional(),
});

const clearDefault = (userId, exceptId) =>
  prisma.address.updateMany({
    where: { userId, ...(exceptId ? { id: { not: exceptId } } : {}) },
    data: { isDefault: false },
  });

const owned = async (id, userId) => {
  const address = await prisma.address.findFirst({ where: { id: Number(id), userId } });
  if (!address) throw ApiError.notFound('Address not found');
  return address;
};

export const addressesController = {
  list: asyncHandler(async (req, res) => {
    const addresses = await prisma.address.findMany({
      where: { userId: req.user.id },
      orderBy: [{ isDefault: 'desc' }, { id: 'desc' }],
    });

    res.json({ success: true, data: addresses });
  }),

  create: asyncHandler(async (req, res) => {
    const data = addressSchema.parse(req.body);

    if (data.isDefault) await clearDefault(req.user.id);

    // First address automatically becomes the default.
    const count = await prisma.address.count({ where: { userId: req.user.id } });

    const address = await prisma.address.create({
      data: { ...data, userId: req.user.id, isDefault: data.isDefault ?? count === 0 },
    });

    res.status(201).json({ success: true, message: 'Address saved', data: address });
  }),

  update: asyncHandler(async (req, res) => {
    const address = await owned(req.params.id, req.user.id);
    const data = addressSchema.partial().parse(req.body);

    if (data.isDefault) await clearDefault(req.user.id, address.id);

    const updated = await prisma.address.update({ where: { id: address.id }, data });

    res.json({ success: true, message: 'Address updated', data: updated });
  }),

  remove: asyncHandler(async (req, res) => {
    const address = await owned(req.params.id, req.user.id);

    await prisma.address.delete({ where: { id: address.id } });

    if (address.isDefault) {
      const next = await prisma.address.findFirst({ where: { userId: req.user.id }, orderBy: { id: 'desc' } });
      if (next) await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
    }

    res.json({ success: true, message: 'Address deleted' });
  }),

  setDefault: asyncHandler(async (req, res) => {
    const address = await owned(req.params.id, req.user.id);

    await clearDefault(req.user.id);
    const updated = await prisma.address.update({ where: { id: address.id }, data: { isDefault: true } });

    res.json({ success: true, message: 'Default address updated', data: updated });
  }),
};
