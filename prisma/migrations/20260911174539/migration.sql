/*
  Warnings:

  - You are about to drop the column `phoneNumber` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[email]` on the table `tenants` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `email` to the `tenants` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `tenants` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "contactNumber" TEXT,
ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "phoneNumber";

-- CreateIndex
CREATE UNIQUE INDEX "tenants_email_key" ON "tenants"("email");
