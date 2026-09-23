-- AlterTable
ALTER TABLE "payments" ADD COLUMN "periodStart" TIMESTAMP(3),
ADD COLUMN "periodEnd" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "payments_leaseId_type_periodStart_key" ON "payments"("leaseId", "type", "periodStart");