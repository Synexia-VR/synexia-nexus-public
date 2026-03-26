/*
  Warnings:

  - You are about to drop the column `displayName` on the `Game` table. All the data in the column will be lost.
  - The primary key for the `Module` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `createdAt` on the `Module` table. All the data in the column will be lost.
  - You are about to drop the column `displayName` on the `Module` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `Module` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Module` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `OrganizationModule` table. All the data in the column will be lost.
  - You are about to drop the column `moduleId` on the `OrganizationModule` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `OrganizationUser` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[code]` on the table `Game` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[organizationId,moduleCode]` on the table `OrganizationModule` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `Game` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gameType` to the `Game` table without a default value. This is not possible if the table is not empty.
  - Added the required column `code` to the `Module` table without a default value. This is not possible if the table is not empty.
  - Added the required column `moduleCode` to the `OrganizationModule` table without a default value. This is not possible if the table is not empty.
  - Added the required column `passwordHash` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "OrganizationModule" DROP CONSTRAINT "OrganizationModule_moduleId_fkey";

-- DropIndex
DROP INDEX "Game_name_key";

-- DropIndex
DROP INDEX "Module_name_key";

-- DropIndex
DROP INDEX "OrganizationModule_organizationId_moduleId_key";

-- AlterTable
ALTER TABLE "Game" DROP COLUMN "displayName",
ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "gameType" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Module" DROP CONSTRAINT "Module_pkey",
DROP COLUMN "createdAt",
DROP COLUMN "displayName",
DROP COLUMN "id",
DROP COLUMN "updatedAt",
ADD COLUMN     "code" TEXT NOT NULL,
ADD CONSTRAINT "Module_pkey" PRIMARY KEY ("code");

-- AlterTable
ALTER TABLE "OrganizationModule" DROP COLUMN "isActive",
DROP COLUMN "moduleId",
ADD COLUMN     "enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "moduleCode" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "OrganizationUser" DROP COLUMN "status";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "name",
DROP COLUMN "password",
ADD COLUMN     "passwordHash" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Game_code_key" ON "Game"("code");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationModule_organizationId_moduleCode_key" ON "OrganizationModule"("organizationId", "moduleCode");

-- AddForeignKey
ALTER TABLE "OrganizationModule" ADD CONSTRAINT "OrganizationModule_moduleCode_fkey" FOREIGN KEY ("moduleCode") REFERENCES "Module"("code") ON DELETE CASCADE ON UPDATE CASCADE;
