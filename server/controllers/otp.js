import crypto from "crypto";
import mongoose from "mongoose";

import OTP from "../modals/otp.js";
import users from "../modals/auth.js";
import sendEmail from "../utils/sendEmail.js";
import { completeLogin } from "../utils/loginSession.js";

const MAX_ATTEMPTS = 5; // wrong guesses allowed per code
const OTP_TTL_MS = 5 * 60 * 1000; // a code lives 5 minutes
const RESEND_COOLDOWN_MS = 30 * 1000;
const MAX_RESENDS = 3;

// Only a keyed hash of the code is stored, so a leaked database does not
// reveal codes.
const hashOtp = (sessionId, code) =>
    crypto
        .createHmac("sha256", process.env.JWT_SECRET || "")
        .update(`${String(sessionId)}:${code}`)
        .digest("hex");

const safeEqual = (a, b) => {
    const first = Buffer.from(String(a));
    const second = Buffer.from(String(b));

    return first.length === second.length && crypto.timingSafeEqual(first, second);
};

const newCode = () => String(crypto.randomInt(100000, 1000000));

export const maskEmail = (email) => {
    const [name, domain] = String(email).split("@");

    if (!domain) return String(email);

    return `${name.slice(0, 2)}${"*".repeat(Math.max(1, name.length - 2))}@${domain}`;
};

// Called by the login controller when a device or location is new.
// Creates the pending verification and emails the code. If the email
// cannot be sent the pending verification is removed and the error thrown.
export const startOtpChallenge = async ({ user, deviceId, deviceLabel, geo }) => {
    await OTP.deleteMany({ userId: user._id });

    const _id = new mongoose.Types.ObjectId();
    const code = newCode();

    await OTP.create({
        _id,
        userId: user._id,
        codeHash: hashOtp(_id, code),
        deviceId,
        deviceLabel: deviceLabel || "",
        city: geo?.city || "",
        state: geo?.state || "",
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
        lastSentAt: new Date(),
    });

    try {
        await sendEmail(user.email, code);
    } catch (error) {
        await OTP.deleteOne({ _id }).catch(() => {});
        throw error;
    }

    return {
        otpSessionId: String(_id),
        email: maskEmail(user.email),
    };
};

// POST /otp/verify   { otpSessionId, otp }
export const verifyOTP = async (req, res) => {
    const { otpSessionId, otp } = req.body ?? {};

    if (
        !mongoose.isValidObjectId(otpSessionId) ||
        !/^\d{6}$/.test(String(otp || ""))
    ) {
        return res.status(400).json({ message: "Enter the 6-digit code." });
    }

    try {
        // Count this guess FIRST and atomically, so many parallel guesses
        // cannot get past the attempt limit.
        const challenge = await OTP.findOneAndUpdate(
            {
                _id: otpSessionId,
                expiresAt: { $gt: new Date() },
                attempts: { $lt: MAX_ATTEMPTS },
            },
            { $inc: { attempts: 1 } },
            { new: true }
        );

        if (!challenge) {
            return res.status(400).json({
                code: "OTP_EXPIRED",
                message:
                    "This code has expired or was entered wrong too many times. Please sign in again.",
            });
        }

        if (!safeEqual(hashOtp(challenge._id, String(otp)), challenge.codeHash)) {
            const attemptsLeft = Math.max(0, MAX_ATTEMPTS - challenge.attempts);

            return res.status(400).json({
                attemptsLeft,
                message:
                    attemptsLeft > 0
                        ? `Incorrect code. ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} left.`
                        : "Too many wrong attempts. Please sign in again.",
            });
        }

        await OTP.deleteOne({ _id: challenge._id });

        const user = await users
            .findById(challenge.userId)
            .select("+trustedDevices");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const hasGeo = challenge.city || challenge.state;

        const session = await completeLogin(user, {
            deviceId: challenge.deviceId,
            deviceLabel: challenge.deviceLabel,
            geo: hasGeo
                ? { city: challenge.city, state: challenge.state }
                : null,
        });

        return res.status(200).json({
            message: "OTP verified successfully",
            verified: true,
            ...session,
        });
    } catch (error) {
        console.error("Verify OTP error:", error);

        return res.status(500).json({ message: "Something went wrong" });
    }
};

// POST /otp/resend   { otpSessionId }
export const resendOTP = async (req, res) => {
    const { otpSessionId } = req.body ?? {};

    if (!mongoose.isValidObjectId(otpSessionId)) {
        return res.status(400).json({ message: "Invalid request." });
    }

    try {
        const sessionKey = String(new mongoose.Types.ObjectId(otpSessionId));
        const now = new Date();
        const code = newCode();

        // One atomic update: only if still valid, under the resend limit and
        // past the cooldown. A new code also resets the guess counter.
        const challenge = await OTP.findOneAndUpdate(
            {
                _id: sessionKey,
                expiresAt: { $gt: now },
                resends: { $lt: MAX_RESENDS },
                lastSentAt: { $lte: new Date(now.getTime() - RESEND_COOLDOWN_MS) },
            },
            {
                $set: {
                    codeHash: hashOtp(sessionKey, code),
                    attempts: 0,
                    lastSentAt: now,
                    expiresAt: new Date(now.getTime() + OTP_TTL_MS),
                },
                $inc: { resends: 1 },
            },
            { new: true }
        );

        if (!challenge) {
            const current = await OTP.findOne({ _id: sessionKey });

            if (!current || new Date(current.expiresAt) <= now) {
                return res.status(400).json({
                    code: "OTP_EXPIRED",
                    message: "This code has expired. Please sign in again.",
                });
            }

            if (current.resends >= MAX_RESENDS) {
                return res.status(429).json({
                    message: "No more codes can be sent. Please sign in again.",
                });
            }

            const wait = Math.ceil(
                (RESEND_COOLDOWN_MS - (now - new Date(current.lastSentAt))) / 1000
            );

            return res.status(429).json({
                message: `Please wait ${Math.max(1, wait)} seconds before asking for a new code.`,
            });
        }

        const user = await users.findById(challenge.userId);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        try {
            await sendEmail(user.email, code);
        } catch (error) {
            console.error("Resend OTP email error:", error.message);

            return res.status(502).json({
                message: "We could not send the email. Please try again in a moment.",
            });
        }

        return res.status(200).json({ message: "A new code has been sent." });
    } catch (error) {
        console.error("Resend OTP error:", error);

        return res.status(500).json({ message: "Something went wrong" });
    }
};
