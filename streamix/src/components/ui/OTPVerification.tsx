import React, { useEffect, useState } from "react";
import AxiosInstance from "@/lib/AxiosInstance";
import { useUser } from "@/lib/AuthContext";

const RESEND_SECONDS = 30;

const OTPVerification = () => {

    const {
        otpEmail,
        otpSessionId,
        setOtpRequired,
        login,
        cancelOtp
    } = useUser();


    const [otp, setOtp] = useState("");

    const [message, setMessage] = useState("");

    const [isError, setIsError] = useState(false);

    const [loading, setLoading] = useState(false);

    const [resending, setResending] = useState(false);

    const [cooldown, setCooldown] = useState(RESEND_SECONDS);


    // Count down until a new code can be requested
    useEffect(() => {

        if (cooldown <= 0) return;

        const timer = setTimeout(
            () => setCooldown((value) => value - 1),
            1000
        );

        return () => clearTimeout(timer);

    }, [cooldown]);


    const showMessage = (text: string, error: boolean) => {

        setMessage(text);

        setIsError(error);

    };


    const verifyOTP = async () => {

        if (otp.length !== 6) {

            showMessage("Enter the 6-digit code.", true);

            return;

        }

        try {

            setLoading(true);

            setMessage("");

            const response = await AxiosInstance.post(
                "/otp/verify",
                {
                    otpSessionId,
                    otp
                }
            );


            if (response.data.verified) {

                setOtpRequired(false);

                login(response.data);

            }


        } catch (error: any) {

            showMessage(
                error?.response?.data?.message ||
                    "Verification failed. Please try again.",
                true
            );

        }
        finally {

            setLoading(false);

        }

    };


    const resendOTP = async () => {

        try {

            setResending(true);

            const response = await AxiosInstance.post(
                "/otp/resend",
                {
                    otpSessionId
                }
            );

            showMessage(
                response.data.message || "A new code has been sent.",
                false
            );

            setOtp("");

            setCooldown(RESEND_SECONDS);

        } catch (error: any) {

            showMessage(
                error?.response?.data?.message ||
                    "Could not send a new code.",
                true
            );

        }
        finally {

            setResending(false);

        }

    };





    return (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">


            <div className="w-full max-w-sm rounded-xl bg-white p-6 text-gray-900 shadow-xl dark:bg-gray-900 dark:text-white">


                <h2 className="mb-2 text-xl font-bold">
                    Verify it&apos;s you
                </h2>



                <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
                    You are signing in from a new device or location.
                    We sent a 6-digit code to {otpEmail}. It is valid for 5 minutes.
                </p>



                <input

                    type="text"

                    inputMode="numeric"

                    autoComplete="one-time-code"

                    maxLength={6}

                    value={otp}

                    onChange={(e) =>
                        setOtp(e.target.value.replace(/\D/g, ""))
                    }

                    onKeyDown={(e) => {
                        if (e.key === "Enter") verifyOTP();
                    }}

                    placeholder="000000"

                    aria-label="Verification code"

                    className="mb-4 w-full rounded border p-2 text-center text-xl tracking-[0.4em] dark:border-gray-700 dark:bg-gray-800"

                />



                <button

                    onClick={verifyOTP}

                    disabled={loading || otp.length !== 6}

                    className="w-full rounded bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"

                >

                    {
                        loading
                            ?
                            "Verifying..."
                            :
                            "Verify"
                    }


                </button>




                {
                    message &&
                    <p
                        className={`mt-3 text-sm ${
                            isError
                                ? "text-red-600"
                                : "text-green-600"
                        }`}
                    >
                        {message}
                    </p>
                }



                <div className="mt-4 flex items-center justify-between text-sm">

                    <button
                        onClick={resendOTP}
                        disabled={cooldown > 0 || resending}
                        className="text-blue-600 hover:underline disabled:cursor-not-allowed disabled:text-gray-400 disabled:no-underline"
                    >
                        {cooldown > 0
                            ? `Resend code in ${cooldown}s`
                            : resending
                                ? "Sending..."
                                : "Resend code"}
                    </button>

                    <button
                        onClick={cancelOtp}
                        className="text-gray-500 hover:underline"
                    >
                        Cancel
                    </button>

                </div>



            </div>


        </div>

    );

};


export default OTPVerification;
