// Single source of truth for every plan: price, limits and benefits.
// Change a price or limit HERE and the whole app (payments, downloads,
// subscription page, invoices) follows.
//
// null  = unlimited
// price = rupees (the payment amount is price * 100 paise)

const subscriptionPlans = {

    free: {
        name: "Free",
        price: 0,
        durationDays: 0,
        downloadLimit: 1,        // downloads per day
        watchLimitMinutes: 5,    // minutes of watch time per video
        watchTime: "Limited",
        adFree: false,
        features: [
            "5 minutes of watch time per video",
            "1 download per day",
            "Access to free videos",
        ],
    },


    bronze: {
        name: "Bronze",
        price: 199,
        durationDays: 30,
        downloadLimit: 5,
        watchLimitMinutes: 7,
        watchTime: "Extended",
        adFree: false,
        features: [
            "7 minutes of watch time per video",
            "5 downloads per day",
            "Access to Bronze videos",
        ],
    },


    silver: {
        name: "Silver",
        price: 399,
        durationDays: 30,
        downloadLimit: 15,
        watchLimitMinutes: 10,
        watchTime: "Extended",
        adFree: true,
        features: [
            "10 minutes of watch time per video",
            "15 downloads per day",
            "Access to Silver videos",
            "Ad-free viewing",
        ],
    },


    gold: {
        name: "Gold",
        price: 699,
        durationDays: 30,
        downloadLimit: 30,
        watchLimitMinutes: null,
        watchTime: "Unlimited",
        adFree: true,
        features: [
            "Unlimited watch time",
            "30 downloads per day",
            "Access to all premium videos",
            "Ad-free viewing",
        ],
    },

};


export default subscriptionPlans;