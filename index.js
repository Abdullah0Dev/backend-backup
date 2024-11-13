require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

// Routes imports
const testActionRoute = require("./routes/testActionRoute");
const webStatisticsRoute = require("./routes/webStatisticsRoute");
const checkoutRoute = require("./routes/checkoutRoute");

const app = express();

app.set("view engine", "ejs");

// Enable JSON parsing for incoming requests
app.use(express.json());

// Enable CORS for all origins; adjust as needed for production
app.use(cors());
//  Define routes
app.use("/test-actions", testActionRoute);
app.use("/web-statistics", webStatisticsRoute);
app.use("/payment", checkoutRoute);
app.get("/", (req, res, next) => {
  res.render("index.ejs");
  next();
});
// MongoDB connection and Server start
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`Server running on port http://localhost:${PORT}/`);
    });
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err);
  });
