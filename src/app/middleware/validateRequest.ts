import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ZodType } from "zod";

const validateRequest = (schema: ZodType): RequestHandler => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
};

export const validateQuery = (schema: ZodType): RequestHandler => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.query = (await schema.parseAsync(req.query)) as typeof req.query;
      next();
    } catch (error) {
      next(error);
    }
  };
};

export const validateParams = (schema: ZodType): RequestHandler => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.params = (await schema.parseAsync(req.params)) as typeof req.params;
      next();
    } catch (error) {
      next(error);
    }
  };
};

export default validateRequest;
