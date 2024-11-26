const mongoose = require("mongoose");

const portSchema = new mongoose.Schema({
  IMEI: {
    type: String,
    required: [true, "Please provide the IMEI"],
    unique: true,
    index: true,
  },
  portID: {
    type: String,
    required: [true, "Please provide the port ID"],
    unique: true,
    index: true,
  },
  portName: {
    type: String,
    required: [true, "Please provide the port name"],
  },
  proxy_password: {
    type: String,
    required: [true, "Please provide the proxy password"],
  },
  proxy_login: {
    type: String,
    required: [true, "Please provide the proxy login"],
  },
  http_port: {
    type: Number,
    required: [true, "Please provide the HTTP port"],
    unique: true,
    sparse: true,
  },
  socks_port: {
    type: Number,
    required: [true, "Please provide the SOCKS port"],
    unique: true,
    sparse: true,
  },
});

const Port = mongoose.model("Port", portSchema);
module.exports = Port;
