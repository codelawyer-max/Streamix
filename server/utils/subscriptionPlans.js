const subscriptionPlans = {

    free: {
        name: "Free",
        price: 0,
        downloadLimit: 1,
        watchTime: "Limited",
        adFree: false
    },


    bronze: {
        name: "Bronze",
        price: 99,
        downloadLimit: 5,
        watchTime: "Extended",
        adFree: false
    },


    silver: {
        name: "Silver",
        price: 199,
        downloadLimit: 15,
        watchTime: "Extended",
        adFree: true
    },


    gold: {
        name: "Gold",
        price: 299,
        downloadLimit: 30,
        watchTime: "Unlimited",
        adFree: true
    }

};


export default subscriptionPlans;