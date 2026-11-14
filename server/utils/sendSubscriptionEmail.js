import sendMail from "./mailer.js";

const escapeHtml = (value) =>
    String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

const money = (amount, currency = "INR") =>
    `${currency} ${Number(amount).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

// Sends the confirmation email with plan details, transaction details and
// the invoice PDF attached. invoiceBuffer is a Buffer from generateInvoice().
const sendSubscriptionEmail = async ({
    to,
    name,
    planName,
    amount,
    currency = "INR",
    paymentId,
    orderId,
    invoiceNumber,
    paidOn,
    startDate,
    endDate,
    benefits = [],
    invoiceBuffer,
}) => {
    const subject = `Streamix ${planName} plan activated - Invoice ${invoiceNumber}`;

    const text = `Hello ${name || "there"},

Your Streamix ${planName} subscription is now active.

PLAN DETAILS
Plan: ${planName}
Valid from: ${startDate}
Valid until: ${endDate}
${benefits.map((item) => `- ${item}`).join("\n")}

TRANSACTION DETAILS
Invoice number: ${invoiceNumber}
Amount paid: ${money(amount, currency)}
Payment ID: ${paymentId}
Order ID: ${orderId}
Paid on: ${paidOn}

Your invoice is attached to this email.

Thank you for choosing Streamix!`;

    const row = (label, value) =>
        `<tr><td style="padding:6px 0;color:#666;">${label}</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#111;">${escapeHtml(value)}</td></tr>`;

    const html = `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#111;">
  <h2 style="margin:0 0 4px;">Streamix</h2>
  <p style="color:#666;margin:0 0 20px;">Subscription confirmation</p>

  <p>Hello ${escapeHtml(name || "there")},</p>
  <p>Your <strong>${escapeHtml(planName)}</strong> subscription is now active.</p>

  <h3 style="margin:24px 0 8px;font-size:15px;">Plan details</h3>
  <table style="width:100%;border-collapse:collapse;border-top:1px solid #eee;">
    ${row("Plan", planName)}
    ${row("Valid from", startDate)}
    ${row("Valid until", endDate)}
  </table>
  <ul style="color:#444;padding-left:18px;">
    ${benefits.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
  </ul>

  <h3 style="margin:24px 0 8px;font-size:15px;">Transaction details</h3>
  <table style="width:100%;border-collapse:collapse;border-top:1px solid #eee;">
    ${row("Invoice number", invoiceNumber)}
    ${row("Amount paid", money(amount, currency))}
    ${row("Payment ID", paymentId)}
    ${row("Order ID", orderId)}
    ${row("Paid on", paidOn)}
  </table>

  <p style="margin-top:24px;">Your invoice is attached as a PDF.</p>
  <p style="color:#666;">Thank you for choosing Streamix!</p>
</div>`;

    await sendMail({
        to,
        toName: name,
        subject,
        text,
        html,
        attachments: invoiceBuffer
            ? [
                  {
                      filename: `Streamix_Invoice_${invoiceNumber}.pdf`,
                      content: invoiceBuffer,
                  },
              ]
            : [],
    });

    console.log("Subscription email sent to", to);
};

export default sendSubscriptionEmail;