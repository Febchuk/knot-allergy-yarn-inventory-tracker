/*
  Warnings:

  - You are about to drop the column `color` on the `yarns` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "yarns" DROP COLUMN "color",
ADD COLUMN     "currColor" TEXT,
ADD COLUMN     "dyeStatus" TEXT NOT NULL DEFAULT 'NOT_TO_BE_DYED',
ADD COLUMN     "nextColor" TEXT,
ADD COLUMN     "prevColor" TEXT;
