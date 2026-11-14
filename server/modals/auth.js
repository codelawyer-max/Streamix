import mongoose from "mongoose";

// Devices this user has already verified. Never sent to the browser
// (select: false keeps it out of every query unless asked for).
const trustedDeviceSchema = new mongoose.Schema(
    {
        deviceId: { type: String, required: true },
        label: { type: String, default: "" },
        city: { type: String, default: "" },
        state: { type: String, default: "" },
        lastSeen: { type: Date, default: Date.now },
    },
    { _id: false }
);

const userschema = mongoose.Schema({
    name: { type: String },

    email: {
        type: String,
        required: true
    },

    channelname: { type: String },

    description: { type: String },

    image: { type: String },

    location: {
        type: String,
        default: ""
    },

    showLocation: {
        type: Boolean,
        default: false
    },

    theme: {
        type: String,
        enum: ["light", "dark"]
    },

    // "auto"   = the login-time rule (light 10:00-12:00 IST) decides
    // "manual" = the user picked a theme, so it is kept
    themeSource: {
        type: String,
        enum: ["auto", "manual"],
        default: "auto"
    },

    plan: {
        type: String,
        enum: ["free", "bronze", "silver", "gold"],
        default: "free"
    },

    subscriptionStatus: {
        type: String,
        enum: ["inactive", "active"],
        default: "inactive"
    },

    subscriptionStartDate: {
        type: Date,
        default: null
    },

    subscriptionEndDate: {
        type: Date,
        default: null
    },

    // Security Fields
    lastCity: {
        type: String,
        default: ""
    },

    lastState: {
        type: String,
        default: ""
    },

    lastDevice: {
        type: String,
        default: ""
    },

    lastLogin: {
        type: Date
    },

    trustedDevices: {
        type: [trustedDeviceSchema],
        default: [],
        select: false
    },

    joinedon: {
        type: Date,
        default: Date.now
    },
});

export default mongoose.model("User", userschema);
