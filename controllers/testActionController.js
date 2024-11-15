const {
  assignFreeProxy,
  rotateIP,
  getBandwidthUsage,
  getSpeedTest,
  logIpRotation,
  connectionTestResults,
  listActivePorts,
  showStatus,
  updateCredentials,
  readSMS,
  sendSMS,
  downloadVPNProfile,
} = require("../proxyService");
const Proxy = require("../models/ProxyModel");
const cron = require("node-cron");
const ClientProxiesModel = require("../models/ClientProxiesModel");

const rotateIPAddress = async (req, res) => {
  try {
    const { proxyId } = req.params;
    if (!proxyId) {
      return res
        .status(400)
        .json({ error: "Missing 'proxyId' in request parameters." });
    }

    const result = await rotateIP(proxyId);
    if (!result) {
      return res
        .status(404)
        .json({ error: "Failed to rotate IP. Please check your connection." });
    }
    res.status(200).json(result);
  } catch (error) {
    console.error("rotateIPAddress error:", error);
    res.status(500).json({ error: "Failed to rotate IP address." });
  }
};

const getBandWidth = async (req, res) => {
  try {
    const { portId } = req.params;
    if (!portId) {
      return res
        .status(400)
        .json({ error: "Missing 'portId' in request parameters." });
    }

    const bandwidth = await getBandwidthUsage(portId);
    if (!bandwidth) {
      return res.status(404).json({
        error: "Bandwidth data unavailable. Please check your connection.",
      });
    }

    res.status(200).json(bandwidth);
  } catch (error) {
    console.error("getBandWidth error:", error);
    res.status(500).json({ error: "Failed to retrieve bandwidth data." });
  }
};

const internetSpeedTest = async (req, res) => {
  try {
    const { imei } = req.body;
    if (!imei) {
      return res.status(400).json({ error: "Missing 'imei' in request body." });
    }

    const speedTest = await getSpeedTest(imei);
    if (!speedTest) {
      return res
        .status(404)
        .json({ error: "Speed test failed. Please check your connection." });
    }

    res.status(200).json(speedTest);
  } catch (error) {
    console.error("internetSpeedTest error:", error);
    res.status(500).json({ error: "Failed to perform speed test." });
  }
};

const getIPLogs = async (req, res) => {
  try {
    const { imei } = req.params;
    if (!imei) {
      return res
        .status(400)
        .json({ error: "Missing 'imei' in request parameters." });
    }

    const logRotation = await logIpRotation(imei);
    if (!logRotation) {
      return res
        .status(404)
        .json({ error: "IP logs unavailable. Please try again later." });
    }

    res.status(200).json(logRotation);
  } catch (error) {
    console.error("getIPLogs error:", error);
    res.status(500).json({ error: "Failed to retrieve IP logs." });
  }
};

const internetConnectionTest = async (req, res) => {
  try {
    const { imei } = req.params;
    if (!imei) {
      return res
        .status(400)
        .json({ error: "Missing 'imei' in request parameters." });
    }

    const connectionTest = await connectionTestResults(imei);
    if (!connectionTest) {
      return res.status(404).json({
        error: "Connection test failed. Please check your connection.",
      });
    }

    res.status(200).json(connectionTest);
  } catch (error) {
    console.error("internetConnectionTest error:", error);
    res.status(500).json({ error: "Failed to perform connection test." });
  }
};
const changeCredentials = async (req, res) => {
  try {
    const { portId } = req.params;
    if (!portId) {
      return res
        .status(400)
        .json({ error: "Missing 'portId' in request parameters." });
    }

    const { newUsername, newPassword } = req.body;
    if (!newUsername || !newPassword) {
      return res
        .status(400)
        .json({ error: "Both 'newUsername' and 'newPassword' are required." });
    }

    const result = await updateCredentials(portId, newUsername, newPassword);
    if (!result) {
      return res
        .status(404)
        .json({ error: "Failed to update credentials. Please try again." });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error("changeCredentials error:", error);
    res.status(500).json({ error: "Failed to update credentials." });
  }
};

const readPhoneSMS = async (req, res) => {
  try {
    const { imei } = req.params;
    if (!imei) {
      return res
        .status(400)
        .json({ error: "Missing 'imei' in request parameters." });
    }

    const readMessages = await readSMS(imei);
    if (!readMessages) {
      return res.status(404).json({ error: "No SMS found. Please try again." });
    }

    res.status(200).json(readMessages);
  } catch (error) {
    console.error("readPhoneSMS error:", error);
    res.status(500).json({ error: "Failed to retrieve SMS." });
  }
};

const sendSMStoPhone = async (req, res) => {
  try {
    const { imei, phone, sms } = req.body;
    if (!imei || !phone || !sms) {
      return res
        .status(400)
        .json({ error: "Fields 'imei', 'phone', and 'sms' are required." });
    }

    const smsResponse = await sendSMS(imei, phone, sms);
    if (!smsResponse) {
      return res
        .status(404)
        .json({ error: "Failed to send SMS. Please try again." });
    }

    res.status(200).json(smsResponse);
  } catch (error) {
    console.error("sendSMStoPhone error:", error);
    res.status(500).json({ error: "Failed to send SMS." });
  }
};

const downloadVPNProfileSetting = async (req, res) => {
  try {
    const { portId } = req.params;
    if (!portId) {
      return res
        .status(400)
        .json({ error: "Missing 'portId' in request parameters." });
    }

    const ovpnLink = await downloadVPNProfile(portId);
    if (!ovpnLink) {
      return res
        .status(404)
        .json({ error: "Failed to retrieve VPN profile link." });
    }

    res.status(200).json({ downloadUrl: ovpnLink });
  } catch (error) {
    console.error("downloadVPNProfileSetting error:", error);
    res.status(500).json({ error: "Failed to retrieve VPN profile." });
  }
};
// assign proxy
const assignProxy = async (email) => {
  try {
    // Find all proxies with status "available"
    const availableProxies = await Proxy.find({ status: "available" });
    if (availableProxies.length === 0) return null;

    // Select a random available proxy
    const randomProxy =
      availableProxies[Math.floor(Math.random() * availableProxies.length)];

    // Update the selected proxy's status to "in-use" and assign user's email
    randomProxy.status = "in-use";
    randomProxy.assignedUser.email = email;

    // Save the updated proxy status and assigned user in the Proxy collection
    await randomProxy.save();

    // Prepare the new proxy data to push to ClientProxiesModel
    const newProxyData = {
      ID: randomProxy.ID,
      validUntil: randomProxy.validUntil,
      status: "active",
      operator: randomProxy.operator,
      port: {
        http: randomProxy.port.http,
        socks: randomProxy.port.socks,
      },
      external_IP: randomProxy.external_IP,
      added_time: randomProxy.added_time,
      network_type: randomProxy.network_type,
      is_online: randomProxy.is_online,
      proxyCredentials: {
        username: randomProxy.proxyCredentials.username,
        password: randomProxy.proxyCredentials.password,
      },
      usageData: {
        assignedDate: new Date(), // Track when the proxy was assigned
        lastUsed: new Date(), // Track last usage date (initialize to now)
      },
    };

    // Update or insert user's proxy data in ClientProxiesModel
    await ClientProxiesModel.findOneAndUpdate(
      { clientEmail: email },
      { $push: { proxyData: newProxyData } },
      { new: true, upsert: true }
    );

    // Return the assigned proxy data
    return {
      proxyID: randomProxy.ID,
      httpPort: randomProxy.port.http,
      socksPort: randomProxy.port.socks,
      credentials: randomProxy.proxyCredentials,
      externalIP: randomProxy.external_IP,
      userEmail: email,
      validUntil: randomProxy.validUntil,
    };
  } catch (error) {
    console.error("Error assigning proxy:", error);
    return null;
  }
};

// transform user information
// transform user information
const transformUserInfo = (user, portInfo) => {
  const validUntilDate = new Date(portInfo.RESET_SECURE_LINK.VALID_UNTIL);

  return {
    ID: user.modem_details.IMEI,
    operator: user.net_details.CELLOP || "Unknown",
    port: {
      http: parseInt(portInfo.HTTP_PORT),
      socks: parseInt(portInfo.SOCKS_PORT),
    },
    proxyCredentials: {
      username: portInfo.LOGIN,
      password: portInfo.PASSWORD,
    },
    assignedUser: {
      email: user.email || null, // Defaulting to null if no email is provided
      expiryDate: user.subscription?.expiryDate || null,
      last_sale: user.sales?.last_sale || "No recent sale",
      time_left_for_user: user.subscription?.time_left || Date.now(),
      total_income: user.sales?.total_income || 12,
    },
    nickname: user.modem_details?.NICK || "Unknown",
    external_IP: user.net_details?.EXT_IP || "0.0.0.0",
    added_time: user.modem_details?.ADDED_TIME || new Date().toISOString(),
    network_type: user.net_details?.CurrentNetworkType || "Unknown",
    is_online: user.net_details?.IS_ONLINE === "yes" ? "online" : "offline",
    status: "available",
    validUntil: isNaN(validUntilDate.getTime()) ? new Date() : validUntilDate,
  };
};
// save the user info in mongodb
const saveUserInformation = async (userInfo) => {
  const { ID, ...data } = userInfo;
  try {
    await Proxy.findOneAndUpdate({ ID }, data, {
      upsert: true,
      new: true,
      runValidators: true,
    });
  } catch (error) {
    console.error("Error saving user info to MongoDB:", error);
  }
};
// Helper function that handles user information retrieval and saving
const fetchAndSaveUserInfo = async () => {
  const statusJson = await showStatus();
  const activePort = await listActivePorts();

  if (!statusJson || !activePort) {
    throw new Error("Failed to retrieve user information.");
  }

  const mergedUserInfo = statusJson
    .map((user) => {
      const {
        modem_details: { IMEI },
      } = user;
      const portInfo = activePort[IMEI] ? activePort[IMEI][0] : null;

      return portInfo ? transformUserInfo(user, portInfo) : null;
    })
    .filter(Boolean);

  // Save each user's information
  await Promise.all(mergedUserInfo.map(saveUserInformation));
  await Proxy.save();
  return mergedUserInfo;
};

// Endpoint function to handle HTTP requests
const getUserInformation = async (req, res) => {
  try {
    // await fetchAndSaveUserInfo();
    //  Fetch the latest proxy info from mongodb
    const latestProxies = await Proxy.find({});
    console.log("latest data mongodb:", latestProxies);

    res.status(200).json(latestProxies);
  } catch (error) {
    console.error("getUserInformation error:", error);
    res.status(500).json({ error: "Failed to retrieve user information." });
  }
};

// Cron job that runs every minute
cron.schedule("0 * * * *", async () => {
  try {
    await fetchAndSaveUserInfo();
    console.log("User information successfully retrieved and saved.");
  } catch (error) {
    console.error("Cron job error:", error);
  }
});

module.exports = {
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
};
