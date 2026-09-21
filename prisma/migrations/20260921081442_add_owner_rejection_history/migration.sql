/*
  Warnings:

  - You are about to drop the column `companyName` on the `owners` table. All the data in the column will be lost.
  - The `gender` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "owners" DROP COLUMN "companyName",
ADD COLUMN     "rejectionHistory" JSONB DEFAULT '[]';

-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "companyName" TEXT;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "gender",
ADD COLUMN     "gender" TEXT;

-- DropEnum
DROP TYPE "Gender";
