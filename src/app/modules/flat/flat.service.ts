import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/appError";
import httpStatus from "http-status";
import type { ICreateFlatVariantPayload } from "../../Interfaces/flat.interface";

const assertOwnerProperty = async (userId: string, propertyId: string) => {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: { owner: { select: { userId: true } } },
  });
  if (!property) throw new AppError("Property Not Found", httpStatus.NOT_FOUND);
  if (property.owner.userId !== userId) throw new AppError("Forbidden: not your property", httpStatus.FORBIDDEN);
  return property;
};

const createVariant = async (userId: string, propertyId: string, payload: ICreateFlatVariantPayload) => {
  await assertOwnerProperty(userId, propertyId);

  const prefix = (payload.flatNumberPrefix ?? payload.name.replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase()) || "FLAT";
  const variantCount = await prisma.flatVariant.count({ where: { propertyId } });
  if (variantCount >= 5) throw new AppError("Maximum 5 variants per property", httpStatus.BAD_REQUEST);

  
  const existingNumbers = await prisma.flat.findMany({
    where: { propertyId },
    select: { flatNumber: true },
  });
  const existingSet = new Set(existingNumbers.map((f) => f.flatNumber));

  const flatNumbers: string[] = [];
  let seq = 101;
  while (flatNumbers.length < payload.totalUnits) {
    const candidate = `${prefix}-${seq}`;
    if (!existingSet.has(candidate)) flatNumbers.push(candidate);
    seq++;
    if (seq > 9999) throw new AppError("Flat number space exhausted", httpStatus.INTERNAL_SERVER_ERROR);
  }

  const result = await prisma.$transaction(async (tx) => {
    const variant = await tx.flatVariant.create({
      data: {
        propertyId,
        name: payload.name.trim(),
        bedrooms: payload.bedrooms,
        bathrooms: payload.bathrooms,
        sizeSqft: payload.sizeSqft ?? null,
        rentAmount: payload.rentAmount,
        advanceAmount: payload.advanceAmount,
        totalUnits: payload.totalUnits,
      },
    });

    await tx.flat.createMany({
      data: flatNumbers.map((flatNumber) => ({
        propertyId,
        variantId: variant.id,
        flatNumber,
        status: "AVAILABLE" as const,
      })),
    });

    await tx.property.update({
      where: { id: propertyId },
      data: { totalFlats: { increment: payload.totalUnits } },
    });

    return tx.flatVariant.findUnique({
      where: { id: variant.id },
      include: { flats: true },
    });
  });

  return result;
};

const listVariants = async (propertyId: string) => {
  return prisma.flatVariant.findMany({
    where: { propertyId },
    include: { _count: { select: { flats: true } } },
    orderBy: { createdAt: "asc" },
  });
};

const listFlats = async (propertyId: string, variantId?: string) => {
  return prisma.flat.findMany({
    where: { propertyId, ...(variantId ? { variantId } : {}) },
    include: { variant: true },
    orderBy: { flatNumber: "asc" },
  });
};

const getVacancy = async (propertyId: string, variantId?: string) => {
  return prisma.flat.count({
    where: { propertyId, ...(variantId ? { variantId } : {}), status: "AVAILABLE" },
  });
};

const deleteVariant = async (userId: string, variantId: string) => {
  const variant = await prisma.flatVariant.findUnique({
    where: { id: variantId },
    include: { flats: { include: { leases: true, applications: true } } },
  });
  if (!variant) throw new AppError("Variant Not Found", httpStatus.NOT_FOUND);
  await assertOwnerProperty(userId, variant.propertyId);

  const hasActive = variant.flats.some(
    (f) => f.leases.length > 0 || f.applications.some((a) => ["PENDING", "APPROVED"].includes((a as { status: string }).status)),
  );
  if (hasActive) throw new AppError("Cannot delete variant with active leases or applications", httpStatus.CONFLICT);

  await prisma.$transaction(async (tx) => {
    await tx.flat.deleteMany({ where: { variantId } });
    await tx.flatVariant.delete({ where: { id: variantId } });
    await tx.property.update({
      where: { id: variant.propertyId },
      data: { totalFlats: { decrement: variant.totalUnits } },
    });
  });
};

export const flatService = {
  createVariant,
  listVariants,
  listFlats,
  getVacancy,
  deleteVariant,
};
