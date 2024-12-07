const mongoose = require("mongoose");

const SubscriptionSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId, // Reference to ClientProxies
      ref: "ClientProxies", // Updated reference
      required: true,
      index: true,
    },
    proxy_id: {
      type: mongoose.Schema.Types.ObjectId, // Reference to Proxy
      ref: "Proxy", // Make sure this matches the actual name in your Proxy model
      required: true,
      unique: true, // Ensures only one subscription per proxy
      index: true,
    },
    start_date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    end_date: {
      type: Date,
      required: true,
    },
    renewal_status: {
      type: String,
      enum: ["active", "inactive", "expired"],
      default: "active",
      required: true,
    },
  },
  { timestamps: true } 
);

module.exports = mongoose.model("ProxySubscription", SubscriptionSchema);
