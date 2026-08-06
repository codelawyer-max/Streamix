import React, {
    createContext,
    useContext,
    useEffect,
    useState
} from "react";

import {
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from "firebase/auth";

import {
    auth,
    provider
} from "./firebase";

import AxiosInstance from "./AxiosInstance";
import { useTheme } from "./ThemeContext";




const UserContext = createContext();



export const UserProvider = ({ children }) => {



    const [user, setUser] = useState(null);

    const [loading, setLoading] = useState(true);

    const [otpRequired, setOtpRequired] = useState(false);

    const [otpEmail, setOtpEmail] = useState("");

    const { setTheme } = useTheme();





    const login = (userData) => {


        const updatedUser =
            userData.result
                ?
                userData.result
                :
                userData;


        setUser(updatedUser);


        if (updatedUser.theme) {

            setTheme(updatedUser.theme);

        }


        localStorage.setItem(
            "user",
            JSON.stringify(updatedUser)
        );


    };




    const logout = async () => {


        try {


            await signOut(auth);


            setUser(null);


            localStorage.removeItem("user");



        } catch (error) {


            console.error(
                "Logout error:",
                error
            );


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

    const getLocationInfo = async () => {

        try {

            const response =
                await fetch(
                    "https://ipapi.co/json/"
                );


            const data =
                await response.json();


            return {

                city: data.city || "",

                state: data.region || ""

            };


        } catch (error) {

            console.log(
                "Location fetch error:",
                error
            );


            return {

                city: "",

                state: ""

            };

        }

    };




    const handlegooglesignin = async () => {


        try {


            const result =
                await signInWithPopup(
                    auth,
                    provider
                );



            const firebaseuser =
                result.user;

            const device = getDeviceInfo();
            const location =
                await getLocationInfo();



            const payload = {

                email: firebaseuser.email,

                name: firebaseuser.displayName,

                image: firebaseuser.photoURL,

                device,

                city: location.city,

                state: location.state

            };




            const response =
                await AxiosInstance.post(
                    "/user/login",
                    payload
                );



            if (response.data.otpRequired) {

                setOtpRequired(true);

                setOtpEmail(
                    response.data.email
                );

                return;

            }


            login(response.data);



        } catch (error) {


            console.error(
                "Google Sign In Error:",
                error
            );


        }


    };







    useEffect(() => {


        const storedUser =
            localStorage.getItem("user");



        if (storedUser) {


            setUser(
                JSON.parse(storedUser)
            );


        }





        const unsubscribe =
            onAuthStateChanged(
                auth,
                async (firebaseuser) => {

                    if (firebaseuser) {

                        const storedUser = localStorage.getItem("user");

                        if (storedUser) {

                            login(JSON.parse(storedUser));

                        }

                    }



                    setLoading(false);



                }
            );



        return () => unsubscribe();



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
                setOtpRequired
            }}

        >

            {children}

        </UserContext.Provider>


    );

};






export const useUser = () =>
    useContext(UserContext);
