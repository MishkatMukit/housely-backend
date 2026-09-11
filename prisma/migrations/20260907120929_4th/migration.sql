/*
  Warnings:

  - The values [DEACTIVATED] on the enum `ActiveStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `fullName` on the `users` table. All the data in the column will be lost.
  - Added the required column `name` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ActiveStatus_new" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');
ALTER TABLE "public"."users" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "status" TYPE "ActiveStatus_new" USING ("status"::text::"ActiveStatus_new");
ALTER TYPE "ActiveStatus" RENAME TO "ActiveStatus_old";
ALTER TYPE "ActiveStatus_new" RENAME TO "ActiveStatus";
DROP TYPE "public"."ActiveStatus_old";
ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "fullName",
ADD COLUMN     "name" TEXT NOT NULL;
