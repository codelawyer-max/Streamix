import Razorpay from "razorpay";

let client = null;

// The Razorpay client is created on FIRST USE, not when the server starts.
// Before, a missing key crashed the whole server at boot (including video
// playback). Now only the payment endpoints fail, with a clear message.
export const getRazorpay = () => {
    if (client) return client;

    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (!key_id || !key_secret) {
        const error = new Error(
            "Razorpay keys are not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET)."
        );
        error.code = "RAZORPAY_NOT_CONFIGURED";
        throw error;
    }

    client = new Razorpay({ key_id, key_secret });

    return client;
};

export default getRazorpay;