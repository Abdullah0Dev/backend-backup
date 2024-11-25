require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { Server } = require("socket.io");
const http = require("http");

// Routes imports
const testActionRoute = require("./routes/testActionRoute");
const webStatisticsRoute = require("./routes/webStatisticsRoute");
const checkoutRoute = require("./routes/checkoutRoute");
const allowedOrigins = [
  "https://power-proxies.vercel.app",
  "http://localhost:3000", // You can add more origins here
];
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: function(origin, callback) {
      if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    }, // Adjust this to match your frontend origin
    methods: ["GET", "POST"],
  },
});

// Real-time updates
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Example event handlers
  socket.on("example-event", (data) => {
    console.log("Example event data:", data);
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
  });
});

// Attach io to app for later use in routes
app.set("io", io);

// Middleware
app.use(cors()); // Enable CORS for all origins
app.use("/payment", checkoutRoute);

// Define routes
app.use(express.json()); // Enable JSON parsing
app.use("/test-actions", testActionRoute);
app.use("/web-statistics", webStatisticsRoute);

app.get("/", (req, res) => {
  res.send("Welcome to the API");
});

// MongoDB connection and Server start
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    server.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err);
  });

// localhost:4000/payment/stripe-webhook
// whsec_93226a834a35cab2e1ff997b1798de8ff54b22f6f1ac917b27f772a4856fd449
