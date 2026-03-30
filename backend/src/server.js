import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { env, validateEnv } from "./config/env.js";
import { errorHandler } from "./utils/errors.js";
import authRoutes from "./routes/authRoutes.js";
import needRoutes from "./routes/needRoutes.js";
import volunteerRoutes from "./routes/volunteerRoutes.js";

validateEnv();

const app = express();

app.use(
  cors({
    origin: env.frontendUrl,
    credentials: true
  })
);
app.use(helmet());
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "impactlink-backend" });
});

app.use("/api/auth", authRoutes);
app.use("/api/needs", needRoutes);
app.use("/api/volunteers", volunteerRoutes);

app.use(errorHandler);

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`ImpactLink backend running on port ${env.port}`);
});
