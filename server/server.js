import "dotenv/config";
import express from "express";
import cors from "cors";
import connectDB from "./src/config/db.js";
import authRoutes from "./src/routes/authRoutes.js";
import paperRoutes from "./src/routes/paperRoutes.js";
import questionRoutes from "./src/routes/questionRoutes.js";
import { ensurePDFDir } from "./src/services/pdfService.js";
import logger from "./src/utils/logger.js";

const app = express();
const PORT = process.env.PORT || 3000;

// ── Core Middleware ──────────────────────────────────────────────
const allowedOrigins = [
  "*",
  "http://localhost:5173", // Vite default local port
  "http://localhost:3000", // CRA / Next default local port
  process.env.FRONTEND_URL, // Your deployed frontend URL (e.g. https://my-app.vercel.app)
].filter(Boolean);

// ── Core Middleware ──────────────────────────────────────────────
app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Health Check ─────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── API Routes ───────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/papers", paperRoutes);
app.use("/api/questions", questionRoutes);

// ── 404 Handler ──────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Route not found" });
});

// ── Centralized Error Handler ────────────────────────────────────
app.use((err, _req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  logger.error(`${statusCode} — ${message}`);
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});

// ── Bootstrap Server ─────────────────────────────────────────────
const startServer = async () => {
  try {
    await connectDB();
    ensurePDFDir();
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
