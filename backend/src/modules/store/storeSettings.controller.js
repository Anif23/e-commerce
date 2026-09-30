import { z } from 'zod';

import { asyncHandler, ApiError } from '../../lib/errors.js';
import { deleteFiles, deleteStoredFiles, fileUrl } from '../../middleware/upload.js';
import { getStoreSettings, saveStoreSettings } from './storeSettings.service.js';

const settingsSchema = z.object({
  storeName: z.string().trim().min(1).max(120).optional(),
  tagline: z.string().trim().max(240).optional(),
  logoUrl: z.union([z.string().url(), z.literal(''), z.null()]).transform((value) => value || null).optional(),
  supportEmail: z.string().trim().email().max(180).optional(),
  supportPhone: z.string().trim().min(3).max(40).optional(),
  supportHours: z.string().trim().max(120).optional(),
  businessAddress: z.string().trim().max(300).optional(),
  taxName: z.string().trim().min(1).max(32).optional(),
  taxRatePercent: z.coerce.number().min(0).max(100).optional(),
  shippingFee: z.coerce.number().min(0).max(1_000_000).optional(),
  freeShippingThreshold: z.coerce.number().min(0).max(10_000_000).optional(),
}).strict();

export const storeSettingsController = {
  public: asyncHandler(async (_req, res) => {
    res.json({ success: true, data: await getStoreSettings() });
  }),

  adminGet: asyncHandler(async (_req, res) => {
    res.json({ success: true, data: await getStoreSettings() });
  }),

  update: asyncHandler(async (req, res) => {
    const data = settingsSchema.parse(req.body);
    const previous = await getStoreSettings();
    const settings = await saveStoreSettings(data);
    if (previous.logoUrl && previous.logoUrl !== settings.logoUrl) await deleteStoredFiles(previous.logoUrl);
    res.json({ success: true, message: 'Store settings saved', data: settings });
  }),

  uploadLogo: asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest('Choose a logo image to upload');
    let previous;
    let settings;
    try {
      previous = await getStoreSettings();
      settings = await saveStoreSettings({ logoUrl: fileUrl(req.file) });
    } catch (error) {
      await deleteFiles(req.file);
      throw error;
    }
    if (previous.logoUrl && previous.logoUrl !== settings.logoUrl) await deleteStoredFiles(previous.logoUrl);
    res.json({ success: true, message: 'Store logo updated', data: settings });
  }),
};
