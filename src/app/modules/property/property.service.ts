import { OwnerStatus } from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/appError";
import httpStatus from "http-status";
import type { UploadApiResponse } from "cloudinary";
import { cloudinary } from "../../lib/cloudinary";
import type { ICreatePropertyPayload, IListPropertiesQuery } from "../../Interfaces/property.interface";
import type { IAddFlatsPayload, ICreateFlatVariantPayload, IUpdateFlatVariantPayload } from "../../Interfaces/flat.interface";
import { checkOwnerProperty } from "../../utils/checkOwenerProperty";

const createProperty = async (userId: string, payload: ICreatePropertyPayload, files: Express.Multer.File[] = []) => {
    const owner = await prisma.owner.findUnique({
        where: { userId },
    });

    if (!owner || owner.status !== OwnerStatus.APPROVED) {
        throw new AppError("Only approved owners can create properties", httpStatus.FORBIDDEN);
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
                                folder: `housely/properties/${owner.id}`,
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

        const property = await prisma.property.create({
            data: {
                ownerId: owner.id,
                title: payload.title.trim(),
                description: payload.description?.trim() || null,
                address: payload.address.trim(),
                city: payload.city.trim(),
                district: payload.district.trim(),
                postalCode: payload.postalCode?.trim() || null,
                companyName: payload.companyName?.trim() || null,
                totalFlats: 0,
                ...(images.length > 0 ? { images } : {}),
            },
            include: {
                owner: {
                    select: {
                        id: true,
                        user: { select: { id: true, name: true } },
                    },
                },
                _count: { select: { flats: true } },
            },
        });

        return property;
    } catch (error) {
        await Promise.all(
            uploadedResults.map((result) => cloudinary.uploader.destroy(result.public_id).catch(() => null)),
        );
        throw error;
    }
};

const listProperties = async (query: IListPropertiesQuery) => {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const whereCondition: Record<string, unknown> = {};

    if (query.ownerId) {
        whereCondition.ownerId = query.ownerId;
    }

    if (query.city) {
        whereCondition.city = { contains: query.city, mode: "insensitive" };
    }

    if (query.district) {
        whereCondition.district = { contains: query.district, mode: "insensitive" };
    }

    if (query.search) {
        whereCondition.OR = [
            { title: { contains: query.search, mode: "insensitive" } },
            { address: { contains: query.search, mode: "insensitive" } },
            { city: { contains: query.search, mode: "insensitive" } },
            { district: { contains: query.search, mode: "insensitive" } },
        ];
    }

    const [properties, total] = await Promise.all([
        prisma.property.findMany({
            where: whereCondition,
            skip,
            take: limit,
            include: {
                owner: {
                    select: {
                        id: true,
                        user: { select: { id: true, name: true } },
                    },
                },
                _count: { select: { flats: true } },
            },
            orderBy: { createdAt: "desc" },
        }),
        prisma.property.count({ where: whereCondition }),
    ]);

    return {
        data: properties,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
    };
};

const getProperty = async (propertyId: string) => {
    const property = await prisma.property.findUnique({
        where: { id: propertyId },
        include: {
            owner: {
                select: {
                    id: true,
                    user: { select: { id: true, name: true } },
                },
            },
            _count: { select: { flats: true } },
        },
    });

    if (!property) {
        throw new AppError("Property Not Found", httpStatus.NOT_FOUND);
    }

    return property;
};



// ---------------------------------------------------------------------------
// Variants + property-scoped flats (moved from flat.service)
// ---------------------------------------------------------------------------

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
const getVacancy = async (propertyId: string, variantId?: string) => {
    return prisma.flat.count({
        where: { propertyId, ...(variantId ? { variantId } : {}), status: "AVAILABLE" },
    });
};

export const propertyService = {
    createProperty,
    listProperties,
    getProperty,
    createVariant,
    getVacancy
};
