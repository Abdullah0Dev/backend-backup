require("dotenv").config();
// Import necessary libraries and modules
const coinbase = require("coinbase-commerce-node");
const { Client, resources, Webhook } = require("coinbase-commerce-node");
const { assignProxy } = require("./testActionController");

const stripe = require("stripe")(
  "sk_test_51PywYsP5rD2RSXPgiOG24minf0HsQEDZkqlWSYol0puCfP3EYPzNwzxBUAWBNXYogOojJwZ9RJUUIxC4hzHpHEMK00vngqpDnE"
);
// Initialize Coinbase client
const client = Client.init(process.env.COINBASE_API_KEY);
client.setRequestTimeout(3000);
const proxyDayTestCheckout = async (req, res) => {
  try {
    // Validate request body
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Test Proxy & Improve your privacy - 24 hours",
            },
            unit_amount: 500, // $5 in cents
          },
          quantity: 1,
        },
      ],
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: email,
      success_url: `${"http://localhost:4000"}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${"http://localhost:4000"}/payment/cancel`,
    });

    // Respond with session data
    return res.status(200).json({ session });
  } catch (error) {
    console.error("Error creating checkout session:", error);

    // Handle specific Stripe errors
    if (error.type === "StripeCardError") {
      return res
        .status(400)
        .json({ message: "Card declined. Please try again." });
    }

    // Fallback error response
    return res
      .status(500)
      .json({ message: "Server error. Please try again later." });
  }
};

const proxyCheckout = async (req, res) => {
  console.log("Request body:", req.body); // Add this line for debugging
  const { amount, currency } = req.body;

  try {
    const charge = await resources.Charge.create({
      name: "Power Proxies - Monthly Subscription Charge",
      description:
        "Purchase a new proxy for personal, private browsing without restrictions.",
      local_price: {
        amount: amount,
        currency: currency,
      },
      pricing_type: "fixed_price",

      metadata: {
        user_id: "1234", // Customize to associate with a specific user
      },
    });

    res.status(200).json({
      message: `Order completed successfully. Charge ID: ${charge.id}. Amount: ${amount} ${currency}. Please check your balance or purchased proxies.`,
      charge, // Optionally include charge details in the response
    });
  } catch (error) {
    console.error("Error creating charge:", error); // Log error for debugging
    res.status(500).json({
      error: "Failed to create charge. Please try again later.",
      details: error.message, // Optionally send error details for client-side handling
    });
  }
};
const proxyWebhooks = async (req, res) => {
  try {
    const event = Webhook.verifyEventBody(
      req.rawBody,
      req.headers["x-cc-webhook-signature"],
      process.env.COINBASE_WEBHOOK_SECRET
    );

    if (event.type === "charge:confirmed") {
      const email = "alhamdullah@gm.com"; // Ideally, obtain from event payload

      // Assign available proxy to user
      const assignedProxy = await assignProxy(email);
      if (!assignedProxy) {
        return res.status(404).json({ error: "No available proxy to assign." });
      }

      console.log("Proxy assigned successfully:", assignedProxy);
      res.status(200).json({
        message: "Payment confirmed and proxy assigned",
        assignedProxy,
      });
    } else {
      res.status(200).json({ message: "Payment status updated", event });
    }
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
};

module.exports = {
  proxyCheckout,
  proxyWebhooks,
  proxyDayTestCheckout,
};

/*
{
    verify: (req, res, buf) => {
      const url = req.originalUrl;
      if (url.startWith("/payment/webhooks")) {
        req.rawBody = buf.toString();
      }
    },
  }


  // ! Protect server requests
   'http://localhost:5173/, http://localhost:3000/, https://powerproxies.vercel.app, https://powerproxy.io ' - FirstPayment$≠3k
  const corsOptions = {
    origin: "https://powerproxy.io", // only allow this website to access the server
    optionsSuccessStatus: 200,
  };
  app.use(cors(corsOptions));
*/
