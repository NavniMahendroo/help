import { ApiError } from "../utils/errors.js";
import { env } from "../config/env.js";

export async function geocodeLocation(locationText) {
  const encoded = encodeURIComponent(locationText);
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${env.googleMapsApiKey}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new ApiError(502, "Geocoding request failed");
  }

  const payload = await response.json();
  if (payload.status !== "OK" || !payload.results?.length) {
    throw new ApiError(400, "Could not resolve location from text", payload.status);
  }

  const { lat, lng } = payload.results[0].geometry.location;
  return { lat, lng };
}
