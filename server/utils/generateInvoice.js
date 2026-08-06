import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

const fontPath = "C:/Windows/Fonts/arial.ttf";


const generateInvoice = async ({
    name,
    email,
    plan,
    amount,
    paymentId,
    orderId,
    startDate,
    endDate
}) => {

    return new Promise((resolve, reject) => {


        const invoicesFolder =
            path.join(
                process.cwd(),
                "invoices"
            );


        // Create invoices folder if not exists
        if (!fs.existsSync(invoicesFolder)) {

            fs.mkdirSync(
                invoicesFolder
            );

        }


        const filePath =
            path.join(
                invoicesFolder,
                `invoice_${Date.now()}.pdf`
            );



        const doc =
            new PDFDocument();

            doc.font(fontPath);



        const stream =
            fs.createWriteStream(
                filePath
            );



        doc.pipe(stream);



        doc
        .fontSize(20)
        .text(
            "STREAMIX INVOICE",
            {
                align:"center"
            }
        );


        doc.moveDown();



        doc
        .fontSize(12)
        .text(
            `Customer Name: ${name}`
        );


        doc.text(
            `Email: ${email}`
        );


        doc.moveDown();



        doc.text(
            `Subscription Plan: ${plan.toUpperCase()}`
        );


        doc.text(
            `Amount Paid: ₹${amount}`
        );


        doc.text(
            `Payment ID: ${paymentId}`
        );


        doc.text(
            `Order ID: ${orderId}`
        );


        doc.moveDown();



        doc.text(
            `Subscription Start: ${startDate}`
        );


        doc.text(
            `Subscription End: ${endDate}`
        );


        doc.moveDown();



        doc.text(
            "Payment Status: SUCCESS"
        );


        doc.moveDown();


        doc.text(
            "Thank you for subscribing to Streamix!"
        );



        doc.end();



        stream.on(
            "finish",
            () => {

                resolve(filePath);

            }
        );



        stream.on(
            "error",
            (error) => {

                reject(error);

            }
        );


    });

};


export default generateInvoice;