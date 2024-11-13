const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
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
        validator: isEmail,
        message: "Invalid user email",
      },
    },
    expiryDate: {
      type: Date,
      default: null, // Only set if the proxy is assigned
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
    required: [true, "You must provide an end date for proxy validity"],
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
    http: {
      type: Number,
      unique: true,
      sparse: true, // Allow for optional unique ports
    },
    socks: {
      type: Number,
      unique: true,
      sparse: true,
    },
  },
  proxyCredentials: {
    username: { type: String },
    password: { type: String, select: false }, // Exclude password from queries by default
  },
});

// Hash the password before saving
proxySchema.pre("save", async function (next) {
  if (this.isModified("proxyCredentials.password")) {
    const salt = await bcrypt.genSalt(10);
    this.proxyCredentials.password = await bcrypt.hash(
      this.proxyCredentials.password,
      salt
    );
  }
  next();
});

module.exports = mongoose.model("Proxy", proxySchema);
