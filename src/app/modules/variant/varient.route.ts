import { Router } from "express";
import { validateParams } from "../../middleware/validateRequest";
import { variantValidation } from "./variant.validation";
import { variantController } from "./variant.controller";
import auth from "../../middleware/auth";
import { Role } from "../../../generated/prisma/enums";

const router = Router()

router.delete(
    "/:id",
    auth(Role.OWNER),
    validateParams(variantValidation.variantIdParamSchema),
    variantController.deleteVariant,
);

export const variantRoutes = router
