require("dotenv").config();
const express = require("express");
const {
  proxyCheckout,
  proxyWebhooks,
  proxyDayTestCheckout,
  stripeWebHooks,
  stripeCheckout,
  complete,
  createSubscription,
  createPaymentSession,
  purchases,
  manageSubscription,
  manageStripeBillingInfo,
  stripeCancelSubscription,
  stripeUpgradePlan,
  stripeDowngradePlan,
} = require("../controllers/checkoutController");

const router = express.Router();
// Proxy management
router.post("/checkout", proxyCheckout);
router.post("/webhooks", proxyWebhooks);
router.post("/test-product-checkout", proxyDayTestCheckout);

router.post("/stripe-webhook", stripeWebHooks);

router.post("/stripe-checkout", stripeCheckout);

router.get("/complete", complete);
// subscription - monthly/weekly
router.post("/create-subscription", createSubscription);

// one payment testing - day
router.post("/create-payment-session", createPaymentSession);

// fetch email subscriptions
router.get("/purchases", purchases);

// fetch email subscriptions
router.get("/manage-subscription", manageSubscription);
// manage proxy billing
router.post("/stripe-manage-billing-info", manageStripeBillingInfo);
router.post("/stripe-cancel-subscription", stripeCancelSubscription);
router.post("/stripe-upgrade-subscription", stripeUpgradePlan);
router.post("/stripe-downgrade-subscription", stripeDowngradePlan);

module.exports = router;
// WebMinds@$234
