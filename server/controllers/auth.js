import users from "../modals/auth.js";
import mongoose from "mongoose";


export const login = async (req, res) => {

    const { email, name, image } = req.body;


    try {

        const existingUser = await users.findOne({ email });


        if (!existingUser) {

            const newuser = await users.create({
                email,
                name,
                image
            });


            return res.status(200).json({
                result: newuser
            });

        }
        else {

            return res.status(200).json({
                result: existingUser
            });

        }


    } catch (error) {

        console.log(error);

        return res.status(500).json({
            message: "Something went wrong"
        });

    }

};





export const updateprofile = async (req, res) => {


    const { _id } = req.params;


    const {
        channelname,
        description
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
                        description

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