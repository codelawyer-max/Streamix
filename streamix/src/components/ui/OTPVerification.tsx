import React, { useState } from "react";
import AxiosInstance from "@/lib/AxiosInstance";
import { useUser } from "@/lib/AuthContext";

const OTPVerification = () => {

    const {
        otpEmail,
        setOtpRequired,
        login
    } = useUser();


    const [otp, setOtp] = useState("");

    const [message, setMessage] = useState("");

    const [loading, setLoading] = useState(false);



    const getDeviceInfo = () => {

        if (typeof navigator === "undefined") {
            return "Unknown Device";
        }


        const userAgent = navigator.userAgent;


        let browser = "Unknown Browser";
        let os = "Unknown OS";


        // Browser detection

        if (userAgent.includes("Edg")) {

            browser = "Edge";

        }
        else if (userAgent.includes("Chrome")) {

            browser = "Chrome";

        }
        else if (userAgent.includes("Firefox")) {

            browser = "Firefox";

        }
        else if (
            userAgent.includes("Safari") &&
            !userAgent.includes("Chrome")
        ) {

            browser = "Safari";

        }



        // Operating system detection

        if (userAgent.includes("Windows")) {

            os = "Windows";

        }
        else if (userAgent.includes("Android")) {

            os = "Android";

        }
        else if (userAgent.includes("iPhone")) {

            os = "iPhone";

        }
        else if (userAgent.includes("Mac")) {

            os = "Mac";

        }



        return `${browser} on ${os}`;

    };

    const getLocationInfo = async () => {

        try {

            const response = await fetch(
                "https://ipapi.co/json/"
            );

            const data = await response.json();

            return {
                city: data.city || "",
                state: data.region || ""
            };

        } catch (error) {

            console.log(error);

            return {
                city: "",
                state: ""
            };

        }

    };


    const verifyOTP = async () => {

        try {

            setLoading(true);

            const location = await getLocationInfo();

            const response = await AxiosInstance.post(
                "/otp/verify",
                {
                    email: otpEmail,
                    otp,
                    device: getDeviceInfo(),
                    city: location.city,
                    state: location.state
                }
            );


            if (response.data.verified) {

                setMessage(
                    "OTP Verified Successfully"
                );

                setOtpRequired(false);

                login(response.data);

            }


        } catch (error) {

            console.error(error);

            setMessage("Invalid OTP");

        }
        finally {

            setLoading(false);

        }

    };





    return (

        <div className="fixed inset-0 flex items-center justify-center bg-black/50">


            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl w-80">


                <h2 className="text-xl font-bold mb-4">
                    Verify OTP
                </h2>



                <p className="text-sm mb-4">
                    OTP sent to {otpEmail}
                </p>



                <input

                    type="text"

                    value={otp}

                    onChange={(e) =>
                        setOtp(e.target.value)
                    }

                    placeholder="Enter OTP"

                    className="border p-2 w-full rounded mb-4"

                />



                <button

                    onClick={verifyOTP}

                    disabled={loading}

                    className="bg-blue-600 text-white px-4 py-2 rounded w-full"

                >

                    {
                        loading
                            ?
                            "Verifying..."
                            :
                            "Verify OTP"
                    }


                </button>




                {
                    message &&
                    <p className="mt-3 text-sm">
                        {message}
                    </p>
                }



            </div>


        </div>

    );

};


export default OTPVerification;