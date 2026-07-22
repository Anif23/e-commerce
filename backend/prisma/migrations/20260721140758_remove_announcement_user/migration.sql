/*
  Warnings:

  - You are about to drop the column `isRead` on the `Announcement` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Announcement` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Announcement" DROP CONSTRAINT "Announcement_userId_fkey";

-- AlterTable
ALTER TABLE "Announcement" DROP COLUMN "isRead",
DROP COLUMN "userId";
