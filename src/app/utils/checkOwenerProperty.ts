import { prisma } from "../lib/prisma";
import { AppError } from "./appError";
import httpStatus from "http-status"
export const checkOwnerProperty = async (userId: string, propertyId: string) => {
    const property = await prisma.property.findUnique({
        where: { id: propertyId },
        include: { owner: { select: { userId: true } } },
    });
    if (!property) throw new AppError("Property Not Found", httpStatus.NOT_FOUND);
    if (property.owner.userId !== userId) throw new AppError("Forbidden: not your property", httpStatus.FORBIDDEN);
    return property;
};