import { signToken } from "../middleware/auth.js";
import { getThemeForNow } from "./theme.js";

const MAX_TRUSTED_DEVICES = 10;

// The user object that is safe to send to the browser
export const toClientUser = (user) => {
    const plain =
        typeof user.toObject === "function" ? user.toObject() : { ...user };

    delete plain.trustedDevices;

    return plain;
};

// Called once a login is fully approved (Google verified, and the OTP too
// when one was needed). Remembers the device, applies the login theme rule,
// saves, and issues the login token.
export const completeLogin = async (user, { deviceId, deviceLabel, geo }) => {
    const now = new Date();

    if (!Array.isArray(user.trustedDevices)) {
        user.trustedDevices = [];
    }

    const known = user.trustedDevices.find(
        (device) => device.deviceId === deviceId
    );

    if (known) {
        known.label = deviceLabel || known.label;
        known.city = geo ? geo.city : known.city;
        known.state = geo ? geo.state : known.state;
        known.lastSeen = now;
    } else {
        user.trustedDevices.push({
            deviceId,
            label: deviceLabel || "",
            city: geo ? geo.city : "",
            state: geo ? geo.state : "",
            lastSeen: now,
        });
    }

    // Keep the list short: drop the least recently used devices
    while (user.trustedDevices.length > MAX_TRUSTED_DEVICES) {
        let oldestIndex = 0;

        user.trustedDevices.forEach((device, index) => {
            if (
                new Date(device.lastSeen) <
                new Date(user.trustedDevices[oldestIndex].lastSeen)
            ) {
                oldestIndex = index;
            }
        });

        user.trustedDevices.splice(oldestIndex, 1);
    }

    if (typeof user.markModified === "function") {
        user.markModified("trustedDevices");
    }

    if (geo) {
        user.lastCity = geo.city;
        user.lastState = geo.state;
    }

    if (deviceLabel) user.lastDevice = deviceLabel;

    user.lastLogin = now;

    // Theme rule: automatic users get light (10:00-12:00 IST) or dark at
    // every login. Users who picked a theme themselves keep their choice.
    if (user.themeSource !== "manual" || !user.theme) {
        user.theme = getThemeForNow(now);
        user.themeSource = "auto";
    }

    if (!user.plan) user.plan = "free";
    if (!user.subscriptionStatus) user.subscriptionStatus = "inactive";

    await user.save();

    return {
        token: signToken(user._id),
        result: toClientUser(user),
    };
};
