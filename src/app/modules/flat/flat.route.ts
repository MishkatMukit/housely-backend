import { Router } from "express";
import { flatController } from "./flat.controller";
import { flatValidation } from "./flat.validation";
import auth from "../../middleware/auth";
import validateRequest, { validateParams } from "../../middleware/validateRequest";
import { Role } from "../../../generated/prisma/enums";

const router = Router();

router.post(
  "/properties/:propertyId/variants",
  auth(Role.OWNER),
  validateParams(flatValidation.propertyIdParamSchema),
  validateRequest(flatValidation.createVariantSchema),
  flatController.createVariant,
);

router.get(
  "/properties/:propertyId/variants",
  validateParams(flatValidation.propertyIdParamSchema),
  flatController.listVariants,
);

router.get(
  "/properties/:propertyId/flats",
  validateParams(flatValidation.propertyIdParamSchema),
  flatController.listFlats,
);

router.get(
  "/properties/:propertyId/vacancy",
  validateParams(flatValidation.propertyIdParamSchema),
  flatController.getVacancy,
);

router.delete(
  "/variants/:id",
  auth(Role.OWNER),
  validateParams(flatValidation.variantIdParamSchema),
  flatController.deleteVariant,
);

export { router as flatRoutes };
