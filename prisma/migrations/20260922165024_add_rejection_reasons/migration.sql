-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "rejectionReason" TEXT;

-- AlterTable
ALTER TABLE "leases" ADD COLUMN     "rejectionReason" TEXT;
