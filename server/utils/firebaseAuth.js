import axios from "axios";

// Checks a Firebase ID token (from Google sign-in) with Google, so the
// server knows the email really belongs to the person logging in.
//
// Needs FIREBASE_API_KEY: the same public "apiKey" that is in
// streamix/src/lib/firebase.js.
//
// Returns { uid, email, emailVerified, name, image } or null if the token
// is invalid or expired.

export const verifyFirebaseIdToken = async (idToken) => {
    const apiKey = process.env.FIREBASE_API_KEY;

    if (!apiKey) {
        const error = new Error("FIREBASE_API_KEY is not set");
        error.code = "AUTH_NOT_CONFIGURED";
        throw error;
    }

    const headers = {};

    // If the key is restricted to your website in Google Cloud, the server
    // call must look like it comes from there.
    if (process.env.FRONTEND_URL) {
        headers.Referer = process.env.FRONTEND_URL.split(",")[0].trim();
    }

    try {
        const { data } = await axios.post(
            `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
            { idToken },
            { timeout: 8000, headers }
        );

        const account = data?.users?.[0];

        if (!account?.email) return null;

        return {
            uid: account.localId,
            email: account.email,
            emailVerified: Boolean(account.emailVerified),
            name: account.displayName || "",
            image: account.photoUrl || "",
        };
    } catch (error) {
        // 400 = Google says the token is invalid or expired
        if (error.response?.status === 400) return null;

        throw error;
    }
};
