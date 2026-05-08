import jwt, { JwtPayload } from "jsonwebtoken";
import { NextFunction, Response } from "express";
import { asyncHandler } from "../utils/tryCatch";
import { AppError } from "../utils/errorHandler";
import { AuthRequest } from "../utils/authRequest";

export const authMiddleware = asyncHandler(
  (req: AuthRequest, res: Response, next: NextFunction) => {
    const headerToken = req.headers.authorization?.startsWith("Bearer")
      ? req.headers.authorization.split(" ")[1]
      : undefined;
    const cookieToken = req.cookies?.accessToken as string | undefined;
    const token = cookieToken ?? headerToken;

    if (!token) {
      throw new AppError("Unauthorized. Please login.", 401);
    }

    const decoded = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET as string,
    ) as JwtPayload;

    const userId = decoded.id ?? decoded.userId;
    if (!userId) {
      throw new AppError("Unauthorized. Please login.", 401);
    }

    req.userId = userId;
    next();
  },
);
