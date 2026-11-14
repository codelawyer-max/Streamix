import axios from "axios";
import nodemailer from "nodemailer";

// One place that sends all emails (invoices, OTP, ...).
//
// Render's FREE tier blocks outbound SMTP (ports 25, 465, 587), so Gmail
// over SMTP times out once deployed. Therefore:
//   - If BREVO_API_KEY is set  -> send through Brevo's HTTPS API (works on Render)
//   - otherwise                -> fall back to Gmail SMTP (fine on your own computer)
//
// attachments: [{ filename: "invoice.pdf", content: <Buffer> }]

export const sendMail = async ({
    to,
    toName,
    subject,
    text,
    html,
    attachments = [],
}) => {
    const fromEmail = process.env.MAIL_FROM || process.env.EMAIL_USER;
    const fromName = process.env.MAIL_FROM_NAME || "Streamix";

    if (!fromEmail) {
        throw new Error("Email is not configured (set MAIL_FROM or EMAIL_USER).");
    }

    // ---------- Brevo HTTPS API ----------
    if (process.env.BREVO_API_KEY) {
        const payload = {
            sender: { name: fromName, email: fromEmail },
            to: [toName ? { email: to, name: toName } : { email: to }],
            subject,
        };

        if (html) payload.htmlContent = html;
        if (text) payload.textContent = text;

        if (attachments.length > 0) {
            payload.attachment = attachments.map((file) => ({
                name: file.filename,
                content: Buffer.from(file.content).toString("base64"),
            }));
        }

        try {
            await axios.post("https://api.brevo.com/v3/smtp/email", payload, {
                headers: {
                    "api-key": process.env.BREVO_API_KEY,
                    "content-type": "application/json",
                    accept: "application/json",
                },
                timeout: 15000,
            });
        } catch (error) {
            const detail = error.response?.data
                ? JSON.stringify(error.response.data)
                : error.message;

            throw new Error(`Brevo email failed: ${detail}`);
        }

        return;
    }

    // ---------- Fallback: Gmail SMTP ----------
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        throw new Error("Email is not configured (EMAIL_USER / EMAIL_PASS).");
    }

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 20000,
    });

    await transporter.sendMail({
        from: `"${fromName}" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        text,
        html,
        attachments,
    });
};

export default sendMail;