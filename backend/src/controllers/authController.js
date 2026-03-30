import Joi from "joi";
import { db } from "../config/firebase.js";
import { ApiError } from "../utils/errors.js";

const profileSchema = Joi.object({
  role: Joi.string().valid("volunteer", "field_worker", "ngo", "coordinator").required(),
  name: Joi.string().min(2).required(),
  phone: Joi.string().allow("", null),
  skills: Joi.array().items(Joi.string()).default([]),
  maxTravelDistanceKm: Joi.number().min(1).max(100).default(20),
  fcmToken: Joi.string().allow("", null)
});

export async function upsertProfile(req, res, next) {
  try {
    const { error, value } = profileSchema.validate(req.body, { abortEarly: false });
    if (error) throw new ApiError(400, "Invalid profile payload", error.details);

    const userId = req.user.uid;
    const userRef = db.collection("users").doc(userId);

    const payload = {
      ...value,
      email: req.user.email || null,
      updatedAt: new Date().toISOString()
    };

    await userRef.set(payload, { merge: true });

    if (value.role === "volunteer") {
      await db.collection("volunteers").doc(userId).set(
        {
          name: value.name,
          skills: value.skills,
          availability: true,
          maxTravelDistanceKm: value.maxTravelDistanceKm,
          reliabilityScore: 50,
          avgResponseMinutes: 30,
          fcmToken: value.fcmToken || null,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
    }

    res.status(200).json({ id: userId, ...payload });
  } catch (err) {
    next(err);
  }
}

export async function getMyProfile(req, res, next) {
  try {
    const snapshot = await db.collection("users").doc(req.user.uid).get();
    if (!snapshot.exists) throw new ApiError(404, "Profile not found");
    res.status(200).json({ id: snapshot.id, ...snapshot.data() });
  } catch (err) {
    next(err);
  }
}
