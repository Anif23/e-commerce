import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  parentId: z
    .union([z.coerce.number(), z.null()])
    .optional()
});

export const createProductSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  price: z.coerce.number().positive("Price must be > 0"),
  stock: z.coerce.number().int().nonnegative("Stock must be >= 0"),
  isActive: z.coerce.boolean().optional(),
  categoryId: z.coerce.number()
});

export const updateProductSchema = createProductSchema.partial().extend({
  deleteImages: z
    .union([z.array(z.coerce.number()), z.coerce.number()])
    .optional()
});

export const cartSchema = z.object({
  productId: z.coerce.number(),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1")
});

export const checkoutSchema = z.object({
  paymentMethod: z.enum(["COD", "PAYPAL"]),
});