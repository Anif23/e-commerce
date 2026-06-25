import slugify from "slugify";
import crypto from "crypto";

export const slug = (v) =>
  slugify(v, {
    lower: true,
    strict: true,
  });

export const image = (file) =>
  file
    ? `${process.env.APP_URL}/uploads/${file.filename}`
    : null;

export const bool = (v) =>
  [true, "true", 1, "1"].includes(v);

export const num = (v) =>
  v !== undefined &&
  v !== null &&
  v !== ""
    ? Number(v)
    : undefined;

export const date = (v) =>
  v ? new Date(v) : undefined;

export const tags = (v) =>
  Array.isArray(v)
    ? v
    : v
        ?.split(",")
        .map((t) => t.trim())
        .filter(Boolean) || [];

export const sku = (
  name = "",
  category = ""
) =>
  `${category.slice(0, 4)}-${name.slice(0, 4)}-${crypto
    .randomBytes(3)
    .toString("hex")
    .toUpperCase()}`;

export const searchBy = (
  field,
  value
) =>
  value
    ? {
        [field]: {
          contains: value,
          mode: "insensitive",
        },
      }
    : {};
