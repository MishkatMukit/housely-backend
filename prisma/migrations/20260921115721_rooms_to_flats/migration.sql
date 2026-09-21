/*
  Warnings:

  - You are about to drop the column `roomId` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `roomId` on the `leases` table. All the data in the column will be lost.
  - You are about to drop the column `totalRooms` on the `properties` table. All the data in the column will be lost.
  - You are about to drop the `rooms` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `flatId` to the `applications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `flatId` to the `leases` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalFlats` to the `properties` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "FlatStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'UNAVAILABLE');

-- DropForeignKey
ALTER TABLE "applications" DROP CONSTRAINT "applications_roomId_fkey";

-- DropForeignKey
ALTER TABLE "leases" DROP CONSTRAINT "leases_roomId_fkey";

-- DropForeignKey
ALTER TABLE "rooms" DROP CONSTRAINT "rooms_propertyId_fkey";

-- DropIndex
DROP INDEX "applications_roomId_idx";

-- DropIndex
DROP INDEX "leases_roomId_idx";

-- AlterTable
ALTER TABLE "applications" DROP COLUMN "roomId",
ADD COLUMN     "flatId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "leases" DROP COLUMN "roomId",
ADD COLUMN     "flatId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "properties" DROP COLUMN "totalRooms",
ADD COLUMN     "totalFlats" INTEGER NOT NULL;

-- DropTable
DROP TABLE "rooms";

-- DropEnum
DROP TYPE "RoomStatus";

-- CreateTable
CREATE TABLE "flat_variants" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bedrooms" INTEGER NOT NULL,
    "bathrooms" INTEGER NOT NULL,
    "sizeSqft" INTEGER,
    "rentAmount" DECIMAL(15,2) NOT NULL,
    "advanceAmount" DECIMAL(15,2) NOT NULL,
    "totalUnits" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flat_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flats" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "flatNumber" TEXT NOT NULL,
    "status" "FlatStatus" NOT NULL DEFAULT 'AVAILABLE',
    "rentOverride" DECIMAL(15,2),
    "advanceOverride" DECIMAL(15,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "flat_variants_propertyId_idx" ON "flat_variants"("propertyId");

-- CreateIndex
CREATE INDEX "flats_propertyId_idx" ON "flats"("propertyId");

-- CreateIndex
CREATE INDEX "flats_variantId_idx" ON "flats"("variantId");

-- CreateIndex
CREATE INDEX "flats_status_idx" ON "flats"("status");

-- CreateIndex
CREATE UNIQUE INDEX "flats_propertyId_flatNumber_key" ON "flats"("propertyId", "flatNumber");

-- CreateIndex
CREATE INDEX "applications_flatId_idx" ON "applications"("flatId");

-- CreateIndex
CREATE INDEX "leases_flatId_idx" ON "leases"("flatId");

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_flatId_fkey" FOREIGN KEY ("flatId") REFERENCES "flats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flat_variants" ADD CONSTRAINT "flat_variants_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flats" ADD CONSTRAINT "flats_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flats" ADD CONSTRAINT "flats_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "flat_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leases" ADD CONSTRAINT "leases_flatId_fkey" FOREIGN KEY ("flatId") REFERENCES "flats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
