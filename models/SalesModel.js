const mongoose = require("mongoose");
const { isEmail } = require("validator");
const salesSchema = new mongoose.Schema({
  sale_amount: {
    type: Number,
    required: true,
    min: [0, "Sale amount cannot be negative"],
    default: 0,
  },
  sale_period: {
    type: String,
    enum: ["month", "week", "day"],
    required: true,
    default: "daily",
  },
  sale_date: {
    type: Date,
    default: () => Date.now(),
  },
  user_email: {
    type: String,
    validate: {
      validator: (value) => value === null || isEmail(value),
      message: "Invalid user email",
    },
    default: null, // Allows null if no email is provided
  },
  username: {
    type: String,
    required: [true, "Username is required for sales data"],
    default: "miss username",
  },
  user_image: {
    type: String,
    default: null,
  },
  currency: {
    type: String,
    default: "USD", 
  },
});

const Sales = mongoose.model("Sales", salesSchema);
module.exports = Sales;
