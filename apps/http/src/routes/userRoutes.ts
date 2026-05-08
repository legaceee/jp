import { Router } from "express";
import {
  refreshToken,
  signin,
  signOut,
  signup,
} from "../controller/userController";
import { authMiddleware } from "../middleware/auth";

const userRoutes: any = Router();
userRoutes.post("/signin", signin);
userRoutes.post("/signup", signup);
userRoutes.get("/refresh", refreshToken);
userRoutes.post("/logout", authMiddleware, signOut);

export default userRoutes;
