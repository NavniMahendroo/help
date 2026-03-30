import { Router } from "express";
import {
  acceptNeed,
  completeNeed,
  createNeed,
  getMetrics,
  listNeeds,
  reassignExpiredNeeds
} from "../controllers/needController.js";
import { verifyFirebaseToken } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/", verifyFirebaseToken, listNeeds);
router.post("/", verifyFirebaseToken, createNeed);
router.post("/:needId/accept", verifyFirebaseToken, acceptNeed);
router.post("/:needId/complete", verifyFirebaseToken, completeNeed);
router.post("/jobs/reassign-expired", reassignExpiredNeeds);
router.get("/metrics/summary", verifyFirebaseToken, getMetrics);

export default router;
