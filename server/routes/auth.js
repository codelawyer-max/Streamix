import express from "express";

import {
    login,
    updateprofile,
    getUser,
    updateTheme
} from "../controllers/auth.js";

import {
    requireAuth,
    optionalAuth,
    requireSelf
} from "../middleware/auth.js";


const routes = express.Router();


routes.post("/login", login);

routes.patch("/update/:_id", requireAuth, requireSelf("_id"), updateprofile);

routes.patch("/theme/:id", requireAuth, requireSelf("id"), updateTheme);

// Own id: full record. Other ids: public channel details only.
routes.get("/:id", optionalAuth, getUser);


export default routes;
