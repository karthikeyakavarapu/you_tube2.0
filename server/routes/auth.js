import express from "express";
import { login, updateprofile, sendOtp, verifyOtp } from "../controllers/auth.js";
const routes = express.Router();

routes.post("/login", login);
routes.patch("/update/:id", updateprofile);
routes.post("/send-otp", sendOtp);
routes.post("/verify-otp", verifyOtp);

export default routes;
