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



const UserContext = createContext();



export const UserProvider = ({children})=>{


    const [user,setUser] = useState(null);

    const [loading,setLoading] = useState(true);



    const login = (userData)=>{


        const updatedUser =
        userData.result
        ?
        userData.result
        :
        userData;



        setUser(updatedUser);


        localStorage.setItem(
            "user",
            JSON.stringify(updatedUser)
        );


    };




    const logout = async()=>{


        try{


            await signOut(auth);


            setUser(null);


            localStorage.removeItem("user");



        }catch(error){


            console.error(
                "Logout error:",
                error
            );


        }


    };






    const handlegooglesignin = async()=>{


        try{


            const result =
            await signInWithPopup(
                auth,
                provider
            );



            const firebaseuser =
            result.user;



            const payload={

                email:
                firebaseuser.email,

                name:
                firebaseuser.displayName,

                image:
                firebaseuser.photoURL

            };




            const response =
            await AxiosInstance.post(
                "/user/login",
                payload
            );



            login(response.data);



        }catch(error){


            console.error(
                "Google Sign In Error:",
                error
            );


        }


    };







    useEffect(()=>{


        const storedUser =
        localStorage.getItem("user");



        if(storedUser){


            setUser(
                JSON.parse(storedUser)
            );


        }





        const unsubscribe =
        onAuthStateChanged(
            auth,
            async(firebaseuser)=>{


                if(firebaseuser){


                    try{


                        const payload={

                            email:
                            firebaseuser.email,

                            name:
                            firebaseuser.displayName,

                            image:
                            firebaseuser.photoURL

                        };



                        const response =
                        await AxiosInstance.post(
                            "/user/login",
                            payload
                        );



                        login(response.data);



                    }catch(error){


                        console.error(error);


                    }


                }



                setLoading(false);



            }
        );



        return ()=>unsubscribe();



    },[]);







    return (

        <UserContext.Provider

        value={{
            user,
            setUser,
            login,
            logout,
            handlegooglesignin,
            loading
        }}

        >

            {children}

        </UserContext.Provider>


    );

};






export const useUser = ()=>
useContext(UserContext);
