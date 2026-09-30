import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';

export const DEFAULT_STORE_SETTINGS = {
  id: 1,
  storeName: 'Asnif Store',
  tagline: 'Premium shopping experience with top quality products.',
  logoUrl: null,
  supportEmail: 'support@asnifstore.in',
  supportPhone: '+91 98765 43210',
  supportHours: 'Mon–Sat, 10:00–19:00 IST',
  businessAddress: 'Asnif Retail Pvt Ltd, 42 Gandhi Nagar, Thoothukudi, Tamil Nadu 628001, India',
  taxName: 'GST',
  taxRatePercent: env.taxRatePercent,
  shippingFee: env.shippingFee,
  freeShippingThreshold: env.freeShippingThreshold,
  updatedAt: null,
};

/** Returns the persisted store policy, with environment defaults for an unmigrated database. */
export const getStoreSettings = async () =>
  (await prisma.storeSetting.findUnique({ where: { id: 1 } })) ?? DEFAULT_STORE_SETTINGS;

export const saveStoreSettings = async (data) => {
  const current = await getStoreSettings();
  const next = { ...current, ...data };

  const createData = { ...next };
  delete createData.updatedAt;
  return prisma.storeSetting.upsert({
    where: { id: 1 },
    create: { id: 1, ...createData },
    update: data,
  });
};
