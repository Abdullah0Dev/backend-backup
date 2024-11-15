require("dotenv").config();
// Import necessary libraries and modules
const coinbase = require("coinbase-commerce-node");
const { Client, resources, Webhook } = require("coinbase-commerce-node");
const { assignProxy } = require("./testActionController");

// Initialize Coinbase client
const client = Client.init(process.env.COINBASE_API_KEY);
client.setRequestTimeout(3000);

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
