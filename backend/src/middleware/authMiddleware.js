import { auth } from "../config/firebase.js";
import { ApiError } from "../utils/errors.js";

export async function verifyFirebaseToken(req, _res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      throw new ApiError(401, "Missing authorization token");
    }

    const decoded = await auth.verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    next(new ApiError(401, "Invalid or expired token", error.message));
  }
}
