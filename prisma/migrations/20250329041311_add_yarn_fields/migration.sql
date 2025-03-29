/*
  Warnings:

  - Added the required column `fiber` to the `yarns` table without a default value. This is not possible if the table is not empty.
  - Made the column `brand` on table `yarns` required. This step will fail if there are existing NULL values in that column.
  - Made the column `weight` on table `yarns` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "yarns" ADD COLUMN     "dyeingStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN     "fiber" TEXT NOT NULL,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "unit" TEXT NOT NULL DEFAULT 'grams',
ALTER COLUMN "brand" SET NOT NULL,
ALTER COLUMN "weight" SET NOT NULL,
ALTER COLUMN "quantity" SET DEFAULT 0,
ALTER COLUMN "quantity" SET DATA TYPE DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "yarn_photos" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "yarnId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "yarn_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "yarn_tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "yarnId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "yarn_tags_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "yarn_photos" ADD CONSTRAINT "yarn_photos_yarnId_fkey" FOREIGN KEY ("yarnId") REFERENCES "yarns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "yarn_tags" ADD CONSTRAINT "yarn_tags_yarnId_fkey" FOREIGN KEY ("yarnId") REFERENCES "yarns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
