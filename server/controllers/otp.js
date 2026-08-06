import OTP from "../modals/otp.js";
import users from "../modals/auth.js";



export const generateOTP = async (req, res) => {


    const { email } = req.body;



    try {


        // Generate 6 digit OTP

        const otp =
            Math.floor(
                100000 + Math.random() * 900000
            ).toString();



        // Remove old OTP if exists

        await OTP.deleteMany({
            email
        });



        // Save new OTP

        const newOTP =
            await OTP.create({

                email,

                otp

            });



        console.log(
            "GENERATED OTP:",
            otp
        );



        return res.status(200).json({

            message:
                "OTP generated successfully",

            email

        });



    } catch (error) {


        console.log(error);



        return res.status(500).json({

            message:
                "Something went wrong"

        });


    }


};

export const verifyOTP = async (req, res) => {


    const {
        email,
        otp,
        device,
        city,
        state
    } = req.body;



    try {


        const existingOTP =
            await OTP.findOne({
                email
            });



        if (!existingOTP) {


            return res.status(400).json({

                message:
                    "OTP expired or not found"

            });

        }



        if (existingOTP.otp !== otp) {


            return res.status(400).json({

                message:
                    "Invalid OTP"

            });

        }



        const user =
            await users.findOne({
                email
            });



        if (!user) {


            return res.status(404).json({

                message:
                    "User not found"

            });

        }



        // Update device after successful verification


        user.lastDevice = device;

        user.lastCity = city;

        user.lastState = state;

        user.lastLogin = new Date();


        await user.save();



        // Delete OTP after successful verification

        await OTP.deleteOne({

            email

        });



        return res.status(200).json({


            message:
                "OTP verified successfully",


            verified: true,


            result: user


        });



    } catch (error) {


        console.log(error);



        return res.status(500).json({

            message:
                "Something went wrong"

        });


    }


};