import express from "express";
import { 
    login,
    updateprofile,
    getUser
} from "../controllers/auth.js";


const routes = express.Router();


routes.post("/login", login);


routes.patch("/update/:id", updateprofile);


routes.get("/:id", getUser);



export default routes;


