import axios from "axios";


const AxiosInstance = axios.create({

    baseURL: process.env.NEXT_PUBLIC_BACKEND_URL,

    headers:{
        "Content-Type":"application/json"
    }

});


// Send the login token with every request. The server uses it (not a userId
// sent by the page) to know who is asking.
AxiosInstance.interceptors.request.use((config) => {

    if (typeof window !== "undefined") {

        const token = localStorage.getItem("token");

        if (token) {

            config.headers.Authorization = `Bearer ${token}`;

        }

    }

    return config;

});


// If the server says the login is no longer valid, tell the app to log out
AxiosInstance.interceptors.response.use(

    (response) => response,

    (error) => {

        const url = String(error.config?.url || "");

        const isLoginCall =
            url.includes("/user/login") || url.includes("/otp/");

        if (
            typeof window !== "undefined" &&
            error.response?.status === 401 &&
            !isLoginCall
        ) {

            window.dispatchEvent(new Event("auth-expired"));

        }

        return Promise.reject(error);

    }

);


export default AxiosInstance;
