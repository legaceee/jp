import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import "dotenv/config";
import { asyncHandler } from "../utils/tryCatch";
import { signinSchema, signupSchema } from "../validations/auth.validations";
import { AppError } from "../utils/errorHandler";
import prisma from "@repo/db";
import { AuthRequest } from "../utils/authRequest";

export const signup = asyncHandler(async function (
  req: Request,
  res: Response,
) {
  const result = signupSchema.safeParse(req.body);
  if (!result.success) {
    throw new AppError(JSON.stringify(result.error.flatten().fieldErrors), 400);
  }
  const data = result.data;
  const existingUser = await prisma.user.findFirst({
    where: {
      email: data.email,
    },
  });
  if (existingUser) {
    throw new AppError("user already exists", 409);
  }
  const hashedPassword = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      password: hashedPassword,
    },
  });
  return res.status(201).json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  });
});

export const signin = asyncHandler(async function (
  req: Request,
  res: Response,
) {
  const result = signinSchema.safeParse(req.body);
  if (!result.success) {
    throw new AppError(JSON.stringify(result.error.flatten().fieldErrors), 400);
  }
  const data = result.data;
  const user = await prisma.user.findUnique({
    where: {
      email: data.email,
    },
  });
  if (!user) {
    throw new AppError("Invalid credentials", 400);
  }
  const password = await bcrypt.compare(data.password, user.password);
  if (!password) {
    throw new AppError("invalid credentials", 401);
  }
  const accessToken = jwt.sign(
    { id: user.id },
    process.env.ACCESS_TOKEN_SECRET!,
    {
      expiresIn: "15m",
    },
  );
  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.REFRESH_TOKEN_SECRET!,
    {
      expiresIn: "7d",
    },
  );
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 15 * 60 * 1000,
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.status(200).json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  });
});

export const refreshToken = asyncHandler(async function (
  req: Request,
  res: Response,
) {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    throw new AppError("No refresh Token", 401);
  }
  const decoded = jwt.verify(
    refreshToken,
    process.env.REFRESH_TOKEN_SECRET!,
  ) as jwt.JwtPayload;
  const userId = decoded.id ?? decoded.userId;
  if (!userId) {
    throw new AppError("Invalid refresh token", 401);
  }
  const newAccessToken = jwt.sign(
    { id: userId },
    process.env.ACCESS_TOKEN_SECRET!,
    { expiresIn: "15m" },
  );

  res.cookie("accessToken", newAccessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 15 * 60 * 1000,
  });
  return res.json({
    message: "access token refreshed",
  });
});

export const signOut = asyncHandler(async function (
  req: AuthRequest,
  res: Response,
) {
  const userId = req.userId;
  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  return res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});
