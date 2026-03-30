import { Router } from "express";
import { getMyProfile, upsertProfile } from "../controllers/authController.js";
import { verifyFirebaseToken } from "../middleware/authMiddleware.js";

const router = Router();

router.use(verifyFirebaseToken);
router.get("/me", getMyProfile);
router.post("/profile", upsertProfile);

export default router;
