import nodemailer from "nodemailer";

const sendSubscriptionEmail = async ({
    to,
    name,
    plan,
    amount,
    paymentId,
    orderId,
    startDate,
    endDate,
    invoicePath
}) => {

    try {

        const transporter = nodemailer.createTransport({

            service: "gmail",

            auth: {

                user: process.env.EMAIL_USER,

                pass: process.env.EMAIL_PASS

            }

        });


        await transporter.sendMail({

            from: process.env.EMAIL_USER,

            to,

            subject: "Streamix Subscription Confirmation",

            text: `Hello ${name},

Your Streamix subscription has been activated successfully.

Subscription Details

Plan: ${plan.toUpperCase()}
Amount Paid: ₹${amount}

Payment ID: ${paymentId}
Order ID: ${orderId}

Subscription Start: ${startDate}
Subscription End: ${endDate}

Thank you for choosing Streamix!

Enjoy your premium experience.`,

attachments: [
                {
                    filename: "Streamix_Invoice.pdf",
                    path: invoicePath
                }
            ]

        });

        console.log("Subscription email sent successfully");

    } catch (error) {

        console.error("Subscription email error:", error);

        throw error;

    }

};

export default sendSubscriptionEmail;