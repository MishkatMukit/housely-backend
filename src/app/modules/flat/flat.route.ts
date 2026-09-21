import { Router } from "express";
import { flatController } from "./flat.controller";
import { flatValidation } from "./flat.validation";
import auth from "../../middleware/auth";
import { upload } from "../../lib/multer";
import validateRequest, { validateParams, validateQuery } from "../../middleware/validateRequest";
import { Role } from "../../../generated/prisma/enums";

const router = Router();

// ---------------------------------------------------------------------------
// Global discovery (flat-centric, public)
// Cross-property tenant browsing — no property scope in path.
// ---------------------------------------------------------------------------

router.get(
  "/flats",
  validateQuery(flatValidation.listAllFlatsQuerySchema),
  flatController.getAllFlats,
);

// ---------------------------------------------------------------------------
// Scoped management (property-nested)
// Everything scoped to a property lives under /properties/:propertyId so the
// scope + ownership check come from the path, not the payload.
// ---------------------------------------------------------------------------

router.post(
  "/properties/:propertyId/variants",
  auth(Role.OWNER),
  validateParams(flatValidation.propertyIdParamSchema),
  upload.array("images", 5),
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

// ---------------------------------------------------------------------------
// Unit-level actions (flat-centric — id is globally unique, no scope needed)
// ---------------------------------------------------------------------------

router.post(
  "/variants/:id/flats",
  auth(Role.OWNER),
  validateParams(flatValidation.variantIdParamSchema),
  validateRequest(flatValidation.addFlatsSchema),
  flatController.addFlats,
);

router.patch(
  "/variants/:id",
  auth(Role.OWNER),
  validateParams(flatValidation.variantIdParamSchema),
  validateRequest(flatValidation.updateVariantSchema),
  flatController.updateVariant,
);

router.delete(
  "/variants/:id",
  auth(Role.OWNER),
  validateParams(flatValidation.variantIdParamSchema),
  flatController.deleteVariant,
);

router.patch(
  "/flats/:id",
  auth(Role.OWNER),
  validateParams(flatValidation.variantIdParamSchema),
  validateRequest(flatValidation.updateFlatSchema),
  flatController.updateFlat,
);

router.delete(
  "/flats/:id",
  auth(Role.OWNER),
  validateParams(flatValidation.variantIdParamSchema),
  flatController.deleteFlat,
);

export { router as flatRoutes };
