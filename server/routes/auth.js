import express from "express";

import {
    login,
    updateprofile,
    getUser,
    updateTheme
} from "../controllers/auth.js";


const routes = express.Router();


routes.post("/login", login);


routes.patch("/update/:_id", updateprofile);

routes.patch("/theme/:id", updateTheme);


routes.get("/:id", getUser);




export default routes;


