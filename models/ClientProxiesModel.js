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
        unique: true,
        index: true,
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
      proxyCredentials: {
        username: { type: String },
        password: { type: String, select: false }, // Exclude password by default in queries
      },
      usageData: {
        assignedDate: { type: Date, default: Date.now }, // Track when the proxy was assigned
        lastUsed: Date, // Track last usage date
      },
    },
  ],
});

// Hash proxy credentials password before saving
ClientSchema.pre("save", async function (next) {
  if (this.isModified("proxyData.proxyCredentials.password")) {
    const salt = await bcrypt.genSalt(10);
    this.proxyData.proxyCredentials.password = await bcrypt.hash(
      this.proxyData.proxyCredentials.password,
      salt
    );
  }
});

module.exports = mongoose.model("ClientProxies", ClientSchema);