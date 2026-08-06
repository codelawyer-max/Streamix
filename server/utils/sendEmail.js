import nodemailer from "nodemailer";


const sendEmail = async (to, otp) => {

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

            subject: "Streamix Login OTP Verification",

            text: `Your Streamix verification OTP is ${otp}. This OTP is valid for login verification.`

        });


        console.log("OTP email sent successfully");


    } catch(error) {

        console.log("Email sending error:", error);

        throw error;

    }

};


export default sendEmail;