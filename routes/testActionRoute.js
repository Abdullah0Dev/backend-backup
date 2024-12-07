const express = require("express");
const {
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
  fullSalasOverview,
  AssignProxyTest,
  deleteDocuments,
  savePortChanges,
  clientProxyInfo,
  newClientEmail,
  saveNewUser,
  updateStates,
  checkProxiesStates,
  switchServers,
} = require("../controllers/testActionController");

const router = express.Router();

// Proxy management
router.post("/assign-proxy", AssignProxyTest);
router.post("/rotate-ip/:proxyId", rotateIPAddress);
// Route to delete all documents in the Proxy collection
router.delete("/delete-documents", deleteDocuments);
// Network information
router.get("/bandwidth/:portId", getBandWidth);
router.post("/speed-test", internetSpeedTest);
router.get("/ip-logs/:imei", getIPLogs);
router.get("/connection-results/:imei", internetConnectionTest);

router.post("/save-port-changes", savePortChanges);

router.get("/show-user-info", getUserInformation);
router.post("/credentials/:portId", changeCredentials);
router.post("/client-proxy-info/", clientProxyInfo);
router.post("/new-client-email/", newClientEmail);
router.post("/save-new-user", saveNewUser);
router.get("/sales-overview", fullSalasOverview);
// valid until
router.put("/update-status/:id", updateStates);
// check if the proxy is expired:
router.post("/check-proxies-status", checkProxiesStates);

router.post("/switch-servers", switchServers);

// SMS operations
router.get("/read-sms/:imei", readPhoneSMS);
router.post("/send-sms", sendSMStoPhone);

// VPN profile settings
router.get("/ovpn/:portId", downloadVPNProfileSetting);

module.exports = router;
