import express from "express";
import {
    createOrder,
    verifyPayment,
    getPlans,
    getSubscriptionStatus,
} from "../controllers/subscription.js";

const router = express.Router();

router.get("/plans", getPlans);

router.post("/create-order", createOrder);

router.post("/verify-payment", verifyPayment);

router.get("/status/:userId", getSubscriptionStatus);

export default router;