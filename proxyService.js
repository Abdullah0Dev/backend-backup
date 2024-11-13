require("dotenv").config();
const axios = require("axios");
const { json } = require("body-parser");
const { MongoClient, ObjectId } = require("mongodb");
const qs = require("qs"); // To format data for 'application/x-www-form-urlencoded'

// ProxySmart API Credentials
const PROXY_SMART_API_BASE_URL = "http://188.245.37.125:7016";
const PROXY_SMART_USERNAME = process.env.PROXY_SMART_USERNAME || "proxy";
const PROXY_SMART_PASSWORD = process.env.PROXY_SMART_PASSWORD || "proxy";

// MongoDB setup
const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb+srv://webmindsy1t:Hn2rYx52pfRJlkr8@cluster0.5n4dx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"; // MongoDB URI from .env
const DATABASE_NAME = "proxyDB";
const PROXIES_COLLECTION = "proxies";

let db;
const connectDB = async () => {
  const client = new MongoClient(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  await client.connect();
  db = client.db(DATABASE_NAME);
  console.log("Connected to MongoDB");
};

// Helper to authenticate with ProxySmart API
const proxySmartAuth = {
  auth: {
    username: PROXY_SMART_USERNAME,
    password: PROXY_SMART_PASSWORD,
  },
};

// Assign a free proxy to a user
const assignFreeProxy = async (userId) => {
  const freeProxy = await findFreeProxy();
  if (!freeProxy) {
    throw new Error("No free proxies available");
  }

  // Mark the proxy as assigned to the user
  await db.collection(PROXIES_COLLECTION).updateOne(
    { _id: freeProxy._id },
    {
      $set: {
        assignedTo: userId,
        assignedAt: new Date(),
        status: "assigned",
      },
    }
  );

  // Apply settings for this modem via API
  const imei = freeProxy.IMEI;
  await axios.post(
    `${PROXY_SMART_API_BASE_URL}/modem/settings`,
    { imei },
    proxySmartAuth
  );

  return freeProxy;
};

// Find a free (unassigned) proxy
const findFreeProxy = async () => {
  return await db.collection(PROXIES_COLLECTION).findOne({ status: "free" });
};

// Rotate the IP for a specific proxy
const rotateIP = async (proxyId) => {
  try {
    // const proxy = await db.collection(PROXIES_COLLECTION).findOne({ _id: ObjectId(proxyId) });
    // if (!proxy) throw new Error('Proxy not found');

    const neckName = proxyId;
    const response = await axios.post(
      `${PROXY_SMART_API_BASE_URL}/apix/reset_modem_by_nick?NICK=${neckName}`,
      {}, // No body required
      proxySmartAuth
    );
    return response.data; // Return the response from ProxySmart API
  } catch (error) {
    console.error("Error rotating IP:", error);
    throw new Error("Failed to rotate IP");
  }
};

// Get bandwidth usage for a proxy
const getBandwidthUsage = async (portId) => {
  try {
    const response = await axios.get(
      `${PROXY_SMART_API_BASE_URL}/apix/bandwidth_report_json?arg=${portId}`,
      proxySmartAuth
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching bandwidth usage:", error);
    throw new Error("Failed to fetch bandwidth usage");
  }
};

// log IP rotation
const logIpRotation = async (imei) => {
  try {
    const response = await axios.get(
      `${PROXY_SMART_API_BASE_URL}/modem/rotation_log/${imei}`,
      proxySmartAuth
    );
    return response.data;
  } catch (error) {
    console.error("Error logging ip rotation usage:", error);
    throw new Error("Failed logging ip rotation usage");
  }
};
// Test connection
const connectionTestResults = async (imei) => {
  try {
    const response = await axios.get(
      `${PROXY_SMART_API_BASE_URL}/modem/conn_test/${imei}`,
      proxySmartAuth
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching connection results:", error);
    throw new Error("Failed fetching connection results");
  }
};
// show status
const showStatus = async () => {
  try {
    const response = await axios.get(
      `${PROXY_SMART_API_BASE_URL}/apix/show_status_json`,
      proxySmartAuth
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching status:", error);
    throw new Error("Failed fetching status");
  }
};
// list ports json
const listActivePorts = async () => {
  try {
    const response = await axios.get(
      `${PROXY_SMART_API_BASE_URL}/apix/list_ports_json`,
      proxySmartAuth
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching active ports & http&socks:", error);
    throw new Error("Failed fetching active ports & http&socks");
  }
};
// Read SMS
const readSMS = async (imei) => {
  try {
    const response = await axios.get(
      `${PROXY_SMART_API_BASE_URL}/modem/sms/${imei}`,
      proxySmartAuth
    );
    return response.data;
  } catch (error) {
    console.error("Error reading messages:", error);
    throw new Error("Failed reading messages");
  }
};

// Download OVPN settings for a proxy
const downloadVPNProfile = async (portId) => {
  try {
    const response = `${PROXY_SMART_API_BASE_URL}/get_vpn_profile/${portId}.ovpn`;
    // http://188.245.37.125:7016/get_vpn_profile/portw7VwiCvS.ovpn
    return response;
  } catch (error) {
    console.error("Error downloading VPN profile", error);
    throw new Error("Failed to download  VPN profile");
  }
};
// Edit credentials
const editCredentials = async (portId) => {
  try {
    const response = await axios.post(
      `${PROXY_SMART_API_BASE_URL}/conf/edit_port/${portId}?redirect=main`,
      proxySmartAuth
    );
    // http://188.245.37.125:7016/get_vpn_profile/portw7VwiCvS.ovpn
    return response;
  } catch (error) {
    console.error("Error downloading VPN profile", error);
    throw new Error("Failed to download  VPN profile");
  }
};
// http://188.245.37.125:7016/conf/edit_port/portw7VwiCvS  ?redirect=main
// http://188.245.37.125:7016/conf/edit_port/portw7VwiCvS?redirect=main

const getSpeedTest = async (imei) => { // ipAddress, port,imei, username, password
  try {
    // http://188.245.37.125:7016/modem/speedtest/352733105770960
    const response = await axios.get(
      `${PROXY_SMART_API_BASE_URL}/modem/speedtest/${imei}`,
      proxySmartAuth
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching Speed Test:", error);
    throw new Error("Couldn't do the internet speed test", error);
  }
};

const updateCredentials = async (portId, newUsername, newPassword) => {
  try {
    const url = `${PROXY_SMART_API_BASE_URL}/conf/edit_port/${portId}?redirect=main`;
    const data = qs.stringify({
      username: newUsername,
      password: newPassword,
    });
    /* 
   { updated_proxy
  "modems_collection": [
    {
      "IMEI": "920000000000002",
      "name": "dddddddddd"
    }
  ],
  "ports_collection": [
    {
      "IMEI": "920000000000002",
      "portID": "portnqIj",
      "portName": "Port_dddddddddd",
      "http_port": "8001",
      "socks_port": "5001",
      "proxy_login": "yyyyyyyy",
      "proxy_password": "yyyyyyyyyyyy",
      "DENIED_SITES_ENABLE": 0
    }
  ],
  "local_settings": {
    "lan_modems": [
      {
        "gw": "192.168.8.8",
        "dev": "lanmodem1"
      },
      {
        "gw": "192.168.8.9",
        "dev": "lanmodem2"
      }
    ]
  }
}
*/
    console.log("Request URL:", url);
    console.log("Request Data:", data);

    const response = await axios.post(
      url,
      {
        modem: "860191063677385 nosy_harmonize",
        portID: portId,
        IMEI: "860191063677385",
        portName: "nosy_harmonize",
        http_port: "8004",
        socks_port: "5004",
        proxy_login: "abdullah",
        proxy_password: "server",
      },
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        ...proxySmartAuth,
      }
    );
 
    console.log("Response Status:", response.status);
    console.log("Response Headers:", response.headers);

    if (
      response.status === 302 &&
      response.headers.location === `${PROXY_SMART_API_BASE_URL}/`
    ) {
      return { result: "success", message: "Credentials updated successfully" };
    } else {
      throw new Error(
        `Unexpected response from ProxySmart API. Status: ${response.status}`
      );
    }
  } catch (error) {
    console.error("Error updating credentials:", error.message);
    throw new Error("Failed to update credentials");
  }
};
// Send SMS function
const sendSMS = async (imei, phone, sms) => {
  try {
    const response = await axios.post(
      `${PROXY_SMART_API_BASE_URL}/modem/send-sms`,
      new URLSearchParams({
        imei,
        phone,
        sms,
      }),
      {
        auth: {
          username: PROXY_SMART_USERNAME,
          password: PROXY_SMART_PASSWORD,
        },
        // headers: {
        //   'Content-Type': 'application/x-www-form-urlencoded',
        // },
      }
    );
    return response.data; // Return the response from the SMS API
  } catch (error) {
    console.error("Error sending SMS:", error);
    throw new Error("Failed to send SMS");
  }
};

// Export the functions for use in other parts of the app
module.exports = {
  connectDB,
  assignFreeProxy,
  rotateIP,
  getBandwidthUsage,
  downloadVPNProfile,
  updateCredentials,
  getSpeedTest,
  sendSMS,
  editCredentials,
  logIpRotation,
  connectionTestResults,
  readSMS,
  showStatus,
  listActivePorts,
};
