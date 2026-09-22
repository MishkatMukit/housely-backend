import { Router } from "express";
import validateRequest, { validateParams } from "../../middleware/validateRequest";
import { propertyValidation } from "../property/property.validation";
import { variantController } from "./variant.controller";
import auth from "../../middleware/auth";
import { Role } from "../../../generated/prisma/enums";
import { upload } from "../../lib/multer";
import { variantValidation } from "./variant.validation";

const router = Router()
router.post(
    "/:propertyId",
    validateParams(propertyValidation.propertyScopedParamSchema),
    auth(Role.OWNER),
    upload.array("images", 5),
    variantController.createVariant,
);
router.get(
    "/:propertyId",
    validateParams(propertyValidation.propertyScopedParamSchema),
    variantController.listVariants,
);
router.patch(
    "/:id",
    validateParams(variantValidation.variantIdParamSchema),
    auth(Role.OWNER),
    validateRequest(variantValidation.updateVariantSchema),
    variantController.updateVariant,
);
router.delete(
    "/:id",
    auth(Role.OWNER),
    validateParams(variantValidation.variantIdParamSchema),
    variantController.deleteVariant,
);

export const variantRoutes = router
