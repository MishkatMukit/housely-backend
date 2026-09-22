import type { NextFunction, Request, Response } from "express";
import { UserStatus, type Role } from "../../generated/prisma/enums";
import catchAsync from "../utils/catchAsync";
import config from "../config";
import { jwtUtils } from "../utils/jwt";
import type { JwtPayload } from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/appError";
import httpStatus from "http-status";

const auth = (...requiredRoles: Role[]) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const token =
      req.cookies?.accessToken ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization?.split(" ")[1]
        : req.headers.authorization);

    if (!token) {
      throw new AppError("You are not logged in. Please login to access resources.", httpStatus.UNAUTHORIZED);
    }

    const verifiedToken = jwtUtils.verifyToken(token as string, config.jwt_access_secret);

    if (!verifiedToken.success) {
      throw new AppError(verifiedToken.error, httpStatus.UNAUTHORIZED);
    }

    const { userId, role } = verifiedToken.data as JwtPayload & { userId?: string };

    if (!userId) {
      throw new AppError("Invalid access token. Please login again.", httpStatus.UNAUTHORIZED);
    }

    if (requiredRoles.length && !requiredRoles.includes(role as Role)) {
      throw new AppError("Forbidden. You don't have permission to access this resource", httpStatus.FORBIDDEN);
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId
      },
    });

    if (!user) {
      throw new AppError("User not found. Please login again.", httpStatus.UNAUTHORIZED);
    }

    if (user.status === UserStatus.BLOCKED) {
      throw new AppError("Your account has been suspended. Please contact support.", httpStatus.FORBIDDEN);
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    next();
  });
};
export default auth;
