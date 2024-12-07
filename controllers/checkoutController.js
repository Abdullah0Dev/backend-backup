require("dotenv").config();
// Import necessary libraries and modules
const { Client, resources, Webhook } = require("coinbase-commerce-node");
const {
  assignProxy,
  changeCredentialsOnCancel,
} = require("./testActionController");

const fs = require("fs").promises;

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
const stripeWebHooks = async (req, res) => {
  const io = req.app.get("io"); // Get the io instance from the app
  const signature = req.headers["stripe-signature"];
  const webhookSecret = "whsec_QGMHI2d4Z0QfHAr8a9iZWgMddGPCbNA8";
  let event;

  function getDurationByPriceId(priceId) {
    switch (priceId) {
      case "price_1QQm0dP5rD2RSXPgbknhV9wT":
        return "day";
      case "price_1QM5u2P5rD2RSXPggu2dHM3J":
        return "week";
      case "price_1QM5u2P5rD2RSXPgF5S13xYC":
        return "month";
      default:
        return null; // Handle unknown priceId gracefully
    }
  }

  // Verify Stripe event with the raw body
  try {
    event = stripe.webhooks.constructEvent(
      req.body, // Raw body already captured by express.raw
      signature,
      webhookSecret
    );
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    const { data, type: eventType } = event;

    switch (event.type) {
      case "checkout.session.completed": {
        const session = await stripe.checkout.sessions.retrieve(
          data.object.id,
          {
            expand: ["customer", "subscription", "line_items"],
          }
        );

        const subscription = session.subscription;
        const email = session.customer_details.email || session.customer?.email;
        const priceId = session.line_items?.data[0]?.price?.id; // Get price ID
        const currency = session.currency || "EUR";
        const username = session.customer_details.name || "Default Name";

        if (email && priceId) {
          const duration = getDurationByPriceId(priceId);
          if (!duration) {
            console.error("Unknown duration for price ID:", priceId);
            return res.status(400).json({ error: "Invalid price ID" });
          }

          const user_image =
            "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

          // If it's a one-time payment (no subscription)
          if (!subscription) {
            console.log("Processing one-time payment for:", email);

            const freeProxy = await assignProxy(
              email,
              duration,
              currency,
              user_image,
              username
            );

            io.emit("payment-success", {
              message: `One-time payment successful for ${email}. Proxy duration: ${duration}`,
            });

            return res
              .status(200)
              .json({ message: "One-time Proxy Assigned!" });
          }

          // If it's a subscription
          if (subscription) {
            console.log("Processing subscription for:", email);

            const freeProxy = await assignProxy(
              email,
              duration,
              currency,
              user_image,
              username
            );

            const proxyID = freeProxy.proxyID;
            const imei =
              proxyID || `FREE_IMEI_${Math.floor(Math.random() * 1000000)}`;

            try {
              await stripe.subscriptions.update(subscription.id, {
                metadata: { imei: imei },
              });
            } catch (updateError) {
              console.error(
                `Failed to update metadata for subscription ${subscription.id}:`,
                updateError.message
              );
            }

            io.emit("payment-success", {
              message: `Subscription payment successful for ${email}. Proxy duration: ${duration}`,
            });

            return res
              .status(200)
              .json({ message: "Subscription Proxy Assigned!" });
          }
        } else {
          console.error("Missing email or priceId");
          return res.status(400).json({ error: "Missing essential data" });
        }
      }

      case "customer.subscription.deleted": {
        const session = await stripe.checkout.sessions.retrieve(
          data.object.id,
          {
            expand: ["customer"],
          }
        );

        const customerEmail =
          data.object.customer_email || session.customer?.email;

        if (!customerEmail) {
          console.error("No customer email provided for subscription deletion");
          return res.status(400).json({ error: "Customer email not found" });
        }

        const result = await purchaseSubscriptionCheck(customerEmail);
        await changeCredentialsOnCancel(result?.expiredProxies[0]);
        io.emit("proxy-expired", {
          message: `${customerEmail} Left a proxy! ${result} - Now it's available for selling.`,
        });

        return res.status(200).json(result);
      }

      default:
        console.warn(`Unhandled event type: ${eventType}`);
    }
    return res.status(200).json({ message: "Webhook handled Successfully🔥" });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error", err });
  }

  return res.status(200).json({ message: "Webhook handled successfully" });
};

const stripeCheckout = async (req, res) => {
  const { currency, amount, period } = req.body;
  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price_data: {
          currency: currency ?? "EUR", // eur
          product_data: {
            name: "Purchase a Proxy - Enhance Your Online Security and Privacy",
            images: [
              "https://www.technologysolutions.net/wp-content/uploads/2023/09/pros-and-cons-scaled-2560x1280.jpeg",
              "https://333550.fs1.hubspotusercontent-na1.net/hub/333550/hubfs/AdobeStock_145182604_compressed.jpg",
              "https://media.licdn.com/dms/image/v2/D4D12AQFP5DwIsbcGGA/article-cover_image-shrink_720_1280/article-cover_image-shrink_720_1280/0/1715861786749?e=1736985600&v=beta&t=AI46QH4DHm1VtbDOGAOswvRBbeDKYZoKVRKUv0RaxpI",
            ],
          },
          recurring: {
            interval: period ?? "month",
          },
          unit_amount: amount ?? 50 * 100, // in cents ¢
        },
        quantity: 1,
      },
    ],
    mode: "subscription",
    shipping_address_collection: {
      allowed_countries: [
        "AL",
        "AD",
        "AM",
        "AT",
        "AZ",
        "BY",
        "BE",
        "BA",
        "BG",
        "HR",
        "CY",
        "CZ",
        "DK",
        "EE",
        "FI",
        "FR",
        "GE",
        "DE",
        "GR",
        "HU",
        "IS",
        "IE",
        "IT",
        "KZ",
        "LV",
        "LI",
        "LT",
        "LU",
        "MT",
        "MD",
        "MC",
        "ME",
        "NL",
        "NO",
        "PL",
        "PT",
        "RO",
        "RU",
        "SM",
        "RS",
        "SK",
        "SI",
        "ES",
        "SE",
        "CH",
        "TR",
        "UA",
        "GB",
      ],
    },
    success_url: `${process.env.BASE_URL}/payment/complete?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.BASE_URL}/cancel`,
  });

  res.redirect(session.url);
};

const complete = async (req, res) => {
  const result = Promise.all([
    stripe.checkout.sessions.retrieve(req.query.session_id, {
      expand: ["payment_intent.payment_method"],
    }),
    stripe.checkout.sessions.listLineItems(req.query.session_id),
  ]);
  const jsonFile = JSON.stringify(await result, null, 2); // pretty the json format
  // create the file
  res.send("Your payment was successful");
  fs.writeFile("filename4.json", jsonFile);

  console.log(JSON.stringify(await result));
};
const createSubscription = async (req, res) => {
  const { email, priceId } = req.body; // priceId = Stripe Price ID (weekly/monthly), imei = Proxy IMEI
  const imei = "";
  try {
    // Check if customer exists, create if not
    let customer;
    const existingCustomers = await stripe.customers.list({ email });
    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await stripe.customers.create({ email });
    }

    // Create Checkout Session for subscription
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer: customer.id, // Attach the customer
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: {
          imei: imei, // Add IMEI here
        },
      },
      success_url:
        "https://power-proxies.vercel.app/payment/success?session_id={CHECKOUT_SESSION_ID}", // success
      cancel_url: "http://localhost:3000/payment/cancel", //  cancel page
    });
    // Return the session URL for redirection
    res.json({ url: session.url });
    // res.redirect(session.url);
  } catch (error) {
    console.error("Error creating subscription:", error);
    res.status(400).json({ error: error.message });
  }
};

const createPaymentSession = async (req, res) => {
  const { email } = req.body;
  const imei = "234";
  try {
    // Check if the customer already exists
    const existingCustomers = await stripe.customers.list({ email });
    let customer =
      existingCustomers.data.length > 0 ? existingCustomers.data[0] : null;

    // If the customer doesn't exist, create a new one
    if (!customer) {
      customer = await stripe.customers.create({ email });
    }

    // Create a Checkout Session for a one-time payment
    const session = await stripe.checkout.sessions.create({
      mode: "payment", // One-time payment mode
      payment_method_types: ["card"],
      customer: customer.id, // Attach the customer
      line_items: [
        {
          price: "price_1QQm0dP5rD2RSXPgbknhV9wT", // one day test
          quantity: 1,
        },
      ],
      payment_intent_data: {
        metadata: {
          imei: imei, // Add IMEI here
        },
      },
      success_url:
        "https://power-proxies.vercel.app/payment/success?session_id={CHECKOUT_SESSION_ID}", // Redirect on success
      cancel_url: "https://power-proxies.vercel.app/payment/cancel", // Redirect on cancel
    });

    // Return the session URL for redirection
    res.json({ url: session.url });
  } catch (error) {
    console.error("Error creating payment session:", error);
    res.status(400).json({ error: error.message });
  }
};
const purchases = async (req, res) => {
  const { email } = req.query;

  try {
    // Get customer by email
    const customers = await stripe.customers.list({ email });
    if (customers.data.length === 0) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const customer = customers.data[0];
    const customerId = customer.id;

    // Fetch subscriptions for the customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
    });
    const formattedSubscriptions = subscriptions.data.map((sub) => {
      const subscriptionItem = sub.items.data[0];
      const plan = subscriptionItem.plan;

      return {
        id: sub.id,
        type: "subscription", // Indicates it's a subscription
        status: sub.status,
        amount: plan.amount / 100, // Price in USD
        currency: plan.currency,
        billingCycle: {
          start: sub.current_period_start,
          end: sub.current_period_end,
        },
        imei: sub.metadata.imei || null,
        created: sub.current_period_start, // Use `current_period_start` for sorting
        description: "Subscription Service",
      };
    });

    // Fetch one-time payments for the customer
    const sessions = await stripe.checkout.sessions.list({
      customer: customerId,
    });
    const paidSessions = sessions.data.filter(
      (session) => session.payment_status === "paid"
    );

    const formattedOneTimePayments = paidSessions.map((session) => ({
      id: session.id,
      type: "one-time", // Indicates it's a one-time payment
      status: session.payment_status,
      amount: session.amount_total / 100, // Convert cents to dollars
      currency: session.currency,
      billingCycle: null, // No billing cycle for one-time payments
      imei: null, // Typically not available for one-time payments
      created: session.created, // Use the `created` timestamp for sorting
      description: session.metadata.description || "One-Time Payment",
    }));

    // Combine and sort purchases by date (latest first)
    const purchases = [
      ...formattedSubscriptions,
      ...formattedOneTimePayments,
    ].sort(
      (a, b) => b.created - a.created // Sort by the `created` timestamp in descending order
    );

    res.json({ purchases });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
};

const manageSubscription = async (req, res) => {
  const { email } = req.query;

  try {
    // Get customer by email
    const customers = await stripe.customers.list({ email });
    if (customers.data.length === 0) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const customer = customers.data[0];

    // Fetch subscriptions for the customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
    });

    function getDurationByPriceId(priceId) {
      switch (priceId) {
        case "price_1QQm0dP5rD2RSXPgbknhV9wT":
          return "daily";
        case "price_1QM5u2P5rD2RSXPggu2dHM3J":
          return "weekly";
        case "price_1QM5u2P5rD2RSXPgF5S13xYC":
          return "monthly";
        default:
          return null; // Handle unknown priceId gracefully
      }
    }
    // Define msToTime with a proper type
    const msToTime = (duration) => {
      (minutes = Math.floor((duration / (1000 * 60)) % 60)),
        (hours = Math.floor((duration / (1000 * 60 * 60)) % 24)),
        (days = Math.floor(duration / (1000 * 60 * 60 * 24)));

      return `${days}d ${hours}h ${minutes}m `;
    };
    // Include metadata (e.g., IMEI) in the response
    const formattedSubscriptions = subscriptions.data.map((sub) => {
      const validUntil = new Date(sub.current_period_end * 1000); // Stripe timestamps are in seconds
      const remainingTime = validUntil.getTime() - Date.now(); // Remaining time in milliseconds

      const remainingTimeFormatted =
        remainingTime > 0 ? msToTime(remainingTime) : "Expired"; // Handle expired subscriptions
      // items.data.price.id
      console.log("billed time:", sub);
      return {
        subscriptionItem: sub.items.data[0].id,
        sub: sub.items.data[0].subscription,
        status: sub.status,
        billedTime: sub.current_period_start,
        nextBill: sub.current_period_end,
        imei: sub.metadata.imei || null, // Access IMEI from metadata
        country: "Netherlands",
        nick: "Abdullah", // needs changes
        subscription: getDurationByPriceId(sub.items.data[0].price?.id),
        timeLeft: `${remainingTimeFormatted}`, /// needs changes
        flag: "NL",
        customerID: customer.id,
      };
    });

    res.json({ subscriptions: formattedSubscriptions });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
};
const manageStripeBillingInfo = async (req, res) => {
  try {
    const { customerId } = req.body; // Pass the Stripe customer ID from your frontend

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: "https://power-proxies.vercel.app/dashboard", // Redirect users back after managing subscription
    });

    res.json({ url: session.url }); // Send the session URL to the frontend
  } catch (error) {
    console.error("Error creating customer portal session:", error);
    res
      .status(500)
      .json({ message: "Failed to create customer portal session." });
  }
};
const stripeCancelSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.body; // Subscription ID from the user action

    const canceledSubscription = await stripe.subscriptions.cancel(
      subscriptionId
    );

    res.json({ message: "Subscription canceled", canceledSubscription });
  } catch (error) {
    console.error("Error canceling subscription:", error);
    res.status(500).json({ message: "Failed to cancel subscription." });
  }
};

const stripeUpgradePlan = async (req, res) => {
  try {
    const { subscriptionId, subscriptionItem } = req.body; // Pass subscriptionId and new price ID
    // Fetch the subscription to get the item ID

    const upgradeSubscription = await stripe.subscriptions.update(
      subscriptionId,
      {
        items: [
          {
            id: subscriptionItem,
            price: "price_1QM5u2P5rD2RSXPgF5S13xYC", // Replace with the new plan's price ID
          },
        ],
      }
    );

    res.json(upgradeSubscription);
  } catch (error) {
    console.error("Error upgrading subscription:", error);
    res
      .status(500)
      .json({ message: "Failed to upgrade subscription.", error: error });
  }
};

const stripeDowngradePlan = async (req, res) => {
  try {
    const { subscriptionId, subscriptionItem } = req.body; // Pass subscriptionId and new price ID
    // Fetch the subscription to get the item ID

    const downgradeSubscription = await stripe.subscriptions.update(
      subscriptionId,
      {
        items: [
          {
            id: subscriptionItem,
            price: "price_1QM5u2P5rD2RSXPggu2dHM3J", // Replace with the new plan's price ID
          },
        ],
      }
    );

    res.json(downgradeSubscription);
  } catch (error) {
    console.error("Error downgrading subscription:", error);
    res.status(500).json({ message: "Failed to downgrade subscription." });
  }
};
module.exports = {
  proxyCheckout,
  stripeDowngradePlan,
  manageStripeBillingInfo,
  stripeCancelSubscription,
  proxyWebhooks,
  manageSubscription,
  purchases,
  stripeUpgradePlan,
  complete,
  createSubscription,
  proxyDayTestCheckout,
  stripeWebHooks,
  createPaymentSession,
  stripeCheckout,
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
