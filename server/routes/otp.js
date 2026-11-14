import express from "express";

import {
    verifyOTP,
    resendOTP
} from "../controllers/otp.js";


const router = express.Router();


// The old /generate route is gone: codes are created by the login itself,
// so nobody can ask the server to create or mail a code for an email.
router.post("/verify", verifyOTP);

router.post("/resend", resendOTP);


export default router;
