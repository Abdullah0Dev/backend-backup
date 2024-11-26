const express = require("express");
var request = require("request");
const axios = require("axios");
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
  fullSalasOverview,
} = require("../controllers/testActionController");
const ClientProxiesModel = require("../models/ClientProxiesModel");
const Proxy = require("../models/ProxyModel");
const { availableServers } = require("../proxyService");
const Sales = require("../models/SalesModel");
const { default: mongoose } = require("mongoose");
const Port = require("../models/PortModel");

const router = express.Router();

// Proxy management
router.post("/assign-proxy", assignProxy);
router.post("/rotate-ip/:proxyId", rotateIPAddress);
// Route to delete all documents in the Proxy collection
router.delete("/delete-documents", async (req, res) => {
  try {
    await ClientProxiesModel.deleteMany({}); // Deletes all documents in the collection
    await Proxy.deleteMany({}); // Deletes all documents in the collection'
    await Sales.deleteMany({}); // Deletes all documents in the collection'
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
function generateRandomString(length) {
  return Math.random()
    .toString(36)
    .substring(2, 2 + length);
}
router.post("/save-port-changes", async (req, res) => {
  try {
    const { IMEI } = req.body;
    const username = generateRandomString(7);
    const password = generateRandomString(7);
    // Validate required fields
    if (!IMEI || !username || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Fetch proxy by IMEI
    const proxy = await Proxy.findOne({ ID: IMEI });
    if (!proxy) {
      return res.status(404).json({ message: "Proxy not found." });
    }

    // First one:
    // First request: Store port information
    const headers = { "Content-Type": "application/x-www-form-urlencoded" };
    const dataString = `data={"IMEI": "${IMEI}", "portID": "${proxy.port.portID}", "portName": "${proxy.port.portName}", "proxy_password": "${password}", "proxy_login": "${username}", "http_port": ${proxy.port.http}, "socks_port": ${proxy.port.socks} }`;
    const options1 = {
      url: "http://188.245.37.125:7016/crud/store_port",
      method: "POST",
      headers,
      body: dataString,
      auth: { user: "proxy", pass: "proxy" },
    };

    await new Promise((resolve, reject) => {
      request(options1, (error, response, body) => {
        if (error || response.statusCode !== 200) {
          return reject(error || new Error("Failed to store port"));
        }
        console.log("Store Port Response:", body);
        resolve(body);
      });
    });

    // Send payload to external service

    // Second request: Apply stored port
    const options2 = {
      url: `http://188.245.37.125:7016/apix/apply_port?arg=${proxy.port.portID}`,
      auth: { user: "proxy", pass: "proxy" },
    };

    await new Promise((resolve, reject) => {
      request(options2, (error, response, body) => {
        if (error || response.statusCode !== 200) {
          return reject(error || new Error("Failed to apply port"));
        }
        console.log("Apply Port Response:", body);
        resolve(body);
      });
    });
    // update the proxy username/pw in database
    (proxy.proxyCredentials.password = password),
      (proxy.proxyCredentials.username = username),
      proxy.save();
    // Send success response
    res.status(200).send({
      message: "Port changes saved and applied successfully alhamdullah 😎",
    });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).send("Something went wrong 😔");
  }
});

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
router.post("/new-client-email/", async (req, res) => {
  try {
    const { email } = req.body;
    console.log("Request body:", req.body); // Logs the incoming request

    // Check if email is provided
    if (!email) {
      return res.status(201).json({ error: "Email is required." });
    }

    // Fetch all client data
    const allClientData = await ClientProxiesModel.find({});
    const clientEmails = allClientData.map((client) => client.clientEmail);

    // Check if the email already exists in the database
    if (clientEmails.includes(email)) {
      return res
        .status(202)
        .json({ message: "Email is already in the database." });
    }

    // Create a new client with the email and empty proxyData
    const newClient = new ClientProxiesModel({
      clientEmail: email,
      proxyData: [], // Or some default value
    });
    console.log("New Client Data:", newClient);

    // Save the new client to MongoDB
    await newClient.save();

    res
      .status(200)
      .json({ clientEmails, message: "Email created successfully." });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
});
router.post("/save-new-user", async (req, res) => {
  const { email } = req.body;

  try {
    // Validate if email exists
    if (!email) return res.status(400).json({ error: "Email is required." });

    // Create a new client with the email and empty proxyData
    const newClient = new ClientProxiesModel({
      clientEmail: email,
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
router.get("/sales-overview", fullSalasOverview);
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
router.post("/check-proxies-status", async (req, res) => {
  const { email } = req.body;
  const results = await purchaseSubscriptionCheck(email);
  console.log(results?.expiredProxies[0]);
  res.status(200).json(results);
});

router.post("/switch-servers", async (req, res) => {
  const { serverId } = req.body;

  if (!availableServers[serverId]) {
    return res.status(400).json({ success: false, message: "Invalid server" });
  }

  // Logic to switch the server (e.g., store it in session or config)
  const selectedServer = availableServers[serverId];
  // store it in a variable or session
  req.session.selectedServer = selectedServer;
  res.status(200).json({ success: true, server: selectedServer });
});

// SMS operations
router.get("/read-sms/:imei", readPhoneSMS);
router.post("/send-sms", sendSMStoPhone);

// VPN profile settings
router.get("/ovpn/:portId", downloadVPNProfileSetting);

module.exports = router;
