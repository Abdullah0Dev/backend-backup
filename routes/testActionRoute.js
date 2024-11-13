const express = require("express");
const {
  assignProxy,
  rotateIPAddress,
  getBandWidth,
  internetSpeedTest,
  getIPLogs,
  internetConnectionTest,
  getUserInformation,
  changeCredentials,
  readPhoneSMS,
  sendSMStoPhone,
  downloadVPNProfileSetting,
} = require("../controllers/testActionController");

const router = express.Router();

// Proxy management
router.post("/assign-proxy", assignProxy);
router.post("/rotate-ip/:proxyId", rotateIPAddress);

// Network information
router.get("/bandwidth/:portId", getBandWidth);
router.post("/speed-test", internetSpeedTest);
router.get("/ip-logs/:imei", getIPLogs);
router.get("/connection-results/:imei", internetConnectionTest);

// User information
router.get("/show-user-info", getUserInformation);
router.post("/credentials/:portId", changeCredentials);

// SMS operations
router.get("/read-sms/:imei", readPhoneSMS);
router.post("/send-sms", sendSMStoPhone);

// VPN profile settings
router.get("/ovpn/:portId", downloadVPNProfileSetting);

module.exports = router;
