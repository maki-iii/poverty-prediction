const express = require("express");
const db = require("./configs/db");
const cookieParser = require("cookie-parser");

// Routes import
const userRoute = require("./routes/userRoute");
const seedRoute = require("./routes/seedRoute");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cookieParser());

// User Route
app.use("/api/users", userRoute);
app.use("/api/seed", seedRoute);

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