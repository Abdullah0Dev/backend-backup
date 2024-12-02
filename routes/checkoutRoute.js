require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs").promises;
const crypto = require("crypto");
const {
  proxyCheckout,
  proxyWebhooks,
  proxyDayTestCheckout,
} = require("../controllers/checkoutController");
const ClientProxiesModel = require("../models/ClientProxiesModel");
const {
  assignProxy,
  changeCredentialsOnCancel,
} = require("../controllers/testActionController");
const { error } = require("console");
const { default: axios } = require("axios");
// const { io } = require("..");

const stripe = require("stripe")(
  "sk_test_51PywYsP5rD2RSXPgiOG24minf0HsQEDZkqlWSYol0puCfP3EYPzNwzxBUAWBNXYogOojJwZ9RJUUIxC4hzHpHEMK00vngqpDnE"
);

stripe.products
  .create({
    name: "Starter Subscription",
    description: "$12/Month subscription",
  })
  .then((product) => {
    stripe.prices
      .create({
        unit_amount: 1200,
        currency: "EUR",
        recurring: {
          interval: "month",
        },
        product: product.id,
      })
      .then((price) => {
        console.log(
          `Success! Here your starter subscription product id: ` + product.id
        );
        console.log(
          `Success! Here your starter subscription product id: ` + price.id
        );
      });
  });
const router = express.Router();
// router.get("/notify-payment", (req, res) => {
//   const io = req.app.get("io");
//   console.log("Emitting payment-success event...");
//   io.emit("payment-success", { message: "Payment successful!" });
// });

// Proxy management
router.post("/checkout", proxyCheckout);
router.post("/webhooks", proxyWebhooks);
router.post("/test-product-checkout", proxyDayTestCheckout);

router.post("/stripe-webhook", async (req, res) => {
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
});

router.post("/stripe-checkout", async (req, res) => {
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
});

router.get("/complete", async (req, res) => {
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
});
// crypto
const CRYPTOMUS_API_KEY =
  "ZQaaVptZUqJMVZDczd7q166Bmv2SIqhOmoE7lopMmBBz7tHuVkWL6SMfD87mie5KO8ix6PJTVctlaTDWTDRHGnHUDEDNSNVcksgHYQdzPChRdySLwLCxOl7EK7oZbC4h";
const MERCHANT_ID = "123bf6f0-9240-450a-99bf-0f880be0639d"; // 8b03432e-385b-4670-8d06-064591096795
router.post("/crypto-checkout", async (req, res) => {
  // const { amount, currency, period } = req.body;
  const data = {
    amount: "15",
    currency: "USDT",
    period: "monthly",
    name: "Power Proxies",
    order_id: "fe99035f86fa436181717b302b95bacff1234", // crypto.getRandomValues(12).toString("hex"),
    url_callback:
      "https://dacf-154-178-198-115.ngrok-free.app/payment/crypto-webhook",
  };
  const sign = "fe99035f86fa436181717b302b95bacff1"; // crypto.createHash("md5").update(
  //   Buffer.from(JSON.stringify(data))
  //     .toString("base64" + CRYPTOMUS_API_KEY)
  //     .digest("hex")
  // );
  //create the crypto payment
  const response = await axios.post(
    `https://api.cryptomus.com/v1/recurrence/create`,
    data,
    {
      headers: {
        merchant: MERCHANT_ID,
        sign: sign,
        "Content-Type": "application/json",
      },
    }
  );
  res.status(200).json(response.data);
});

// subscription - monthly/weekly
router.post("/create-subscription", async (req, res) => {
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
          price: priceId, // e.g., price_1QM5u2P5rD2RSXPgF5S13xYC (Monthly)
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: {
          imei: imei, // Add IMEI here
        },
      },
      // appearance: {
      //   theme: "light", // Options: 'auto', 'dark', 'light'
      // },
      success_url:
        "http://localhost:3000/payment/success?session_id={CHECKOUT_SESSION_ID}", // success
      cancel_url: "http://localhost:3000/payment/cancel", //  cancel page
    });
    // Return the session URL for redirection
    res.json({ url: session.url });
    // res.redirect(session.url);
  } catch (error) {
    console.error("Error creating subscription:", error);
    res.status(400).json({ error: error.message });
  }
});

// one payment testing - day
router.post("/create-payment-session", async (req, res) => {
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
        "http://localhost:3000/payment/success?session_id={CHECKOUT_SESSION_ID}", // Redirect on success
      cancel_url: "http://localhost:3000/payment/cancel", // Redirect on cancel
    });

    // Return the session URL for redirection
    res.json({ url: session.url });
  } catch (error) {
    console.error("Error creating payment session:", error);
    res.status(400).json({ error: error.message });
  }
});

// fetch email subscriptions// Unified endpoint to fetch subscriptions and one-time payments
router.get("/purchases", async (req, res) => {
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
});

module.exports = router;
// WebMinds@$234
