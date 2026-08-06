import express from "express";

import {
    generateOTP,
    verifyOTP
} from "../controllers/otp.js";


const router = express.Router();



router.post(
    "/generate",
    generateOTP
);

router.post(
    "/verify",
    verifyOTP
);



export default router;