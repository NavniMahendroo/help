import { messaging } from "../config/firebase.js";

export async function sendNeedNotifications({ need, candidates }) {
  const tokens = candidates.map((c) => c.fcmToken).filter(Boolean);
  if (!tokens.length) return { successCount: 0, failureCount: 0 };

  const message = {
    notification: {
      title: `ImpactLink: ${need.title}`,
      body: `${need.urgency.toUpperCase()} need ${need.distanceText || "near you"}`
    },
    data: {
      needId: need.id,
      urgency: need.urgency,
      type: need.type,
      actionAccept: "accept",
      actionDecline: "decline"
    },
    tokens
  };

  return messaging.sendEachForMulticast(message);
}
