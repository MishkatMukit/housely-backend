import { Router } from "express";
import { propertyController } from "./property.controller";
import { propertyValidation } from "./property.validation";
import auth from "../../middleware/auth";
import { upload } from "../../lib/multer";
import validateRequest, { validateParams, validateQuery } from "../../middleware/validateRequest";
import { Role } from "../../../generated/prisma/enums";
import { variantValidation } from "../variant/variant.validation";
import { flatValidation } from "../flat/flat.validation";

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

// ---------------------------------------------------------------------------
// Property-scoped nested resources
// Final URLs: /api/properties/:propertyId/variants, /flats, /vacancy
// Register BEFORE /:id so "variants" isn't captured as an id.
// ---------------------------------------------------------------------------

router.post(
    "/:propertyId/variants",
    validateParams(propertyValidation.propertyScopedParamSchema),
    auth(Role.OWNER),
    upload.array("images", 5),
    propertyController.createVariant,
);

router.get(
    "/:propertyId/variants",
    validateParams(propertyValidation.propertyScopedParamSchema),
    propertyController.listVariants,
);

router.get(
    "/:propertyId/flats",
    validateParams(propertyValidation.propertyScopedParamSchema),
    propertyController.listFlats,
);

router.get(
    "/:propertyId/vacancy",
    validateParams(propertyValidation.propertyScopedParamSchema),
    propertyController.getVacancy,
);

router.get(
    "/:id",
    validateParams(propertyValidation.propertyIdParamSchema),
    propertyController.getProperty,
);

// ---------------------------------------------------------------------------
// Variant unit-level actions (id is globally unique, no property scope needed)
// ---------------------------------------------------------------------------

router.post(
    "/variants/:id/flats",
    validateParams(variantValidation.variantIdParamSchema),
    auth(Role.OWNER),
    validateRequest(flatValidation.addFlatsSchema),
    propertyController.addFlats,
);

router.patch(
    "/variants/:id",
    validateParams(variantValidation.variantIdParamSchema),
    auth(Role.OWNER),
    validateRequest(variantValidation.updateVariantSchema),
    propertyController.updateVariant,
);



export const  propertyRoutes = router
