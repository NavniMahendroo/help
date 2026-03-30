import { db } from "../config/firebase.js";
import { haversineKm } from "../utils/distance.js";

function tokenize(text) {
  return new Set(
    (text || "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
  );
}

function jaccardSimilarity(a, b) {
  const intersection = [...a].filter((value) => b.has(value)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

export async function findPotentialDuplicate(needInput) {
  const recent = await db
    .collection("needs")
    .where("status", "in", ["open", "assigned"])
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();

  const incomingTokens = tokenize(`${needInput.title} ${needInput.description}`);

  for (const doc of recent.docs) {
    const data = doc.data();
    if (!data.coordinates) continue;

    const distance = haversineKm(
      needInput.coordinates.lat,
      needInput.coordinates.lng,
      data.coordinates.lat,
      data.coordinates.lng
    );

    const existingTokens = tokenize(`${data.title} ${data.description}`);
    const similarity = jaccardSimilarity(incomingTokens, existingTokens);

    if (distance <= 1.5 && similarity >= 0.5) {
      return { duplicateOf: doc.id, distance, similarity };
    }
  }

  return null;
}
