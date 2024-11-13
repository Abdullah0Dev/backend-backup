const express = require("express");
const {
  Last30Days,
  DeviceType,
  userCountry,
} = require("../controllers/webStatisticsController");

const router = express.Router();

// Proxy management
router.get("/last-30-days", Last30Days);
router.get("/device-type", DeviceType);
router.get("/user-country", userCountry);

module.exports = router;
