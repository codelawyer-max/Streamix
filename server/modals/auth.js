import mongoose from "mongoose";

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

    joinedon: {
        type: Date,
        default: Date.now
    },
});

export default mongoose.model("User", userschema);
