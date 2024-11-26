const mongoose = require("mongoose");
const { isEmail } = require("validator");

const proxySchema = new mongoose.Schema({
  ID: {
    type: String,
    required: [true, "You must provide a valid proxy ID/IMEI"],
    unique: true,
    index: true,
  },
  assignedUser: {
    email: {
      type: String,
      validate: {
        validator: (value) => value === null || isEmail(value),
        message: "Invalid user email",
      },
      default: null, // Ensures that null is acceptable
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    last_sale: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    time_left_for_user: {
      type: Date, // Store duration in milliseconds
      default: null,
    },
    // time left for user
    total_income: {
      type: Number,
      default: 0,
    },
  },
  status: {
    type: String,
    required: true,
    enum: ["in-use", "available"],
    default: "available",
    index: true,
  },
  validUntil: {
    type: Date,
    default: null,
  },
  operator: {
    type: String,
    enum: [
      "Odido",
      "AT&T",
      "T-mobile",
      "Verizon",
      "US Mobile",
      "Cricket Wireless",
      "Google Fi",
      "Mint Mobile",
      "Vodafone",
      "Xfinity Mobile",
      "Visible",
      "Consumer Cellular",
      "Metro by T-Mobile",
    ],
    default: "Odido",
    index: true,
  },
  port: {
    portName: {
      type: String,
    },
    portID: {
      type: String,
    },
    http: {
      type: Number,
      unique: true,
      sparse: true,
    },
    socks: {
      type: Number,
      unique: true,
      sparse: true,
    },
  },
  proxyCredentials: {
    username: { type: String },
    password: { type: String },
  },
  nickname: {
    type: String,
    required: [true, "please provide the nickname"],
  },
  external_IP: {
    type: String,
    required: [true, "please provide the external_IP"],
  },
  added_time: {
    type: String,
    required: [true, "'added time' is required"],
  },
  network_type: {
    type: String,
    required: [true, "'network type' is required"],
  },
  is_online: {
    type: String,
    required: [true, "'is online' is required"],
  },
});

const Proxy = mongoose.model("Proxy", proxySchema);
module.exports = Proxy;
// Nickname - last_sale	 - time left for user	- Total Income	External IP	- is_online - Network Type	- ADDED_TIME
