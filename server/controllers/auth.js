import users from "../modals/auth.js";
import mongoose from "mongoose";
import OTP from "../modals/otp.js";
import sendEmail from "../utils/sendEmail.js";

const getDefaultTheme = () => {




    const now = new Date();

    const istTime = new Date(
        now.toLocaleString("en-US", {
            timeZone: "Asia/Kolkata"
        })
    );


    const hour = istTime.getHours();


    console.log("IST HOUR:", hour);


    if (hour >= 10 && hour < 12) {
        return "light";
    }


    return "dark";

};

export const login = async (req, res) => {




    const {
        email,
        name,
        image,
        device,
        city,
        state
    } = req.body;

    console.log(
        "LOCATION:",
        city,
        state
    );


    try {

        const existingUser = await users.findOne({ email });






        // ---------------- NEW USER ----------------

        if (!existingUser) {

            console.log("NEW USER CREATED");


            const newuser = await users.create({

                email,
                name,
                image,

                theme: getDefaultTheme(),

                lastDevice: device,

                lastCity: city,

                lastState: state,

                lastLogin: new Date()

            });


            console.log(
                "NEW USER THEME:",
                newuser.theme
            );


            return res.status(200).json({
                result: newuser
            });

        }



        // ---------------- EXISTING USER ----------------




        const userObject = existingUser.toObject();

        if (!existingUser.plan) {
            existingUser.plan = "free";
        }

        if (!existingUser.subscriptionStatus) {
            existingUser.subscriptionStatus = "inactive";
        }

        await existingUser.save();


        if (!existingUser.theme) {





            const defaultTheme = getDefaultTheme();


            existingUser.theme = defaultTheme;


            await existingUser.save();


            console.log(
                "DEFAULT THEME SAVED:",
                defaultTheme
            );


        }
        else { }









        // ==============================
        // DEVICE COMPARISON LOGIC START
        // ==============================


        const previousDevice = existingUser.lastDevice;


        const isNewDevice =
            previousDevice &&
            previousDevice !== device;

        const isNewLocation =
            existingUser.lastCity !== city ||
            existingUser.lastState !== state;









        console.log(
            "IS NEW DEVICE:",
            isNewDevice
        );

        console.log(
            "IS NEW LOCATION:",
            isNewLocation
        );
        if (isNewDevice || isNewLocation) {


            console.log(
                "NEW DEVICE OR LOCATION CHANGE - OTP REQUIRED"
            );


            // Remove old OTP if any exists
            await OTP.deleteMany({
                email: existingUser.email
            });



            // Generate 6 digit OTP
            const otp =
                Math.floor(
                    100000 + Math.random() * 900000
                ).toString();



            // Save OTP
            await OTP.create({

                email: existingUser.email,

                otp

            });



            await sendEmail(
                existingUser.email,
                otp
            );



            return res.status(200).json({

                otpRequired: true,

                email: existingUser.email

            });


        }



        // ============================
        // UPDATE LOGIN INFORMATION
        // ============================


        existingUser.lastDevice = device;

        existingUser.lastCity = city;

        existingUser.lastState = state;

        existingUser.lastLogin = new Date();

        await existingUser.save();



        console.log(
            "DEVICE SAVED:",
            existingUser.lastDevice
        );


        console.log(
            "LAST LOGIN:",
            existingUser.lastLogin
        );



        // ==============================
        // DEVICE COMPARISON LOGIC END
        // ==============================



        return res.status(200).json({

            result: existingUser,

            isNewDevice

        });



    } catch (error) {


        console.log(error);


        return res.status(500).json({

            message: "Something went wrong"

        });

    }

};




export const updateprofile = async (req, res) => {


    const { _id } = req.params;

    console.log("_id received:", _id);
    console.log("isValid:", mongoose.Types.ObjectId.isValid(_id));


    const {
        channelname,
        description,
        location,
        showLocation
    } = req.body;



    if (!mongoose.Types.ObjectId.isValid(_id)) {

        return res.status(400).json({
            message: "User unavailable"
        });

    }



    try {


        const updatedUser =
            await users.findByIdAndUpdate(

                _id,

                {
                    $set: {

                        channelname,
                        description,
                        location,
                        showLocation

                    }
                },

                {
                    new: true
                }

            );


        return res.status(200).json({

            result: updatedUser

        });



    } catch (error) {


        console.error(error);


        return res.status(500).json({

            message: "Something went wrong"

        });


    }


};






export const getUser = async (req, res) => {


    const { id } = req.params;



    if (!mongoose.Types.ObjectId.isValid(id)) {

        return res.status(400).json({
            message: "Invalid User ID"
        });

    }



    try {


        const user = await users.findById(id);



        if (!user) {

            return res.status(404).json({
                message: "User not found"
            });

        }



        return res.status(200).json({

            result: user

        });



    } catch (error) {


        console.error(error);


        return res.status(500).json({

            message: "Something went wrong"

        });


    }


};





export const updateTheme = async (req, res) => {


    const { id } = req.params;

    const { theme } = req.body;



    if (!mongoose.Types.ObjectId.isValid(id)) {

        return res.status(400).json({
            message: "Invalid User ID"
        });

    }



    if (!theme || !["light", "dark"].includes(theme)) {

        return res.status(400).json({
            message: "Invalid theme value"
        });

    }



    try {


        const updatedUser =
            await users.findByIdAndUpdate(

                id,

                {

                    $set: {
                        theme
                    }

                },

                {

                    new: true

                }

            );



        return res.status(200).json({

            result: updatedUser

        });



    } catch (error) {


        console.error(error);


        return res.status(500).json({

            message: "Something went wrong"

        });


    }


};