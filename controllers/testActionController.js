const {
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
const Sales = require("../models/SalesModel");
const cron = require("node-cron");
const ClientProxiesModel = require("../models/ClientProxiesModel");
const mongoose = require("mongoose");
const { availableServers } = require("../proxyService");

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

// get all sales
const fullSalasOverview = async (req, res) => {
  try {
    const proxySales = await Sales.find({});
    return res.status(200).json(proxySales);
  } catch (error) {
    console.log(`Couldn't fetch proxy sales`);
    res
      .status(500)
      .json({ message: "An error Found while fetching data from the server" });
  }
};
// get client proxies
const getClientProxies = async (email) => {
  // const email = "duh.com";
  try {
    // Find all proxies with status "available"
    const availableProxies = await ClientProxiesModel.find({
      clientEmail: email,
    });

    if (availableProxies.length === 0) {
      res.status(404).json({ message: "No Proxies purchased" });
    }
    return availableProxies;
  } catch (error) {
    console.error("Error fetching client proxy:", error);
    return null;
  }
};
// assign proxy
const assignProxy = async (email, duration, currency, user_image, username) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Find all proxies with status "available"
    const availableProxies = await Proxy.find({ status: "available" }).session(
      session
    );
    if (availableProxies.length === 0) throw new Error("No available proxies");

    // Select a random available proxy
    const randomProxy =
      availableProxies[Math.floor(Math.random() * availableProxies.length)];

    let durationInMs, price;
    if (duration === "day") {
      durationInMs = 24 * 60 * 60 * 1000;
      price = 5;
    } else if (duration === "week") {
      durationInMs = 7 * 24 * 60 * 60 * 1000;
      price = 25;
    } else if (duration === "month") {
      durationInMs = 30 * 24 * 60 * 60 * 1000;
      price = 65;
    } else {
      throw new Error("Invalid duration");
    }

    const validUntil = new Date(Date.now() + durationInMs);

    // Update the selected proxy
    randomProxy.status = "in-use";
    randomProxy.assignedUser = {
      email,
      expiryDate: validUntil,
      last_sale: Date.now(),
      time_left_for_user: validUntil,
      total_income: (randomProxy.assignedUser?.total_income || 0) + price,
    };
    randomProxy.validUntil = validUntil;
    await randomProxy.save({ session });

    // Create the sales record
    await Sales.create(
      [
        {
          ID: randomProxy.ID,
          currency,
          sale_amount: price,
          sale_date: new Date(),
          sale_period: duration,
          user_email: email,
          user_image,
          username,
        },
      ],
      { session }
    );

    // Prepare the new proxy data to push to ClientProxiesModel
    const newProxyData = {
      ID: randomProxy.ID,
      validUntil,
      status: "active",
      operator: randomProxy.operator,
      port: {
        portName: randomProxy.port.portName,
        portID: randomProxy.port.portID,
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
        duration: duration,
      },
    };

    // Update or insert user's proxy data in ClientProxiesModel
    await ClientProxiesModel.findOneAndUpdate(
      { clientEmail: email },
      { $push: { proxyData: newProxyData } },
      { new: true, upsert: true }
    );

    await session.commitTransaction();
    session.endSession();

    return {
      proxyID: randomProxy.ID,
      httpPort: randomProxy.port.http,
      socksPort: randomProxy.port.socks,
      credentials: randomProxy.proxyCredentials,
      externalIP: randomProxy.external_IP,
      userEmail: email,
      validUntil,
      leftTime: `${Math.floor(durationInMs / (24 * 60 * 60 * 1000))}d`,
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error assigning proxy:", error);
    throw error;
  }
};

// transform user information
const transformUserInfo = (user, portInfo) => {
  const validUntilDate = new Date(portInfo.RESET_SECURE_LINK.VALID_UNTIL);

  return {
    ID: user.modem_details.IMEI,
    operator: user.net_details.CELLOP || "Odido",
    port: {
      portName: portInfo.portName, // update port name
      portID: portInfo.portID,
      http: parseInt(portInfo.HTTP_PORT),
      socks: parseInt(portInfo.SOCKS_PORT),
    },
    proxyCredentials: {
      username: portInfo.LOGIN,
      password: portInfo.PASSWORD,
    },
    // assignedUser: {
    //   email: user.email, // Defaulting to null if no email is provided
    //   expiryDate: user.subscription?.expiryDate,
    //   last_sale: user.sales?.last_sale,
    //   time_left_for_user: user.subscription?.time_left,
    //   total_income: user.sales?.total_income,
    // },
    nickname: user.modem_details?.NICK || "Unknown",
    external_IP: user.net_details?.EXT_IP || "0.0.0.0",
    added_time: user.modem_details?.ADDED_TIME || new Date().toISOString(),
    network_type: user.net_details?.CurrentNetworkType || "Unknown",
    is_online: user.net_details?.IS_ONLINE === "yes" ? "online" : "offline",
    // status: "available",
    // validUntil: isNaN(validUntilDate.getTime()) ? new Date() : validUntilDate,
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
  // await Proxy.save();
  return mergedUserInfo;
};

// Endpoint function to handle HTTP requests
const getUserInformation = async (req, res) => {
  try {
    await fetchAndSaveUserInfo();
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
cron.schedule("* * * * *", async () => {
  try {
    await fetchAndSaveUserInfo();
    console.log("User information successfully retrieved and saved.");
  } catch (error) {
    console.error("Cron job error:", error);
  }
});
// check if purchased is expired:

const purchaseSubscriptionCheck = async (email) => {
  try {
    const currentDate = new Date();

    // Validate email
    if (!email) {
      throw new Error("Email is required for subscription check.");
    }

    // Find the client purchased proxies by client email
    const clientData = await ClientProxiesModel.findOne({ clientEmail: email });

    if (
      !clientData ||
      !clientData.proxyData ||
      clientData.proxyData.length === 0
    ) {
      return {
        message: "No purchased proxies found for this client.",
        expiredProxies: [],
      };
    }

    const clientPurchasedProxies = clientData.proxyData;

    // Check for expired proxies and delete them
    const validProxies = [];
    const expiredProxies = [];

    for (const proxy of clientPurchasedProxies) {
      const validUntil = new Date(proxy.validUntil);

      if (validUntil < currentDate) {
        expiredProxies.push(proxy.ID); // Track expired proxies for logging

        // Find the proxy in the database and update its status to available
        await Proxy.findOneAndUpdate(
          { ID: proxy.ID },
          {
            $set: {
              status: "available",
              validUntil: null,
              "assignedUser.email": null,
              "assignedUser.expiryDate": null,
              "assignedUser.time_left_for_user": null,
            },
          }
        );
        await Sales.findOneAndDelete({ ID: proxy.ID });
      } else {
        validProxies.push(proxy); // Retain non-expired proxies
      }
    }
    // Update the client's proxy data by removing expired proxies
    clientData.proxyData = validProxies;
    await clientData.save();

    return {
      message: "Subscription check completed.",
      expiredProxies,
    };
  } catch (error) {
    console.error("Error during subscription check:", error);
  }
};
const axios = require("axios");

const changeCredentialsOnCancel = async (IMEI) => {
  function generateRandomString(length) {
    return Math.random()
      .toString(36)
      .substring(2, 2 + length);
  }
  try {
    const username = generateRandomString(7);
    const password = generateRandomString(7);
    // Validate required fields
    if (!IMEI || !username || !password) {
      return { message: "All fields are required." };
    }

    // Fetch proxy by IMEI
    const proxy = await Proxy.findOne({ ID: IMEI });
    if (!proxy) {
      return { message: "Proxy not found." };
    }

    // First request: Store port information
    const headers = { "Content-Type": "application/x-www-form-urlencoded" };
    const dataString = `data={"IMEI": "${IMEI}", "portID": "${proxy.port.portID}", "portName": "${proxy.port.portName}", "proxy_password": "${password}", "proxy_login": "${username}", "http_port": ${proxy.port.http}, "socks_port": ${proxy.port.socks}}`;

    await axios
      .post("http://188.245.37.125:7016/crud/store_port", dataString, {
        headers,
        auth: {
          username: "proxy",
          password: "proxy",
        },
      })
      .then((response) => {
        console.log("Store Port Response:", response.data);
      })
      .catch((error) => {
        console.error("Failed to store port:", error.message);
        throw new Error("Failed to store port");
      });

    // Second request: Apply stored port
    await axios
      .get(
        `http://188.245.37.125:7016/apix/apply_port?arg=${proxy.port.portID}`,
        {
          auth: {
            username: "proxy",
            password: "proxy",
          },
        }
      )
      .then((response) => {
        console.log("Apply Port Response:", response.data);
      })
      .catch((error) => {
        console.error("Failed to apply port:", error.message);
        throw new Error("Failed to apply port");
      });

    // Update the proxy username/password in the database
    proxy.proxyCredentials.password = password;
    proxy.proxyCredentials.username = username;
    await proxy.save();

    // Send success response
    return {
      message: "Port changes saved and applied successfully alhamdullah 😎",
    };
  } catch (error) {
    console.error("Error:", error.message);
  }
};

const AssignProxyTest = async (req, res) => {
  const { email, duration, currency, user_image, username } = req.body;
  const bruh = await assignProxy(
    email,
    duration,
    currency,
    user_image,
    username
  );
  res.status(200).json({
    message: "All documents have been deleted successfully!",
    data: bruh,
  });
};
const deleteDocuments = async (req, res) => {
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
};

const savePortChanges = async (req, res) => {
  try {
    const { IMEI } = req.body;
    await changeCredentialsOnCancel(IMEI);
    res
      .status(200)
      .json({ message: "alhamdullah, it changed it successfully 😎" });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).send("Something went wrong 😔");
  }
};
const clientProxyInfo = async (req, res) => {
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
};
const newClientEmail = async (req, res) => {
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
};

const saveNewUser = async (req, res) => {
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
};
const updateStates = async (req, res) => {
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
};
const checkProxiesStates = async (req, res) => {
  const { email } = req.body;
  const results = await purchaseSubscriptionCheck(email);
  console.log(results?.expiredProxies[0]);
  res.status(200).json(results);
};
const switchServers = async (req, res) => {
  const { serverId } = req.body;

  if (!availableServers[serverId]) {
    return res.status(400).json({ success: false, message: "Invalid server" });
  }

  // Logic to switch the server (e.g., store it in session or config)
  const selectedServer = availableServers[serverId];
  // store it in a variable or session
  req.session.selectedServer = selectedServer;
  res.status(200).json({ success: true, server: selectedServer });
};
module.exports = {
  updateStates,
  switchServers,
  assignProxy,
  saveNewUser,
  AssignProxyTest,
  checkProxiesStates,
  rotateIPAddress,
  getBandWidth,
  internetSpeedTest,
  clientProxyInfo,
  getIPLogs,
  internetConnectionTest,
  savePortChanges,
  newClientEmail,
  getUserInformation,
  changeCredentials,
  deleteDocuments,
  readPhoneSMS,
  sendSMStoPhone,
  getClientProxies,
  downloadVPNProfileSetting,
  purchaseSubscriptionCheck,
  fullSalasOverview,
  changeCredentialsOnCancel,
};
