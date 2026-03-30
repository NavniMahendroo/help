import { db } from "../config/firebase.js";
import { haversineKm } from "../utils/distance.js";
import { env } from "../config/env.js";

const urgencyWeights = {
  low: 0.3,
  medium: 0.6,
  high: 1
};

function normalizeInverseDistance(distanceKm, maxDistanceKm) {
  const boundedDistance = Math.min(distanceKm, maxDistanceKm);
  return 1 - boundedDistance / maxDistanceKm;
}

function calculateSkillMatch(needType, volunteerSkills = []) {
  if (!needType) return 0;
  return volunteerSkills.map((s) => s.toLowerCase()).includes(needType.toLowerCase()) ? 1 : 0.3;
}

export function calculateVolunteerScore({ need, volunteer, distanceKm }) {
  const urgencyWeight = urgencyWeights[need.urgency] || urgencyWeights.low;
  const radiusKm = volunteer.maxTravelDistanceKm || env.defaultSearchRadiusKm;
  const inverseDistance = normalizeInverseDistance(distanceKm, radiusKm);
  const skillMatch = calculateSkillMatch(need.type, volunteer.skills);
  const availabilityScore = volunteer.availability ? 1 : 0;
  const reliabilityBoost = volunteer.reliabilityScore ? volunteer.reliabilityScore / 100 : 0;
  const responseTieBreaker = volunteer.avgResponseMinutes ? 1 / (1 + volunteer.avgResponseMinutes) : 0;

  const baseScore =
    0.4 * urgencyWeight +
    0.3 * inverseDistance +
    0.2 * skillMatch +
    0.1 * availabilityScore;

  return baseScore + 0.05 * reliabilityBoost + 0.02 * responseTieBreaker;
}

export async function matchVolunteersToNeed(need, limit = 5) {
  const volunteersSnap = await db
    .collection("volunteers")
    .where("availability", "==", true)
    .get();

  const candidates = [];

  for (const doc of volunteersSnap.docs) {
    const volunteer = { id: doc.id, ...doc.data() };
    if (!volunteer.currentLocation) continue;

    const distanceKm = haversineKm(
      need.coordinates.lat,
      need.coordinates.lng,
      volunteer.currentLocation.lat,
      volunteer.currentLocation.lng
    );

    const radiusKm = volunteer.maxTravelDistanceKm || env.defaultSearchRadiusKm;
    if (distanceKm > radiusKm) continue;

    const score = calculateVolunteerScore({ need, volunteer, distanceKm });

    candidates.push({
      volunteerId: volunteer.id,
      distanceKm,
      score,
      fcmToken: volunteer.fcmToken || null,
      reliabilityScore: volunteer.reliabilityScore || 0,
      avgResponseMinutes: volunteer.avgResponseMinutes || 999
    });
  }

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.reliabilityScore !== a.reliabilityScore) return b.reliabilityScore - a.reliabilityScore;
    return a.avgResponseMinutes - b.avgResponseMinutes;
  });

  return candidates.slice(0, Math.max(3, limit));
}
