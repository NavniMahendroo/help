import { Router } from "express";
import { updateVolunteerStatus } from "../controllers/volunteerController.js";
import { verifyFirebaseToken } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/status", verifyFirebaseToken, updateVolunteerStatus);

export default router;
