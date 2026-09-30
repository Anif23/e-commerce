ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS 'RAZORPAY';

ALTER TABLE "Payment"
ADD COLUMN "gatewayOrderId" TEXT,
ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'INR',
ADD COLUMN "method" TEXT,
ADD COLUMN "payerContact" TEXT,
ADD COLUMN "capturedAt" TIMESTAMP(3);

ALTER TABLE "Order"
ADD COLUMN "taxName" TEXT NOT NULL DEFAULT 'GST',
ADD COLUMN "taxRatePercent" DOUBLE PRECISION NOT NULL DEFAULT 18;

CREATE TABLE "StoreSetting" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "storeName" TEXT NOT NULL DEFAULT 'Asnif Store',
    "tagline" TEXT NOT NULL DEFAULT 'Premium shopping experience with top quality products.',
    "logoUrl" TEXT,
    "supportEmail" TEXT NOT NULL DEFAULT 'support@asnifstore.in',
    "supportPhone" TEXT NOT NULL DEFAULT '+91 98765 43210',
    "supportHours" TEXT NOT NULL DEFAULT 'Mon–Sat, 10:00–19:00 IST',
    "businessAddress" TEXT NOT NULL DEFAULT 'Asnif Retail Pvt Ltd, 42 Gandhi Nagar, Thoothukudi, Tamil Nadu 628001, India',
    "taxName" TEXT NOT NULL DEFAULT 'GST',
    "taxRatePercent" DOUBLE PRECISION NOT NULL DEFAULT 18,
    "shippingFee" DOUBLE PRECISION NOT NULL DEFAULT 49,
    "freeShippingThreshold" DOUBLE PRECISION NOT NULL DEFAULT 999,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreSetting_pkey" PRIMARY KEY ("id")
);

