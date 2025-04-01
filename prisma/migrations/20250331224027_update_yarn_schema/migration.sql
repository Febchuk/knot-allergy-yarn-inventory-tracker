/*
  Warnings:

  - You are about to drop the column `dyeingStatus` on the `yarns` table. All the data in the column will be lost.
  - You are about to drop the column `fiber` on the `yarns` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `yarns` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `yarns` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `yarns` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `yarns` table. All the data in the column will be lost.
  - Added the required column `materials` to the `yarns` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organization` to the `yarns` table without a default value. This is not possible if the table is not empty.
  - Added the required column `productLine` to the `yarns` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalWeight` to the `yarns` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalYards` to the `yarns` table without a default value. This is not possible if the table is not empty.
  - Added the required column `yardsPerOz` to the `yarns` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `weight` on the `yarns` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "yarns" DROP COLUMN "dyeingStatus",
DROP COLUMN "fiber",
DROP COLUMN "name",
DROP COLUMN "notes",
DROP COLUMN "quantity",
DROP COLUMN "unit",
ADD COLUMN     "materials" TEXT NOT NULL,
ADD COLUMN     "organization" TEXT NOT NULL,
ADD COLUMN     "productLine" TEXT NOT NULL,
ADD COLUMN     "totalWeight" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "totalYards" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "yardsPerOz" DOUBLE PRECISION NOT NULL,
DROP COLUMN "weight",
ADD COLUMN     "weight" INTEGER NOT NULL;
