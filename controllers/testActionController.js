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

const assignProxy = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res
        .status(400)
        .json({ error: "Missing 'userId' in request body." });
    }

    const proxy = await assignFreeProxy(userId);
    if (!proxy) {
      return res
        .status(404)
        .json({ error: "No proxy found. Please try again later." });
    }

    res.status(200).json(proxy);
  } catch (error) {
    console.log("Failed to assignProxy, error: ", error);
    res.status(500).json({ error: "Failed to assign proxy." });
  }
};

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
// transform user information
const transformUserInfo = (user, portInfo) => {
  return {
    ID: user.modem_details.IMEI,
    operator: user.net_details.CELLOP || "Unknown",
    port: {
      http: parseInt(portInfo.HTTP_PORT),
      socks: parseInt(portInfo.SOCKS_PORT)
    },
    proxyCredentials: {
      username: portInfo.LOGIN,
      password: portInfo.PASSWORD
    },
    assignedUser: {
      email: null,
      expiryDate: null
    },
    status: "available",
    validUntil: new Date(portInfo.RESET_SECURE_LINK.VALID_UNTIL) || new Date()
  };
};
// save the user info in mongodb
const saveUserInformation = async (userInfo) => {
  const { ID, ...data } = userInfo;
  try {
    await Proxy.findOneAndUpdate({ ID }, data, { upsert: true });
  } catch (error) {
    console.error("Error saving user info to MongoDB:", error);
  }
};

const getUserInformation = async (req, res) => {
  try {
    const statusJson = await showStatus();
    const activePort = await listActivePorts();

    if (!statusJson || !activePort) {
      return res
        .status(404)
        .json({ error: "Failed to retrieve user information." });
    }
    // assuming IMEI acts as the unique identifier
    const mergedUserInfo = statusJson.map((user) => {
      const {
        modem_details: { IMEI },
      } = user;
      const portInfo = activePort[IMEI] ? activePort[IMEI][0] : null;
      return {
        ...user,
        portInfo, // Attach proxy info if available
      };
    }); 
     
    res
      .status(200)
      .json({ 
        userFullInformation: mergedUserInfo,
      });
  } catch (error) {
    console.error("getUserInformation error:", error);
    res.status(500).json({ error: "Failed to retrieve user information." });
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
