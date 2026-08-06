import razorpay from "../lib/razorpay.js";
import crypto from "crypto";
import User from "../modals/auth.js";
import sendSubscriptionEmail from "../utils/sendSubscriptionEmail.js";
import generateInvoice from "../utils/generateInvoice.js";

export const createOrder = async (req, res) => {

    try {

        const { plan } = req.body;

        const planPrices = {

            bronze: 199,

            silver: 399,

            gold: 699,

        };

        if (!planPrices[plan]) {

            return res.status(400).json({

                message: "Invalid subscription plan",

            });

        }

        const options = {

            amount: planPrices[plan] * 100,

            currency: "INR",

            receipt: `receipt_${Date.now()}`,

        };

        const order = await razorpay.orders.create(options);

        return res.status(200).json({

            order,

        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({

            message: "Failed to create payment order",

        });

    }

};

export const verifyPayment = async (req, res) => {

    try {

        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            userId,
            plan
        } = req.body;



        const generatedSignature =
            crypto
                .createHmac(
                    "sha256",
                    process.env.RAZORPAY_KEY_SECRET
                )
                .update(
                    razorpay_order_id +
                    "|" +
                    razorpay_payment_id
                )
                .digest("hex");



        if (
            generatedSignature !== razorpay_signature
        ) {

            return res.status(400).json({

                message: "Payment verification failed"

            });

        }



        const planDuration =
            new Date();


        planDuration.setMonth(
            planDuration.getMonth() + 1
        );



        const updatedUser =
            await User.findByIdAndUpdate(

                userId,

                {

                    plan,

                    subscriptionStatus: "active",

                    subscriptionStartDate:
                        new Date(),

                    subscriptionEndDate:
                        planDuration

                },

                {
                    new: true
                }

            );



        const planPrices = {

            bronze: 199,

            silver: 399,

            gold: 699

        };



        const invoicePath =
            await generateInvoice({

                name: updatedUser.name,

                email: updatedUser.email,

                plan,

                amount: planPrices[plan],

                paymentId: razorpay_payment_id,

                orderId: razorpay_order_id,

                startDate:
                    updatedUser.subscriptionStartDate
                        .toLocaleDateString(),

                endDate:
                    updatedUser.subscriptionEndDate
                        .toLocaleDateString()

            });



        console.log(
            "INVOICE CREATED:",
            invoicePath
        );



        await sendSubscriptionEmail({

            to: updatedUser.email,

            name: updatedUser.name,

            plan,

            amount: planPrices[plan],

            paymentId: razorpay_payment_id,

            orderId: razorpay_order_id,

            startDate:
                updatedUser.subscriptionStartDate
                    .toLocaleDateString(),

            endDate:
                updatedUser.subscriptionEndDate
                    .toLocaleDateString(),

            invoicePath

        });



        return res.status(200).json({

            message: "Payment verified successfully",

            user: updatedUser

        });



    } catch (error) {

        console.error(error);


        return res.status(500).json({

            message: "Payment verification error"

        });

    }

};