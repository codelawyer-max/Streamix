import crypto from "crypto";
import mongoose from "mongoose";

import { getRazorpay } from "../lib/razorpay.js";
import User from "../modals/auth.js";
import Transaction from "../modals/transaction.js";
import subscriptionPlans from "../utils/subscriptionPlans.js";
import generateInvoice from "../utils/generateInvoice.js";
import sendSubscriptionEmail from "../utils/sendSubscriptionEmail.js";

const PAID_PLANS = ["bronze", "silver", "gold"];
const DAY_MS = 24 * 60 * 60 * 1000;

// ------------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------------

const formatDate = (date) =>
    new Date(date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
    });

// "20261112" in IST, used inside the invoice number
const istDateStamp = (date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" })
        .format(date)
        .replace(/-/g, "");

const safeEqual = (a, b) => {
    const first = Buffer.from(String(a));
    const second = Buffer.from(String(b));

    return first.length === second.length && crypto.timingSafeEqual(first, second);
};

// What the browser is allowed to see about a plan
const publicPlan = (id) => {
    const plan = subscriptionPlans[id];

    return {
        id,
        name: plan.name,
        price: plan.price,
        durationDays: plan.durationDays,
        downloadLimit: plan.downloadLimit,
        watchLimitMinutes: plan.watchLimitMinutes,
        adFree: plan.adFree,
        features: plan.features,
    };
};

// A paid plan that has expired counts as "free"
const getEffectivePlan = (user) => {
    const plan = subscriptionPlans[user.plan] ? user.plan : "free";

    if (
        plan !== "free" &&
        user.subscriptionEndDate &&
        new Date(user.subscriptionEndDate) < new Date()
    ) {
        return "free";
    }

    return plan;
};

const razorpayErrorResponse = (res, error, fallbackMessage) => {
    if (error.code === "RAZORPAY_NOT_CONFIGURED") {
        console.error(error.message);

        return res.status(503).json({
            message: "Payments are not available right now. Please try again later.",
        });
    }

    // Razorpay SDK errors carry the real reason in error.error.description
    console.error(
        fallbackMessage,
        error?.error?.description || error?.message || error
    );

    return res.status(500).json({ message: fallbackMessage });
};

// Build the PDF and send the email. Runs in the background so a slow or
// failing mail service can NEVER break a payment that already succeeded.
const sendConfirmation = async (transaction, user) => {
    const plan = subscriptionPlans[transaction.plan];

    const details = {
        invoiceNumber: transaction.invoiceNumber,
        name: user.name,
        email: user.email,
        planName: plan.name,
        amount: transaction.amount,
        currency: transaction.currency,
        paymentId: transaction.razorpayPaymentId,
        orderId: transaction.razorpayOrderId,
        paidOn: formatDate(transaction.paidAt),
        startDate: formatDate(transaction.planStartDate),
        endDate: formatDate(transaction.planEndDate),
    };

    const invoiceBuffer = await generateInvoice(details);

    await sendSubscriptionEmail({
        to: user.email,
        ...details,
        benefits: plan.features,
        invoiceBuffer,
    });
};

// ------------------------------------------------------------------
// GET /subscription/plans
// ------------------------------------------------------------------

export const getPlans = (req, res) => {
    return res.status(200).json({
        plans: ["free", ...PAID_PLANS].map(publicPlan),
    });
};

// ------------------------------------------------------------------
// POST /subscription/create-order   { plan, userId }
// ------------------------------------------------------------------

export const createOrder = async (req, res) => {
    try {
        const { plan, userId } = req.body;

        if (!PAID_PLANS.includes(plan)) {
            return res.status(400).json({ message: "Invalid subscription plan" });
        }

        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({ message: "Please log in to upgrade." });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // The price comes from the server's plan table, never from the browser
        const price = subscriptionPlans[plan].price;

        const order = await getRazorpay().orders.create({
            amount: price * 100, // paise
            currency: "INR",
            receipt: `stx_${Date.now()}`,
            notes: { userId: String(user._id), plan },
        });

        // Remember what this order is for, so verify-payment can trust it
        await Transaction.create({
            userId: user._id,
            plan,
            amount: price,
            currency: "INR",
            razorpayOrderId: order.id,
            status: "created",
        });

        return res.status(200).json({ order });
    } catch (error) {
        return razorpayErrorResponse(res, error, "Failed to create payment order");
    }
};

// ------------------------------------------------------------------
// POST /subscription/verify-payment
//   { razorpay_order_id, razorpay_payment_id, razorpay_signature }
// ------------------------------------------------------------------

export const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
            req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ message: "Missing payment details" });
        }

        if (!process.env.RAZORPAY_KEY_SECRET) {
            console.error("RAZORPAY_KEY_SECRET is not set");
            return res.status(503).json({
                message: "Payments are not available right now. Please try again later.",
            });
        }

        // 1. Which user and plan was this order created for? (from OUR database)
        const transaction = await Transaction.findOne({
            razorpayOrderId: razorpay_order_id,
        });

        if (!transaction) {
            return res.status(404).json({ message: "Order not found" });
        }

        // 2. Verify Razorpay's signature
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex");

        if (!safeEqual(expectedSignature, razorpay_signature)) {
            return res.status(400).json({ message: "Payment verification failed" });
        }

        // 3. Already processed (page refreshed, double click, retry)?
        if (transaction.status === "paid") {
            const existingUser = await User.findById(transaction.userId);

            return res.status(200).json({
                message: "This payment was already processed.",
                alreadyProcessed: true,
                user: existingUser,
            });
        }

        // 4. Claim the order. Only ONE request can flip created -> paid,
        //    even if two arrive at the same moment.
        const paidTransaction = await Transaction.findOneAndUpdate(
            { _id: transaction._id, status: "created" },
            {
                $set: {
                    status: "paid",
                    razorpayPaymentId: razorpay_payment_id,
                    paidAt: new Date(),
                },
            },
            { new: true }
        );

        if (!paidTransaction) {
            const existingUser = await User.findById(transaction.userId);

            return res.status(200).json({
                message: "This payment was already processed.",
                alreadyProcessed: true,
                user: existingUser,
            });
        }

        // 5. Activate the plan (renewing the same plan extends the end date)
        const user = await User.findById(paidTransaction.userId);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const now = new Date();
        const planConfig = subscriptionPlans[paidTransaction.plan];

        const stillActive =
            user.plan === paidTransaction.plan &&
            user.subscriptionEndDate &&
            new Date(user.subscriptionEndDate) > now;

        const base = stillActive ? new Date(user.subscriptionEndDate) : now;
        const endDate = new Date(base.getTime() + planConfig.durationDays * DAY_MS);

        user.plan = paidTransaction.plan;
        user.subscriptionStatus = "active";
        user.subscriptionStartDate = stillActive
            ? user.subscriptionStartDate
            : now;
        user.subscriptionEndDate = endDate;

        await user.save();

        // 6. Save the invoice details on the transaction
        paidTransaction.planStartDate = user.subscriptionStartDate;
        paidTransaction.planEndDate = endDate;
        paidTransaction.invoiceNumber = `STX-${istDateStamp(
            paidTransaction.paidAt
        )}-${String(paidTransaction._id).slice(-6).toUpperCase()}`;

        await paidTransaction.save();

        // 7. Invoice + confirmation email in the background
        sendConfirmation(paidTransaction, user)
            .then(() =>
                Transaction.updateOne(
                    { _id: paidTransaction._id },
                    { emailSent: true }
                )
            )
            .catch(async (error) => {
                console.error("Invoice/email error:", error.message);

                await Transaction.updateOne(
                    { _id: paidTransaction._id },
                    { emailError: String(error.message).slice(0, 300) }
                ).catch(() => {});
            });

        return res.status(200).json({
            message: "Payment verified. Your plan is now active.",
            user,
            transaction: {
                invoiceNumber: paidTransaction.invoiceNumber,
                plan: paidTransaction.plan,
                amount: paidTransaction.amount,
                paymentId: paidTransaction.razorpayPaymentId,
                orderId: paidTransaction.razorpayOrderId,
                validUntil: endDate,
            },
        });
    } catch (error) {
        console.error("Verify payment error:", error);

        return res.status(500).json({ message: "Payment verification error" });
    }
};

// ------------------------------------------------------------------
// GET /subscription/status/:userId
//   Current plan, expiry, benefits and recent payments.
//   Also downgrades an expired plan to Free in the database.
// ------------------------------------------------------------------

export const getSubscriptionStatus = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({ message: "Invalid user ID" });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const effectivePlan = getEffectivePlan(user);

        if (effectivePlan !== user.plan) {
            user.plan = "free";
            user.subscriptionStatus = "inactive";
            await user.save();
        }

        const now = new Date();
        const endDate = user.subscriptionEndDate;

        const daysLeft =
            effectivePlan !== "free" && endDate
                ? Math.max(0, Math.ceil((new Date(endDate) - now) / DAY_MS))
                : null;

        const transactions = await Transaction.find({
            userId: user._id,
            status: "paid",
        })
            .sort({ paidAt: -1 })
            .limit(10)
            .select(
                "plan amount currency razorpayOrderId razorpayPaymentId paidAt invoiceNumber planEndDate emailSent"
            )
            .lean();

        return res.status(200).json({
            plan: effectivePlan,
            benefits: publicPlan(effectivePlan),
            subscriptionStatus: user.subscriptionStatus,
            startDate: effectivePlan === "free" ? null : user.subscriptionStartDate,
            endDate: effectivePlan === "free" ? null : endDate,
            daysLeft,
            transactions,
            user,
        });
    } catch (error) {
        console.error("Subscription status error:", error);

        return res.status(500).json({
            message: "Something went wrong while fetching your subscription.",
        });
    }
};