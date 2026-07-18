-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('COD', 'PAYPAL');

-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'PROCESSING';

-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'REFUNDED';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "payerEmail" TEXT,
ADD COLUMN     "payerId" TEXT;
