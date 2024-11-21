require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs").promises;
const crypto = require("crypto");
const {
  proxyCheckout,
  proxyWebhooks,
} = require("../controllers/checkoutController");
const ClientProxiesModel = require("../models/ClientProxiesModel");
const { assignProxy } = require("../controllers/testActionController");
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
        currency: "usd",
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
// -> stripe
const webhookSecret =
  process.env.STRIPE_WEBHOOK_SECRET ||
  "whsec_93226a834a35cab2e1ff997b1798de8ff54b22f6f1ac917b27f772a4856fd449";
router.post(
  "/stripe-webhook",
  // bodyParser.raw({ type: "application/json" }),
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const io = req.app.get("io"); // Get the io instance from the app

    const signature = req.headers["stripe-signature"];

    let event;
    function getDurationByPriceId(priceId) {
      switch (priceId) {
        case "price_1QM5u2P5rD2RSXPgt6bTG6vE":
          return "day";
        case "price_1QM5u2P5rD2RSXPggu2dHM3J":
          return "week";
        case "price_1QM5u2P5rD2RSXPgF5S13xYC":
          return "month";
        default:
          console.warn(`Unknown priceId: ${priceId}`);
          return "week"; // Default fallback
      }
    }

    // Verify Stripe event
    try {
      event = await stripe.webhooks.constructEvent(
        req.body,
        signature,
        webhookSecret
      );
    } catch (err) {
      console.error(`Webhook Error: ${err.message}`);
      res.status(400).send(`Webhook Error: ${error.message}`);
      return;
    }

    try {
      const { data, type: eventType } = event;
      console.log(
        "Stripe Event Data:",
        data,
        "Email:",
        data.object.customer_email
      );
      switch (event.type) {
        case "checkout.session.completed": {
          const session = await stripe.checkout.sessions.retrieve(
            data.object.id,
            {
              expand: ["customer"],
            }
          );
          const session_price = await stripe.checkout.sessions.retrieve(
            data.object.id,
            {
              expand: ["line_items"],
            }
          );

          console.log(
            `session_price`,
            session_price?.line_items?.data[0]?.price?.id
          );

          const email = data.object.customer_email || session.customer?.email;
          const priceId = session_price?.line_items?.data[0]?.price?.id; // ||
          ("price_1QM5u2P5rD2RSXPgt6bTG6vE"); // session?.line_items?.data[0]?.price?.id;
          console.log("priceId:", priceId, "Email:", email, "Duh Data:", data);
          if (email && priceId) {
            const duration = getDurationByPriceId(priceId);
            await assignProxy(email, duration);
            io.emit("payment-success", {
              message: `New user! Payment successful for ${email}. Proxy duration: ${duration}.`,
            });
            console.log(
              `Proxy assigned for ${email} with duration: ${duration}`
            );
          } else {
            console.error("Missing email or priceId");
          }
          break;
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
            console.error(
              "No customer email provided for subscription deletion"
            );
            return res.status(400).json({ error: "Customer email not found" });
          }
          // Call `purchaseSubscriptionCheck` with the email
          const result = await purchaseSubscriptionCheck(customerEmail);
          io.emit("proxy-expired", {
            message: `${customerEmail} Left a proxy! ${result} - Now it's available for selling.`,
          });
          console.log(
            `Subscription check result for ${customerEmail}:`,
            result
          );

          return res.status(200).json(result);
        }
        case "price.created":
          console.log("working");

          break;
        case "plan.created":
          console.log("working");
          break;

        default:
          console.warn(`Unhandled event type: ${"eventType"}`);
      }
    } catch (err) {
      console.error(
        `Stripe webhook error: ${err.message} | Event type: ${"eventType"}`
      );
      return res.status(500).json({ error: "Internal Server Error" });
    }

    // Respond with success to Stripe
    return res.status(200).json({ message: "Webhook handled successfully" });
  }
);
router.post("/stripe-checkout", async (req, res) => {
  const { currency, amount, period } = req.body;
  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price_data: {
          currency: currency ?? "usd", // eur
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
module.exports = router;
// WebMinds@$234
