const express = require("express");
const cors = require("cors");
const db = require("./configs/db");
const cookieParser = require("cookie-parser");

// Routes import
const userRoute = require("./routes/userRoute");
const seedRoute = require("./routes/seedRoute");
const otpRoutes = require("./routes/otp/otpRoute");

const app = express();

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Fix Firebase popup COOP issue
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  next();
});

app.use(express.json());
app.use(cookieParser());

// User Route
app.use("/api/users", userRoute);
app.use("/api/seed", seedRoute);
app.use("/api/otp", otpRoutes);

// DB Connection
db.getConnection()
  .then((conn) => {
    console.log("MySQL connected");
    conn.release();

    const PORT = process.env.PORT || 5000;
    const HOST = "0.0.0.0";

    app.listen(PORT, HOST, () => {
      console.log(`Server running at http://${HOST}:${PORT}/`);
    });
  })
  .catch((err) => {
    console.error("MySQL connection failed:", err.message);
  });