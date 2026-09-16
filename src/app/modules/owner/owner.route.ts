import { Router } from "express";
import { ownerController } from "./owner.controller";
import { upload } from "../../lib/multer"
const router = Router()

router.post(
    "/apply-as-owner", upload.fields([
        { name: "verificationDocuments", maxCount: 2 }
    ]),
    ownerController.applyAsOwner,
);

const ownerRoutes = router;
export default ownerRoutes;