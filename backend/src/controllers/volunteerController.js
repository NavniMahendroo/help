import Joi from "joi";
import { db } from "../config/firebase.js";
import { ApiError } from "../utils/errors.js";

const updateVolunteerSchema = Joi.object({
  currentLocation: Joi.object({
    lat: Joi.number().required(),
    lng: Joi.number().required()
  }).required(),
  availability: Joi.boolean().required(),
  maxTravelDistanceKm: Joi.number().min(1).max(100).optional(),
  fcmToken: Joi.string().allow("", null)
});

export async function updateVolunteerStatus(req, res, next) {
  try {
    const { error, value } = updateVolunteerSchema.validate(req.body, { abortEarly: false });
    if (error) throw new ApiError(400, "Invalid volunteer payload", error.details);

    const volunteerId = req.user.uid;
    await db.collection("volunteers").doc(volunteerId).set(
      {
        ...value,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );

    res.status(200).json({ success: true, volunteerId });
  } catch (err) {
    next(err);
  }
}
