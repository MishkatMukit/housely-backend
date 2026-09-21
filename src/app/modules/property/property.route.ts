import { Router } from "express";
import { propertyController } from "./property.controller";
import { propertyValidation } from "./property.validation";
import auth from "../../middleware/auth";
import validateRequest, { validateParams, validateQuery } from "../../middleware/validateRequest";
import { Role } from "../../../generated/prisma/enums";

const router = Router();

router.post(
    "/",
    auth(Role.OWNER),
    validateRequest(propertyValidation.createPropertySchema),
    propertyController.createProperty,
);

router.get(
    "/",
    validateQuery(propertyValidation.listPropertiesQuerySchema),
    propertyController.listProperties,
);

router.get(
    "/:id",
    validateParams(propertyValidation.propertyIdParamSchema),
    propertyController.getProperty,
);

export { router as propertyRoutes };
