import admin from "firebase-admin";
import { env } from "./env.js";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.firebaseProjectId,
      clientEmail: env.firebaseClientEmail,
      privateKey: env.firebasePrivateKey
    })
  });
}

export const db = admin.firestore();
export const auth = admin.auth();
export const messaging = admin.messaging();
export default admin;
