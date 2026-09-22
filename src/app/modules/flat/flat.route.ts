import { Router } from "express";
import { flatController } from "./flat.controller";
import { flatValidation } from "./flat.validation";
import auth from "../../middleware/auth";
import validateRequest, { validateParams, validateQuery } from "../../middleware/validateRequest";
import { Role } from "../../../generated/prisma/enums";
import { propertyValidation } from "../property/property.validation";
import { variantValidation } from "../variant/variant.validation";

const router = Router();

router.post(
    "/variants/:id",
    validateParams(variantValidation.variantIdParamSchema),
    auth(Role.OWNER),
    validateRequest(flatValidation.addFlatsSchema),
    flatController.addFlats,
);

router.get(
  "/",
  validateQuery(flatValidation.listAllFlatsQuerySchema),
  flatController.getAllFlats,
);
router.get(
    "/property/:propertyId/",
    validateParams(propertyValidation.propertyScopedParamSchema),
    flatController.getFlatsByPropertyId,
);

router.patch(
  "/:id",
  auth(Role.OWNER),
  validateParams(flatValidation.flatIdParamSchema),
  validateRequest(flatValidation.updateFlatSchema),
  flatController.updateFlat,
);

router.delete(
  "/:id",
  auth(Role.OWNER),
  validateParams(flatValidation.flatIdParamSchema),
  flatController.deleteFlat,
);

export { router as flatRoutes };
