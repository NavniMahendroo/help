import Joi from "joi";
import admin, { db } from "../config/firebase.js";
import { ApiError } from "../utils/errors.js";
import { extractTextFromImage } from "../services/ocrService.js";
import { extractNeedInsightsFromText } from "../services/nlpService.js";
import { geocodeLocation } from "../services/mapsService.js";
import { findPotentialDuplicate } from "../services/duplicateService.js";
import { matchVolunteersToNeed } from "../services/matchingService.js";
import { sendNeedNotifications } from "../services/notificationService.js";
import { env } from "../config/env.js";

const createNeedSchema = Joi.object({
  title: Joi.string().min(3).required(),
  description: Joi.string().min(5).required(),
  locationText: Joi.string().min(2).required(),
  type: Joi.string().valid("food", "medical", "shelter", "water", "education", "other").required(),
  urgency: Joi.string().valid("low", "medium", "high").optional(),
  imageBase64: Joi.string().allow("", null)
});

export async function createNeed(req, res, next) {
  try {
    const { error, value } = createNeedSchema.validate(req.body, { abortEarly: false });
    if (error) throw new ApiError(400, "Invalid need payload", error.details);

    const combinedTextParts = [value.title, value.description, value.locationText];

    if (value.imageBase64) {
      const ocrText = await extractTextFromImage(value.imageBase64);
      if (ocrText) combinedTextParts.push(ocrText);
    }

    const extracted = await extractNeedInsightsFromText(combinedTextParts.join("\n"));

    const locationCandidate = extracted.locationHint || value.locationText;
    const coordinates = await geocodeLocation(locationCandidate);

    const needDraft = {
      title: value.title,
      description: value.description,
      locationText: value.locationText,
      coordinates,
      type: value.type,
      urgency: value.urgency || extracted.urgencyHint || "low",
      status: "open",
      createdBy: req.user.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      keywords: extracted.keywords || [],
      extracted: {
        locationHint: extracted.locationHint,
        urgencyHint: extracted.urgencyHint
      }
    };

    const duplicate = await findPotentialDuplicate({
      ...needDraft,
      title: value.title,
      description: value.description
    });

    if (duplicate) {
      return res.status(200).json({
        duplicateWarning: true,
        duplicateOf: duplicate.duplicateOf,
        confidence: Number(duplicate.similarity.toFixed(2)),
        message: "Potential duplicate detected. Confirm merge or submit anyway."
      });
    }

    const ref = await db.collection("needs").add(needDraft);
    const need = {
      id: ref.id,
      ...needDraft,
      createdAt: new Date().toISOString()
    };

    const matches = await matchVolunteersToNeed(need, 5);

    if (matches.length) {
      await ref.set(
        {
          candidateVolunteers: matches,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        { merge: true }
      );

      await sendNeedNotifications({
        need: {
          ...need,
          distanceText: "near you"
        },
        candidates: matches
      });
    }

    res.status(201).json({
      id: ref.id,
      ...need,
      candidateVolunteers: matches
    });
  } catch (err) {
    next(err);
  }
}

export async function listNeeds(_req, res, next) {
  try {
    const snapshot = await db.collection("needs").orderBy("createdAt", "desc").limit(200).get();
    const needs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(needs);
  } catch (err) {
    next(err);
  }
}

export async function acceptNeed(req, res, next) {
  try {
    const { needId } = req.params;
    const volunteerId = req.user.uid;

    const needRef = db.collection("needs").doc(needId);
    const nowIso = new Date().toISOString();

    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(needRef);
      if (!snap.exists) throw new ApiError(404, "Need not found");

      const need = snap.data();
      if (need.status === "completed") throw new ApiError(409, "Need already completed");
      if (need.status === "assigned" && need.assignedVolunteerId !== volunteerId) {
        throw new ApiError(409, "Need already assigned");
      }

      transaction.update(needRef, {
        status: "assigned",
        assignedVolunteerId: volunteerId,
        assignedAt: nowIso,
        assignmentExpiresAt: new Date(Date.now() + env.assignmentTimeoutMinutes * 60 * 1000).toISOString(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    res.status(200).json({ success: true, needId, volunteerId, status: "assigned" });
  } catch (err) {
    next(err);
  }
}

export async function completeNeed(req, res, next) {
  try {
    const { needId } = req.params;
    const volunteerId = req.user.uid;

    const needRef = db.collection("needs").doc(needId);
    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(needRef);
      if (!snap.exists) throw new ApiError(404, "Need not found");
      const need = snap.data();

      if (need.assignedVolunteerId !== volunteerId) {
        throw new ApiError(403, "Only assigned volunteer can complete this need");
      }

      transaction.update(needRef, {
        status: "completed",
        completedAt: new Date().toISOString(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    res.status(200).json({ success: true, needId, status: "completed" });
  } catch (err) {
    next(err);
  }
}

export async function reassignExpiredNeeds(_req, res, next) {
  try {
    const nowIso = new Date().toISOString();
    const snapshot = await db
      .collection("needs")
      .where("status", "==", "assigned")
      .where("assignmentExpiresAt", "<=", nowIso)
      .limit(100)
      .get();

    const updates = [];

    for (const doc of snapshot.docs) {
      const need = { id: doc.id, ...doc.data() };
      const matches = await matchVolunteersToNeed(need, 5);

      const nextCandidate = matches.find((m) => m.volunteerId !== need.assignedVolunteerId) || null;

      if (!nextCandidate) {
        updates.push(
          doc.ref.update({
            status: "open",
            assignedVolunteerId: null,
            assignedAt: null,
            assignmentExpiresAt: null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          })
        );
        continue;
      }

      updates.push(
        doc.ref.update({
          status: "assigned",
          assignedVolunteerId: nextCandidate.volunteerId,
          assignedAt: new Date().toISOString(),
          assignmentExpiresAt: new Date(Date.now() + env.assignmentTimeoutMinutes * 60 * 1000).toISOString(),
          candidateVolunteers: matches,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        })
      );

      await sendNeedNotifications({ need, candidates: [nextCandidate] });
    }

    await Promise.all(updates);

    res.status(200).json({ success: true, reassignedCount: updates.length });
  } catch (err) {
    next(err);
  }
}

export async function getMetrics(_req, res, next) {
  try {
    const snapshot = await db.collection("needs").limit(500).get();
    const needs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    const total = needs.length;
    const completed = needs.filter((n) => n.status === "completed").length;
    const assigned = needs.filter((n) => n.status === "assigned").length;

    const responseTimes = needs
      .filter((n) => n.createdAt && n.assignedAt)
      .map((n) => (new Date(n.assignedAt).getTime() - new Date(n.createdAt).getTime()) / 60000)
      .filter((v) => Number.isFinite(v) && v >= 0);

    const avgResponseTimeMinutes = responseTimes.length
      ? responseTimes.reduce((sum, v) => sum + v, 0) / responseTimes.length
      : 0;

    const regionCoverage = needs.reduce((acc, n) => {
      const key = n.locationText?.split(",")?.slice(-1)?.[0]?.trim() || "unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    res.status(200).json({
      totalNeeds: total,
      completedNeeds: completed,
      assignedNeeds: assigned,
      fulfillmentRate: total ? completed / total : 0,
      avgResponseTimeMinutes,
      regionCoverage
    });
  } catch (err) {
    next(err);
  }
}
