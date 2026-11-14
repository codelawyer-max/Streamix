import express from "express";
import {
    createOrder,
    verifyPayment,
    getPlans,
    getSubscriptionStatus,
} from "../controllers/subscription.js";
import { requireAuth, requireSelf } from "../middleware/auth.js";

const router = express.Router();

router.get("/plans", getPlans);

router.post("/create-order", requireAuth, createOrder);

// Not behind login on purpose: it is protected by Razorpay's signature, and
// an expired login must never lose a payment that already went through.
router.post("/verify-payment", verifyPayment);

router.get(
    "/status/:userId",
    requireAuth,
    requireSelf("userId"),
    getSubscriptionStatus
);

export default router;
