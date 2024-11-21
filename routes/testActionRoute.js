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
  getClientProxies,
  purchaseSubscriptionCheck,
} = require("../controllers/testActionController");
const ClientProxiesModel = require("../models/ClientProxiesModel");
const Proxy = require("../models/ProxyModel");

const router = express.Router();

// Proxy management
router.post("/assign-proxy", assignProxy);
router.post("/rotate-ip/:proxyId", rotateIPAddress);
// Route to delete all documents in the Proxy collection
router.delete("/delete-documents", async (req, res) => {
  try {
    await ClientProxiesModel.deleteMany({}); // Deletes all documents in the collection
    await Proxy.deleteMany({}); // Deletes all documents in the collection
    res
      .status(200)
      .json({ message: "All documents have been deleted successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete documents." });
  }
});
// Network information
router.get("/bandwidth/:portId", getBandWidth);
router.post("/speed-test", internetSpeedTest);
router.get("/ip-logs/:imei", getIPLogs);
router.get("/connection-results/:imei", internetConnectionTest);

// User information
router.get("/show-user-info", getUserInformation);
router.post("/credentials/:portId", changeCredentials);
router.post("/client-proxy-info/", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ message: "Please specify the client email" });
  }
  const availableProxies = await getClientProxies(email);

  if (availableProxies.length === 0) {
    res.status(404).json({ message: "No Proxies purchased" });
  }
  // return the results
  res.status(200).json(availableProxies);
});
router.post("/save-new-user", async (req, res) => {
  const { email } = req.body;

  try {
    // Validate if email exists
    if (!email) return res.status(400).json({ error: "Email is required." });

    // Create a new client with the email and empty proxyData
    const newClient = new ClientProxiesModel({
      clientEmail: email, // "alhamdullah@gm.com",
      proxyData: [],
    });

    // Save to MongoDB
    await newClient.save();

    res
      .status(201)
      .json({ message: "User created successfully", userId: email });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});
router.post("/purchase-proxy", async (req, res) => {
  const { email, duration } = req.body;
  // Assign available proxy to user
  const assignedProxy = await assignProxy(email, duration);
  if (!assignedProxy) {
    return res.status(404).json({ error: "No available proxy to assign." });
  }

  console.log("Proxy assigned successfully:", assignedProxy);
  res.status(200).json({
    message: "Payment confirmed and proxy assigned",
    assignedProxy,
  });
});
router.put("/update-assigned-user/:id", async (req, res) => {
  const { id } = req.params;
  const { email, expiryDate, last_sale, time_left_for_user, total_income } =
    req.body;

  try {
    const updatedProxy = await Proxy.findOneAndUpdate(
      { ID: id },
      {
        "assignedUser.email": email,
        "assignedUser.expiryDate": expiryDate,
        "assignedUser.last_sale": last_sale,
        "assignedUser.time_left_for_user": time_left_for_user,
        "assignedUser.total_income": total_income,
      },
      { new: true }
    );

    res.json(updatedProxy);
  } catch (error) {
    res.status(400).json({ error: "Failed to update assigned user." });
  }
});
// valid until
router.put("/update-status/:id", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const updatedProxy = await Proxy.findOneAndUpdate(
      { ID: id },
      { status },
      { new: true }
    );

    res.json(updatedProxy);
  } catch (error) {
    res.status(400).json({ error: "Failed to update status." });
  }
});
// check if the proxy is expired:
router.get("/check-proxies-status", purchaseSubscriptionCheck);

// SMS operations
router.get("/read-sms/:imei", readPhoneSMS);
router.post("/send-sms", sendSMStoPhone);

// VPN profile settings
router.get("/ovpn/:portId", downloadVPNProfileSetting);

module.exports = router;
