import PDFDocument from "pdfkit";

// Builds the invoice PDF IN MEMORY and returns a Buffer.
//
// Before: it wrote a file into server/invoices and used
// "C:/Windows/Fonts/arial.ttf". That font does not exist on Render
// (Linux) so every payment crashed there, and the files were wiped
// on each restart anyway. Now it uses PDFKit's built-in Helvetica
// (no font file needed) and prints the amount as "INR 199.00".

const money = (amount, currency = "INR") =>
    `${currency} ${Number(amount).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

const generateInvoice = ({
    invoiceNumber,
    name,
    email,
    planName,
    amount,
    currency = "INR",
    paymentId,
    orderId,
    paidOn,
    startDate,
    endDate,
}) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: "A4", margin: 50 });
        const chunks = [];

        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        const left = 50;
        const right = 545;
        const width = right - left;

        // ---- Header ----
        doc.font("Helvetica-Bold").fontSize(24).fillColor("#111111");
        doc.text("STREAMIX", left, 50);

        doc.font("Helvetica-Bold").fontSize(20).fillColor("#d92d20");
        doc.text("INVOICE", left, 54, { width, align: "right" });

        doc.moveTo(left, 95).lineTo(right, 95).lineWidth(1).strokeColor("#dddddd").stroke();

        // ---- Billed to / invoice info ----
        let y = 115;

        doc.font("Helvetica-Bold").fontSize(9).fillColor("#888888");
        doc.text("BILLED TO", left, y);

        doc.font("Helvetica-Bold").fontSize(12).fillColor("#111111");
        doc.text(name || "Customer", left, y + 16, { width: 250 });

        doc.font("Helvetica").fontSize(10).fillColor("#555555");
        doc.text(email || "", left, y + 34, { width: 250 });

        doc.font("Helvetica-Bold").fontSize(9).fillColor("#888888");
        doc.text("INVOICE NO", 340, y);
        doc.text("DATE", 340, y + 40);

        doc.font("Helvetica").fontSize(11).fillColor("#111111");
        doc.text(invoiceNumber, 340, y + 14);
        doc.text(paidOn, 340, y + 54);

        // ---- Items table ----
        y = 220;

        doc.rect(left, y, width, 26).fill("#f4f4f5");

        doc.font("Helvetica-Bold").fontSize(9).fillColor("#444444");
        doc.text("DESCRIPTION", left + 10, y + 9);
        doc.text("PERIOD", 300, y + 9);
        doc.text("AMOUNT", left, y + 9, { width: width - 10, align: "right" });

        y += 26;

        doc.font("Helvetica").fontSize(11).fillColor("#111111");
        doc.text(`${planName} plan (monthly)`, left + 10, y + 14, { width: 230 });

        doc.fontSize(9).fillColor("#555555");
        doc.text(`${startDate} to ${endDate}`, 300, y + 15, { width: 140 });

        doc.fontSize(11).fillColor("#111111");
        doc.text(money(amount, currency), left, y + 14, {
            width: width - 10,
            align: "right",
        });

        y += 48;

        doc.moveTo(left, y).lineTo(right, y).lineWidth(1).strokeColor("#dddddd").stroke();

        doc.font("Helvetica-Bold").fontSize(12).fillColor("#111111");
        doc.text("Total paid", 340, y + 14);
        doc.text(money(amount, currency), left, y + 14, {
            width: width - 10,
            align: "right",
        });

        // ---- Transaction details ----
        y += 70;

        doc.font("Helvetica-Bold").fontSize(9).fillColor("#888888");
        doc.text("TRANSACTION DETAILS", left, y);

        const rows = [
            ["Payment status", "PAID"],
            ["Payment ID", paymentId],
            ["Order ID", orderId],
            ["Payment gateway", "Razorpay"],
            ["Paid on", paidOn],
        ];

        rows.forEach(([label, value], index) => {
            const rowY = y + 20 + index * 20;

            doc.font("Helvetica").fontSize(10).fillColor("#555555");
            doc.text(label, left, rowY);

            doc.font("Helvetica-Bold").fillColor("#111111");
            doc.text(String(value), 200, rowY);
        });

        // ---- Footer ----
        doc.font("Helvetica").fontSize(10).fillColor("#555555");
        doc.text("Thank you for subscribing to Streamix!", left, 700, {
            width,
            align: "center",
        });

        doc.fontSize(8).fillColor("#999999");
        doc.text("This is a computer-generated invoice.", left, 716, {
            width,
            align: "center",
        });

        doc.end();
    });
};

export default generateInvoice;