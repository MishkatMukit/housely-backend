import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/appError";
import httpStatus from "http-status";
import type { UploadApiResponse } from "cloudinary";
import { cloudinary } from "../../lib/cloudinary";
import type { IAddFlatsPayload, ICreateFlatVariantPayload, IListAllFlatsQuery, IUpdateFlatPayload, IUpdateFlatVariantPayload } from "../../Interfaces/flat.interface";

const assertOwnerProperty = async (userId: string, propertyId: string) => {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: { owner: { select: { userId: true } } },
  });
  if (!property) throw new AppError("Property Not Found", httpStatus.NOT_FOUND);
  if (property.owner.userId !== userId) throw new AppError("Forbidden: not your property", httpStatus.FORBIDDEN);
  return property;
};

const createVariant = async (userId: string, propertyId: string, payload: ICreateFlatVariantPayload, files: Express.Multer.File[] = []) => {
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

  const uploadedResults: UploadApiResponse[] = [];
  try {
    if (files.length > 0) {
      const uploadOne = (file: Express.Multer.File) =>
        new Promise<UploadApiResponse>((resolve, reject) => {
          cloudinary.uploader
            .upload_stream(
              {
                resource_type: "image",
                folder: `housely/variants/${propertyId}`,
              },
              (error, result) => {
                if (error) return reject(error);
                if (!result) {
                  return reject(
                    new AppError("File Upload Failed", httpStatus.INTERNAL_SERVER_ERROR),
                  );
                }
                resolve(result);
              },
            )
            .end(file?.buffer);
        });
      uploadedResults.push(...(await Promise.all(files.map(uploadOne))));
    }

    const images = uploadedResults.map((result) => ({
      url: result.secure_url,
      publicId: result.public_id,
    }));

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
          ...(images.length > 0 ? { images } : {}),
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
  } catch (error) {
    await Promise.all(
      uploadedResults.map((result) => cloudinary.uploader.destroy(result.public_id).catch(() => null)),
    );
    throw error;
  }
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

const getAllFlats = async (query: IListAllFlatsQuery) => {
  const page = query.page || 1;
  const limit = query.limit || 10;
  const skip = (page - 1) * limit;

  const whereCondition: Record<string, unknown> = {
    ...(query.status ? { status: query.status } : { status: "AVAILABLE" }),
    ...(query.minBedrooms !== undefined ? { variant: { bedrooms: { gte: query.minBedrooms } } } : {}),
    ...(query.maxRent !== undefined ? { variant: { rentAmount: { lte: query.maxRent } } } : {}),
    ...(query.city || query.district
      ? {
          property: {
            ...(query.city ? { city: { contains: query.city, mode: "insensitive" } } : {}),
            ...(query.district ? { district: { contains: query.district, mode: "insensitive" } } : {}),
          },
        }
      : {}),
  };

  const [flats, total] = await Promise.all([
    prisma.flat.findMany({
      where: whereCondition,
      skip,
      take: limit,
      include: {
        variant: true,
        property: {
          select: {
            id: true,
            title: true,
            address: true,
            city: true,
            district: true,
            images: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.flat.count({ where: whereCondition }),
  ]);

  return {
    data: flats,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

const updateVariant = async (userId: string, variantId: string, payload: IUpdateFlatVariantPayload) => {
  const variant = await prisma.flatVariant.findUnique({
    where: { id: variantId },
  });
  if (!variant) throw new AppError("Variant Not Found", httpStatus.NOT_FOUND);
  await assertOwnerProperty(userId, variant.propertyId);

  const updated = await prisma.flatVariant.update({
    where: { id: variantId },
    data: {
      ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
      ...(payload.bedrooms !== undefined ? { bedrooms: payload.bedrooms } : {}),
      ...(payload.bathrooms !== undefined ? { bathrooms: payload.bathrooms } : {}),
      ...(payload.sizeSqft !== undefined ? { sizeSqft: payload.sizeSqft } : {}),
      ...(payload.rentAmount !== undefined ? { rentAmount: payload.rentAmount } : {}),
      ...(payload.advanceAmount !== undefined ? { advanceAmount: payload.advanceAmount } : {}),
    },
    include: { _count: { select: { flats: true } } },
  });

  return updated;
};

const addFlats = async (userId: string, variantId: string, payload: IAddFlatsPayload) => {
  const variant = await prisma.flatVariant.findUnique({
    where: { id: variantId },
  });
  if (!variant) throw new AppError("Variant Not Found", httpStatus.NOT_FOUND);
  await assertOwnerProperty(userId, variant.propertyId);

  const prefix = (payload.flatNumberPrefix ?? variant.name.replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase()) || "FLAT";
  const existingNumbers = await prisma.flat.findMany({
    where: { propertyId: variant.propertyId },
    select: { flatNumber: true },
  });
  const existingSet = new Set(existingNumbers.map((f) => f.flatNumber));

  const flatNumbers: string[] = [];
  let seq = 101;
  while (flatNumbers.length < payload.count) {
    const candidate = `${prefix}-${seq}`;
    if (!existingSet.has(candidate)) flatNumbers.push(candidate);
    seq++;
    if (seq > 9999) throw new AppError("Flat number space exhausted", httpStatus.INTERNAL_SERVER_ERROR);
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.flat.createMany({
      data: flatNumbers.map((flatNumber) => ({
        propertyId: variant.propertyId,
        variantId: variant.id,
        flatNumber,
        status: "AVAILABLE" as const,
      })),
    });

    await tx.flatVariant.update({
      where: { id: variantId },
      data: { totalUnits: { increment: payload.count } },
    });

    await tx.property.update({
      where: { id: variant.propertyId },
      data: { totalFlats: { increment: payload.count } },
    });

    return tx.flatVariant.findUnique({
      where: { id: variantId },
      include: { flats: { orderBy: { flatNumber: "asc" } } },
    });
  });

  return result;
};

const updateFlat = async (userId: string, flatId: string, payload: IUpdateFlatPayload) => {
  const flat = await prisma.flat.findUnique({
    where: { id: flatId },
  });
  if (!flat) throw new AppError("Flat Not Found", httpStatus.NOT_FOUND);
  await assertOwnerProperty(userId, flat.propertyId);

  if (payload.status !== undefined) {
    if (flat.status === "OCCUPIED") {
      throw new AppError("Occupied flats are managed by leases and cannot be updated manually", httpStatus.CONFLICT);
    }
    if (flat.status !== "AVAILABLE" && payload.status !== "AVAILABLE") {
      throw new AppError(`Cannot move flat from ${flat.status} to ${payload.status}. Set it AVAILABLE first.`, httpStatus.CONFLICT);
    }
  }

  if (payload.flatNumber !== undefined) {
    const trimmed = payload.flatNumber.trim();
    if (trimmed !== flat.flatNumber) {
      const clash = await prisma.flat.findUnique({
        where: { propertyId_flatNumber: { propertyId: flat.propertyId, flatNumber: trimmed } },
      });
      if (clash) throw new AppError("Flat number already exists in this property", httpStatus.CONFLICT);
    }
  }

  const updated = await prisma.flat.update({
    where: { id: flatId },
    data: {
      ...(payload.flatNumber !== undefined ? { flatNumber: payload.flatNumber.trim() } : {}),
      ...(payload.status !== undefined ? { status: payload.status } : {}),
      ...(payload.rentOverride !== undefined ? { rentOverride: payload.rentOverride } : {}),
      ...(payload.advanceOverride !== undefined ? { advanceOverride: payload.advanceOverride } : {}),
    },
    include: { variant: true },
  });

  return updated;
};

const deleteFlat = async (userId: string, flatId: string) => {
  const flat = await prisma.flat.findUnique({
    where: { id: flatId },
    include: { leases: true, applications: true },
  });
  if (!flat) throw new AppError("Flat Not Found", httpStatus.NOT_FOUND);
  await assertOwnerProperty(userId, flat.propertyId);

  if (flat.status !== "AVAILABLE") {
    throw new AppError("Only AVAILABLE flats can be deleted", httpStatus.CONFLICT);
  }
  if (flat.leases.length > 0) {
    throw new AppError("Cannot delete flat with lease history", httpStatus.CONFLICT);
  }
  const hasActiveApplication = flat.applications.some((a) =>
    ["PENDING", "APPROVED"].includes((a as { status: string }).status),
  );
  if (hasActiveApplication) {
    throw new AppError("Cannot delete flat with active applications", httpStatus.CONFLICT);
  }

  await prisma.$transaction(async (tx) => {
    await tx.flat.delete({ where: { id: flatId } });
    await tx.flatVariant.update({
      where: { id: flat.variantId },
      data: { totalUnits: { decrement: 1 } },
    });
    await tx.property.update({
      where: { id: flat.propertyId },
      data: { totalFlats: { decrement: 1 } },
    });
  });
};

const deleteVariant = async (userId: string, variantId: string) => {  const variant = await prisma.flatVariant.findUnique({
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
  getAllFlats,
  getVacancy,
  updateVariant,
  addFlats,
  updateFlat,
  deleteFlat,
  deleteVariant,
};
