/*
  Warnings:

  - You are about to drop the column `organization` on the `yarns` table. All the data in the column will be lost.
  - The `dyeStatus` column on the `yarns` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "DyeStatus" AS ENUM ('NOT_TO_BE_DYED', 'TO_BE_DYED', 'HAS_BEEN_DYED');

-- AlterTable
ALTER TABLE "yarns" DROP COLUMN "organization",
ALTER COLUMN "yardsPerOz" SET DATA TYPE TEXT,
DROP COLUMN "dyeStatus",
ADD COLUMN     "dyeStatus" "DyeStatus" NOT NULL DEFAULT 'NOT_TO_BE_DYED';

-- CreateTable
CREATE TABLE "yarn_organization_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "yarn_organization_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "yarn_organizations" (
    "id" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "yarnId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "yarn_organizations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "yarn_organization_types_name_key" ON "yarn_organization_types"("name");

-- AddForeignKey
ALTER TABLE "yarn_organization_types" ADD CONSTRAINT "yarn_organization_types_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "yarn_organizations" ADD CONSTRAINT "yarn_organizations_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "yarn_organization_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "yarn_organizations" ADD CONSTRAINT "yarn_organizations_yarnId_fkey" FOREIGN KEY ("yarnId") REFERENCES "yarns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
