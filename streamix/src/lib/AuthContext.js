import React, {
    createContext,
    useContext,
    useEffect,
    useState
} from "react";

import {
    signInWithPopup,
    signOut
} from "firebase/auth";

import {
    auth,
    provider
} from "./firebase";

import AxiosInstance from "./AxiosInstance";
import { useTheme } from "./ThemeContext";




const UserContext = createContext();


// A random id that identifies THIS browser. A new browser or a cleared
// browser means a new device, which asks for an OTP.
const getDeviceId = () => {

    const makeId = () =>
        typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;

    try {

        let id = localStorage.getItem("deviceId");

        if (!id) {

            id = makeId();

            localStorage.setItem("deviceId", id);

        }

        return id;

    } catch (error) {

        return makeId();

    }

};


const getDeviceInfo = () => {

    const userAgent = navigator.userAgent;

    let browser = "Unknown Browser";
    let os = "Unknown OS";


    if (userAgent.includes("Edg")) {
        browser = "Edge";
    }
    else if (userAgent.includes("Chrome")) {
        browser = "Chrome";
    }
    else if (userAgent.includes("Firefox")) {
        browser = "Firefox";
    }
    else if (userAgent.includes("Safari")) {
        browser = "Safari";
    }


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




export const UserProvider = ({ children }) => {



    const [user, setUser] = useState(null);

    const [loading, setLoading] = useState(true);

    const [otpRequired, setOtpRequired] = useState(false);

    const [otpEmail, setOtpEmail] = useState("");

    const [otpSessionId, setOtpSessionId] = useState("");

    const { setTheme } = useTheme();




    // Called with the server's login response: { token, result }
    const login = (userData) => {


        const updatedUser =
            userData.result
                ?
                userData.result
                :
                userData;


        if (userData.token) {

            localStorage.setItem(
                "token",
                userData.token
            );

        }


        setUser(updatedUser);


        if (updatedUser.theme) {

            setTheme(updatedUser.theme);

        }


        localStorage.setItem(
            "user",
            JSON.stringify(updatedUser)
        );


    };



    const clearSession = () => {

        setUser(null);

        localStorage.removeItem("user");

        localStorage.removeItem("token");

    };



    const logout = async () => {


        try {

            await signOut(auth);

        } catch (error) {

            console.error(
                "Logout error:",
                error
            );

        } finally {

            clearSession();

        }


    };



    // Close the OTP box and forget the half-finished login
    const cancelOtp = async () => {

        setOtpRequired(false);

        setOtpSessionId("");

        try {

            await signOut(auth);

        } catch (error) {

            console.error(error);

        }

    };




    const handlegooglesignin = async () => {


        try {


            const result =
                await signInWithPopup(
                    auth,
                    provider
                );


            // Google's proof of who signed in. The server checks it.
            const idToken =
                await result.user.getIdToken();


            const response =
                await AxiosInstance.post(
                    "/user/login",
                    {
                        idToken,
                        deviceId: getDeviceId(),
                        device: getDeviceInfo()
                    }
                );



            if (response.data.otpRequired) {

                setOtpEmail(
                    response.data.email
                );

                setOtpSessionId(
                    response.data.otpSessionId
                );

                setOtpRequired(true);

                return;

            }


            login(response.data);



        } catch (error) {


            console.error(
                "Google Sign In Error:",
                error?.response?.data?.message || error
            );


        }


    };







    useEffect(() => {


        let cancelled = false;


        const restoreSession = async () => {

            const storedUser =
                localStorage.getItem("user");

            const token =
                localStorage.getItem("token");


            // Logged in before the login token existed: log in again
            if (storedUser && !token) {

                localStorage.removeItem("user");

            }


            if (storedUser && token) {

                try {

                    const parsed = JSON.parse(storedUser);

                    setUser(parsed);

                    if (parsed.theme) {

                        setTheme(parsed.theme);

                    }

                    setLoading(false);


                    // Refresh from the server: latest plan, theme, profile
                    const response =
                        await AxiosInstance.get(
                            `/user/${parsed._id}`
                        );

                    if (!cancelled && response.data.result) {

                        setUser(response.data.result);

                        localStorage.setItem(
                            "user",
                            JSON.stringify(response.data.result)
                        );

                    }

                } catch (error) {

                    // A 401 is handled by the "auth-expired" event below.
                    // Any other problem (offline...) keeps the saved user.

                }

            }


            if (!cancelled) {

                setLoading(false);

            }

        };


        restoreSession();


        const handleExpired = () => clearSession();

        window.addEventListener(
            "auth-expired",
            handleExpired
        );


        return () => {

            cancelled = true;

            window.removeEventListener(
                "auth-expired",
                handleExpired
            );

        };


    }, []);







    return (

        <UserContext.Provider

            value={{
                user,
                setUser,
                login,
                logout,
                handlegooglesignin,
                loading,

                otpRequired,
                otpEmail,
                otpSessionId,
                setOtpRequired,
                cancelOtp
            }}

        >

            {children}

        </UserContext.Provider>


    );

};






export const useUser = () =>
    useContext(UserContext);
