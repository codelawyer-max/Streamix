import sendMail from "./mailer.js";

// Sends the login verification code. Goes through utils/mailer.js, so it
// works on Render (Brevo over HTTPS) as well as locally (Gmail).
const sendEmail = async (to, otp) => {
    const text = `Your Streamix verification code is ${otp}.

It is valid for 5 minutes. We asked for it because someone signed in from a new device or location.

If this was not you, ignore this email. Nobody can enter your account without this code.`;

    const html = `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;color:#111;">
  <h2 style="margin:0 0 4px;">Streamix</h2>
  <p style="color:#666;margin:0 0 20px;">Login verification</p>
  <p>Use this code to finish signing in:</p>
  <p style="font-size:32px;letter-spacing:8px;font-weight:700;margin:16px 0;">${otp}</p>
  <p style="color:#444;">It is valid for 5 minutes. We asked for it because someone signed in from a new device or location.</p>
  <p style="color:#666;">If this was not you, ignore this email. Nobody can enter your account without this code.</p>
</div>`;

    await sendMail({
        to,
        subject: "Your Streamix verification code",
        text,
        html,
    });

    console.log("OTP email sent");
};

export default sendEmail;
