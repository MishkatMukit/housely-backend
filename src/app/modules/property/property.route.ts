import { Router } from "express";
import { propertyController } from "./property.controller";
import { propertyValidation } from "./property.validation";
import auth from "../../middleware/auth";
import { upload } from "../../lib/multer";
import { validateParams, validateQuery } from "../../middleware/validateRequest";
import { Role } from "../../../generated/prisma/enums";

const router = Router();

router.post(
    "/",
    auth(Role.OWNER),
    upload.array("images", 5),
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
