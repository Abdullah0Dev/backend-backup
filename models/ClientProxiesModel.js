// Import necessary packages
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { isEmail } = require("validator");

const ClientSchema = new mongoose.Schema({
  clientEmail: {
    type: String,
    required: [true, "You must provide a valid client email"],
    unique: true,
    validate: [isEmail, "Invalid Email"],
    index: true, // Index for faster querying
  },
  proxyData: [
    {
      ID: {
        type: String,
       required: [true, "You must provide a valid client ID/IMEI"],
         
      },
      validUntil: {
        type: Date,
        required: [true, "You must provide an end date"],
      },
      status: {
        type: String,
        enum: ["inactive", "active"],
        default: "active",
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
      },
      port: {
        http: {
          type: Number,
          unique: true,
        },
        socks: {
          type: Number,
          unique: true,
        },
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
      proxyCredentials: {
        username: { type: String },
        password: { type: String }, // Exclude password by default in queries
      },
      usageData: {
        assignedDate: { type: Date, default: Date.now }, // Track when the proxy was assigned
        lastUsed: Date, // Track last usage date
        duration: {
          type: String,
          enum: ["day", "week", "month"],
          default: "day",
        },
      },
    },
  ],
});

module.exports = mongoose.model("ClientProxies", ClientSchema);
