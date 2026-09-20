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
      const parsed = (await schema.parseAsync(req.query)) as Record<
        string,
        unknown
      >;
      // Express 5: req.query is getter-only, mutate in place instead of reassigning
      for (const key of Object.keys(req.query)) {
        if (!(key in parsed)) {
          delete (req.query as Record<string, unknown>)[key];
        }
      }
      Object.assign(req.query, parsed);
      next();
    } catch (error) {
      next(error);
    }
  };
};

export const validateParams = (schema: ZodType): RequestHandler => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = (await schema.parseAsync(req.params)) as Record<
        string,
        unknown
      >;
      // Express 5: req.params may also be getter-only, mutate in place
      for (const key of Object.keys(req.params)) {
        if (!(key in parsed)) {
          delete (req.params as Record<string, unknown>)[key];
        }
      }
      Object.assign(req.params, parsed);
      next();
    } catch (error) {
      next(error);
    }
  };
};

export default validateRequest;
