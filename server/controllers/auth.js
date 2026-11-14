import mongoose from "mongoose";

import users from "../modals/auth.js";
import { verifyFirebaseIdToken } from "../utils/firebaseAuth.js";
import { getClientIp, lookupLocation, normalizePlace } from "../utils/geo.js";
import { getThemeForNow } from "../utils/theme.js";
import { completeLogin, toClientUser } from "../utils/loginSession.js";
import { startOtpChallenge } from "./otp.js";

// ------------------------------------------------------------------
// POST /user/login   { idToken, deviceId, device }
//
// 1. Google/Firebase must vouch for the email (idToken is checked).
// 2. A new device or a new city/state needs an email OTP first.
// 3. Otherwise a login token is issued straight away.
// ------------------------------------------------------------------

export const login = async (req, res) => {
    const { idToken, deviceId, device } = req.body ?? {};

    if (
        typeof idToken !== "string" ||
        typeof deviceId !== "string" ||
        deviceId.length < 8 ||
        deviceId.length > 100
    ) {
        return res.status(400).json({ message: "Invalid login request." });
    }

    try {
        const identity = await verifyFirebaseIdToken(idToken);

        if (!identity || !identity.emailVerified) {
            return res.status(401).json({
                message: "Google sign-in could not be verified. Please try again.",
            });
        }

        const deviceLabel =
            typeof device === "string" ? device.slice(0, 80) : "";

        const geo = await lookupLocation(getClientIp(req));

        let user = await users
            .findOne({ email: identity.email })
            .select("+trustedDevices");

        // ---------------- NEW USER ----------------

        if (!user) {
            user = new users({
                email: identity.email,
                name: identity.name,
                image: identity.image,
                theme: getThemeForNow(),
                themeSource: "auto",
                plan: "free",
                trustedDevices: [],
            });

            const session = await completeLogin(user, {
                deviceId,
                deviceLabel,
                geo,
            });

            return res.status(200).json(session);
        }

        // ---------------- EXISTING USER ----------------

        const knownDevice = (user.trustedDevices || []).some(
            (trusted) => trusted.deviceId === deviceId
        );

        const isNewDevice = !knownDevice;

        // Only compare when we know both the old and the new location
        const hadLocation = Boolean(user.lastCity || user.lastState);

        const isNewLocation = Boolean(
            geo &&
                (geo.city || geo.state) &&
                hadLocation &&
                (normalizePlace(geo.city) !== normalizePlace(user.lastCity) ||
                    normalizePlace(geo.state) !== normalizePlace(user.lastState))
        );

        console.log(
            `LOGIN CHECK: newDevice=${isNewDevice} newLocation=${isNewLocation} location=${
                geo ? `${geo.city}, ${geo.state}` : "unknown"
            }`
        );

        if (isNewDevice || isNewLocation) {
            try {
                const challenge = await startOtpChallenge({
                    user,
                    deviceId,
                    deviceLabel,
                    geo,
                });

                return res.status(200).json({
                    otpRequired: true,
                    reason: isNewDevice ? "new_device" : "new_location",
                    ...challenge,
                });
            } catch (error) {
                console.error("OTP email error:", error.message);

                return res.status(502).json({
                    message:
                        "We could not send the verification email. Please try again in a moment.",
                });
            }
        }

        const session = await completeLogin(user, { deviceId, deviceLabel, geo });

        return res.status(200).json(session);
    } catch (error) {
        if (error.code === "AUTH_NOT_CONFIGURED") {
            console.error(error.message);

            return res.status(503).json({
                message: "Login is not available right now. Please try again later.",
            });
        }

        console.error("Login error:", error);

        return res.status(500).json({ message: "Something went wrong" });
    }
};

// ------------------------------------------------------------------
// PATCH /user/update/:_id   (own profile only)
// ------------------------------------------------------------------

export const updateprofile = async (req, res) => {
    const { _id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(_id)) {
        return res.status(400).json({ message: "User unavailable" });
    }

    const { channelname, description, location, showLocation } = req.body ?? {};

    // Only these fields can be changed, and only if they were sent
    const update = {};

    if (typeof channelname === "string") {
        update.channelname = channelname.trim().slice(0, 60);
    }

    if (typeof description === "string") {
        update.description = description.trim().slice(0, 500);
    }

    if (typeof location === "string") {
        update.location = location.trim().slice(0, 80);
    }

    if (showLocation !== undefined) {
        update.showLocation = showLocation === true || showLocation === "true";
    }

    try {
        const updatedUser = await users.findByIdAndUpdate(
            _id,
            { $set: update },
            { new: true }
        );

        return res.status(200).json({ result: updatedUser });
    } catch (error) {
        console.error(error);

        return res.status(500).json({ message: "Something went wrong" });
    }
};

// ------------------------------------------------------------------
// GET /user/:id
//   Your own id: the full record.
//   Anybody else's: public channel details only.
// ------------------------------------------------------------------

export const getUser = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid User ID" });
    }

    try {
        const user = await users.findById(id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (req.userId && String(req.userId) === String(user._id)) {
            return res.status(200).json({ result: toClientUser(user) });
        }

        return res.status(200).json({
            result: {
                _id: user._id,
                name: user.name,
                channelname: user.channelname,
                description: user.description,
                image: user.image,
                joinedon: user.joinedon,
                location: user.showLocation ? user.location : "",
            },
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({ message: "Something went wrong" });
    }
};

// ------------------------------------------------------------------
// PATCH /user/theme/:id   (own account only)
//   { theme: "light" | "dark" }  -> the user's own choice (kept)
//   { auto: true }               -> back to the login-time rule
// ------------------------------------------------------------------

export const updateTheme = async (req, res) => {
    const { id } = req.params;
    const { theme, auto } = req.body ?? {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid User ID" });
    }

    let update;

    if (auto === true) {
        update = { theme: getThemeForNow(), themeSource: "auto" };
    } else if (["light", "dark"].includes(theme)) {
        update = { theme, themeSource: "manual" };
    } else {
        return res.status(400).json({ message: "Invalid theme value" });
    }

    try {
        const updatedUser = await users.findByIdAndUpdate(
            id,
            { $set: update },
            { new: true }
        );

        return res.status(200).json({ result: updatedUser });
    } catch (error) {
        console.error(error);

        return res.status(500).json({ message: "Something went wrong" });
    }
};
