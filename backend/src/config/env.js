import dotenv from "dotenv";

dotenv.config();

const requiredVars = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
  "GOOGLE_MAPS_API_KEY"
];

export const env = {
  port: Number(process.env.PORT || 8080),
  nodeEnv: process.env.NODE_ENV || "development",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  googleAppCredentialsJson: process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
  assignmentTimeoutMinutes: Number(process.env.ASSIGNMENT_TIMEOUT_MINUTES || 15),
  defaultSearchRadiusKm: Number(process.env.DEFAULT_SEARCH_RADIUS_KM || 20)
};

export function validateEnv() {
  const missing = requiredVars.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}
