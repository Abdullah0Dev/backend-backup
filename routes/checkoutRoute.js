require("dotenv").config();
const express = require("express");
const fs = require("fs").promises;
const {
  proxyCheckout,
  proxyWebhooks,
} = require("../controllers/checkoutController");
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

// Proxy management
router.post("/checkout", proxyCheckout);
router.post("/webhooks", proxyWebhooks);
router.post("/stripe-checkout", async (req, res) => {
  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Node.js and Express book for testing2",
          },
          unit_amount: 50 * 100,
        },
        quantity: 1,
      },
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "JavaScript T-Shirt6",
          },
          unit_amount: 20 * 100,
        },
        quantity: 2,
      },
    ],
    mode: "payment",
    shipping_address_collection: {
      allowed_countries: ["US", "BR"],
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
module.exports = router;
