import { Router } from "express";
import { propertyController } from "./property.controller";
import { propertyValidation } from "./property.validation";
import auth from "../../middleware/auth";
import { upload } from "../../lib/multer";
import validateRequest, { validateParams, validateQuery } from "../../middleware/validateRequest";
import { Role } from "../../../generated/prisma/enums";

const router = Router();

// NOTE: validateParams/validateQuery run BEFORE auth so malformed
// ids/queries return 400 even for unauthenticated requests.

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
//get properties by id
router.get(
    "/:id",
    validateParams(propertyValidation.propertyIdParamSchema),
    propertyController.getProperty,
);
router.get(
    "/vacancy/:propertyId",
    validateParams(propertyValidation.propertyScopedParamSchema),
    propertyController.getVacancy,
);


export const  propertyRoutes = router
