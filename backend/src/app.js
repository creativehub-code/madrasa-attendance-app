const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const rateLimit = require("express-rate-limit");
// CORS — allow comma-separated list of origins via CLIENT_URL env var.
// Example: CLIENT_URL=https://madrasa.vercel.app,http://localhost:3000
const { clientUrl } = require("./config/env");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const authRoutes = require("./routes/auth.routes");
const adminRoutes = require("./routes/admin.routes");
const teacherRoutes = require("./routes/teacher.routes");
const parentRoutes = require("./routes/parent.routes");
const schoolTeacherRoutes = require("./routes/schoolTeacher.routes");
const studentRoutes = require("./routes/student.routes");
const academicRoutes = require("./routes/academic.routes");
const classRoutes = require("./routes/class.routes");

const app = express();

app.set("trust proxy", 1);

app.use(
  helmet({
    // Pure JSON API — use same-origin CORP so browsers block cross-origin resource reads.
    // This is the helmet default; we state it explicitly for clarity.
    crossOriginResourcePolicy: { policy: "cross-origin" },
    // Disable CSP for REST API (no HTML pages served)
    contentSecurityPolicy: false,
  }),
);

const allowedOrigins = clientUrl
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// Always allow localhost in development
if (process.env.NODE_ENV !== "production") {
  if (!allowedOrigins.includes("http://localhost:3000")) {
    allowedOrigins.push("http://localhost:3000");
  }
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server requests (no Origin header) e.g. curl / Render health checks
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS: Origin "${origin}" is not allowed`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

app.use(xss());

app.use((req, _res, next) => {
  req.body = mongoSanitize.sanitize(req.body);
  req.params = mongoSanitize.sanitize(req.params);
  req.query = mongoSanitize.sanitize(req.query);
  next();
});

// ── Strict limiter for auth endpoints (5 failed attempts per 15 min) ───────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failed attempts
  message: {
    success: false,
    message: "Too many login attempts. Please try again in 15 minutes.",
  },
});

// ── General limiter for all other API routes (100 requests per 15 min) ─────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  // Exempt the lightweight health/test-connection endpoints from throttling
  skip: (req) =>
    req.path === "/api/health" || req.path === "/api/test-connection",
  message: {
    success: false,
    message: "Too many requests from this IP, please try again in 15 minutes.",
  },
});

app.get("/api/health", (_req, res) => {
  res.json({ success: true, message: "Madrasa API is running" });
});

app.get("/api/test-connection", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend is successfully connected to Frontend!",
  });
});

// Apply general rate limiter globally to all /api routes
app.use("/api", generalLimiter);

// Auth limiter: stricter, applied only to the login endpoint
app.use("/api/auth/login", authLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/parent", parentRoutes);
app.use("/api/school-teacher", schoolTeacherRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/academic", academicRoutes);
app.use("/api/classes", classRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
