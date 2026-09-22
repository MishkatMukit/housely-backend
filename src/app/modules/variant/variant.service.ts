import { prisma } from "../../lib/prisma";
import  httpStatus  from "http-status";
import { AppError } from "../../utils/appError";
import { checkOwnerProperty } from "../../utils/checkOwenerProperty";
import type { ICreateFlatVariantPayload, IUpdateFlatVariantPayload } from "../../Interfaces/flat.interface";
import { cloudinary } from "../../lib/cloudinary";
import type { UploadApiResponse } from "cloudinary";

const createVariant = async (userId: string, propertyId: string, payload: ICreateFlatVariantPayload, files: Express.Multer.File[] = []) => {
    await checkOwnerProperty(userId, propertyId);

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
                            { resource_type: "image", folder: `housely/variants/${propertyId}` },
                            (error, result) => {
                                if (error) return reject(error);
                                if (!result) return reject(new AppError("File Upload Failed", httpStatus.INTERNAL_SERVER_ERROR));
                                resolve(result);
                            },
                        )
                        .end(file?.buffer);
                });
            uploadedResults.push(...(await Promise.all(files.map(uploadOne))));
        }

        const images = uploadedResults.map((result) => ({ url: result.secure_url, publicId: result.public_id }));

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
                data: flatNumbers.map((flatNumber) => ({ propertyId, variantId: variant.id, flatNumber, status: "AVAILABLE" as const })),
            });
            await tx.property.update({ where: { id: propertyId }, data: { totalFlats: { increment: payload.totalUnits } } });
            return tx.flatVariant.findUnique({ where: { id: variant.id }, include: { flats: true } });
        });
        return result;
    } catch (error) {
        await Promise.all(uploadedResults.map((r) => cloudinary.uploader.destroy(r.public_id).catch(() => null)));
        throw error;
    }
};
const getAllVariants = async () => {
    const result =  prisma.flatVariant.findMany({
        include: {
            property: { select: { id: true, title: true, address: true, city: true, district: true, ownerId: true } },
            _count: { select: { flats: true } },
        },
        orderBy: { createdAt: "desc" },
    });
    return result
};
const listVariants = async (propertyId: string) => {
    return prisma.flatVariant.findMany({
        where: { propertyId },
        include: { _count: { select: { flats: true } } },
        orderBy: { createdAt: "asc" },
    });
};
const deleteVariant = async (userId: string, variantId: string) => {
    const variant = await prisma.flatVariant.findUnique({ where: { id: variantId }, include: { flats: { include: { leases: true, applications: true } } } });
    if (!variant) throw new AppError("Variant Not Found", httpStatus.NOT_FOUND);
    await checkOwnerProperty(userId, variant.propertyId);

    const hasActive = variant.flats.some(
        (f) => f.leases.length > 0 || f.applications.some((a) => ["PENDING", "APPROVED"].includes((a as { status: string }).status)),
    );
    if (hasActive) throw new AppError("Cannot delete variant with active leases or applications", httpStatus.CONFLICT);

    await prisma.$transaction(async (tx) => {
        await tx.flat.deleteMany({ where: { variantId } });
        await tx.flatVariant.delete({ where: { id: variantId } });
        await tx.property.update({ where: { id: variant.propertyId }, data: { totalFlats: { decrement: variant.totalUnits } } });
    });
};
const updateVariant = async (userId: string, variantId: string, payload: IUpdateFlatVariantPayload) => {
    const variant = await prisma.flatVariant.findUnique({ where: { id: variantId } });
    if (!variant) throw new AppError("Variant Not Found", httpStatus.NOT_FOUND);
    await checkOwnerProperty(userId, variant.propertyId);
    return prisma.flatVariant.update({
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
};


export const variantService = {
    createVariant,
    deleteVariant,
    updateVariant,
    listVariants,
    getAllVariants
}