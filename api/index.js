const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const connectDB = require("../config/db");

// Routes
const authRoutes = require("../routes/auth");
const projectRoutes = require("../routes/project");
const ticketRoutes = require("../routes/ticket");
const commentRoutes = require("../routes/comment");

dotenv.config();
connectDB();

const app = express();

/* ================= SECURITY ================= */
app.use(
    helmet({
        crossOriginResourcePolicy: false,
    })
);

/* ================= BODY PARSER ================= */
app.use(express.json());

/* ================= CORS CONFIG ================= */
const allowedOrigins = [
    "http://localhost:5173",
    "https://bug-trackera.netlify.app"
];

app.use(
    cors({
        origin: (origin, callback) => {
            // allow Postman / server requests
            if (!origin) return callback(null, true);

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            return callback(new Error("Not allowed by CORS"));
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

/* ================= ROUTES ================= */
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/comments", commentRoutes);

/* ================= ROOT ================= */
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Bug Tracker API running on Vercel 🚀",
    });
});



/* ================= EXPORT FOR VERCEL ================= */
module.exports = app;
