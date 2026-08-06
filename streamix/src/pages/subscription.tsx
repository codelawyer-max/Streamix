import React, { useEffect } from "react";
import AxiosInstance from "@/lib/AxiosInstance";
import { useUser } from "@/lib/AuthContext";


const plans = [
    {
        name: "bronze",
        price: 199,
    },
    {
        name: "silver",
        price: 399,
    },
    {
        name: "gold",
        price: 699,
    },
];


const Subscription = () => {


    const {
        user,
        setUser
    } = useUser();



    useEffect(() => {

        const script = document.createElement("script");

        script.src =
            "https://checkout.razorpay.com/v1/checkout.js";

        script.async = true;

        document.body.appendChild(script);


    }, []);




    const handleSubscription = async (plan: string) => {


        try {


            const response =
                await AxiosInstance.post(
                    "/subscription/create-order",
                    {
                        plan,
                    }
                );



            console.log(
                "RAZORPAY KEY:",
                process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
            );



            const order =
                response.data.order;




            const options = {


                key:
                    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,



                amount:
                    order.amount,



                currency:
                    order.currency,



                name:
                    "Streamix",



                description:
                    `${plan} Subscription`,



                order_id:
                    order.id,



                handler:
                    async function (response: any) {


                        console.log(
                            "PAYMENT RESPONSE:",
                            response
                        );



                        try {


                            const verifyResponse =
                                await AxiosInstance.post(
                                    "/subscription/verify-payment",
                                    {

                                        razorpay_order_id:
                                            response.razorpay_order_id,


                                        razorpay_payment_id:
                                            response.razorpay_payment_id,


                                        razorpay_signature:
                                            response.razorpay_signature,


                                        plan,


                                        userId:
                                            user?._id

                                    }
                                );



                            console.log(
                                "PAYMENT VERIFIED:",
                                verifyResponse.data
                            );



                            if (verifyResponse.data.user) {


                                setUser(
                                    verifyResponse.data.user
                                );


                                localStorage.setItem(
                                    "user",
                                    JSON.stringify(
                                        verifyResponse.data.user
                                    )
                                );


                            }



                        } catch(error) {


                            console.error(
                                "Payment verification error:",
                                error
                            );


                        }


                    },



                prefill: {


                    name:
                        user?.name,


                    email:
                        user?.email


                },



                theme: {

                    color:
                        "#3399cc"

                }


            };





            const razorpay =
                new window.Razorpay(options);



            razorpay.open();




        } catch (error) {


            console.error(
                "Subscription error:",
                error
            );


        }


    };




    return (

        <div className="min-h-screen bg-gray-50 p-6">


            <h1 className="mb-8 text-center text-3xl font-bold">
                Choose Your Plan
            </h1>




            <div
                className="
                    grid
                    grid-cols-1
                    md:grid-cols-3
                    gap-6
                "
            >


                {
                    plans.map((item) => (


                        <div

                            key={item.name}

                            className="
                                rounded-xl
                                bg-white
                                p-6
                                shadow
                                text-center
                            "

                        >


                            <h2
                                className="
                                    text-2xl
                                    font-bold
                                    capitalize
                                "
                            >

                                {item.name}

                            </h2>




                            <p className="my-4 text-xl">

                                ₹{item.price}

                            </p>




                            <button

                                onClick={() =>
                                    handleSubscription(item.name)
                                }


                                className="
                                    rounded-lg
                                    bg-blue-600
                                    px-6
                                    py-2
                                    text-white
                                "

                            >

                                Upgrade

                            </button>



                        </div>


                    ))
                }


            </div>


        </div>

    );

};


export default Subscription;