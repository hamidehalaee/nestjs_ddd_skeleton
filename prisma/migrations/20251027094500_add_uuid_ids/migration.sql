/*
  Warnings:

  - The primary key for the `Sessions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `userId` on the `Sessions` table. All the data in the column will be lost.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[id]` on the table `Sessions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "public"."Sessions" DROP CONSTRAINT "Sessions_userId_fkey";

-- DropIndex
DROP INDEX "public"."Sessions_device_lastActive_userId_idx";

-- DropIndex
DROP INDEX "public"."Sessions_userId_idx";

-- AlterTable
ALTER TABLE "Sessions" DROP CONSTRAINT "Sessions_pkey",
DROP COLUMN "userId",
ADD COLUMN     "uid" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD COLUMN     "userUid" UUID,
ADD CONSTRAINT "Sessions_pkey" PRIMARY KEY ("uid");

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
ADD COLUMN     "uid" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("uid");

-- CreateIndex
CREATE UNIQUE INDEX "Sessions_id_key" ON "Sessions"("id");

-- CreateIndex
CREATE INDEX "Sessions_userUid_idx" ON "Sessions"("userUid");

-- CreateIndex
CREATE INDEX "Sessions_device_lastActive_userUid_idx" ON "Sessions"("device", "lastActive", "userUid");

-- CreateIndex
CREATE UNIQUE INDEX "User_id_key" ON "User"("id");

-- AddForeignKey
ALTER TABLE "Sessions" ADD CONSTRAINT "Sessions_userUid_fkey" FOREIGN KEY ("userUid") REFERENCES "User"("uid") ON DELETE NO ACTION ON UPDATE NO ACTION;
