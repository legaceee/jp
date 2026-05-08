import { NextFunction, Request, Response } from "express";
import { AppError } from "./errorHandler";

const handlePrismaErrors = (err: any) => {
  if (err.code === "P2002") {
    const fields = err.meta?.target?.join(",") || "fields";
    return new AppError(`Duplicate value for ${fields}`, 400);
  }
  if (err.code === "P2003") {
    return new AppError("invalid reference(related record not found", 400);
  }
  if (err.code === "P2025") {
    return new AppError("Record not found", 404);
  }
  return err;
};
const handleJwtErrorrs = (err: any) => {
  if (err.name === "JSONWebTokenError") {
    return new AppError("invalid token,please try again", 401);
  }
  if (err.name === "TokenExpiredError") {
    return new AppError("token expired,please login again", 401);
  }
  return err;
};
export default (err: any, req: Request, res: Response, next: NextFunction) => {
  let error = err;

  if (error.code && error.code.startsWith("P2")) {
    error = handlePrismaErrors(error);
  }
  if (
    error.name === "JSONWebTokenError" ||
    error.name === "TokenExpiredError"
  ) {
    error = handleJwtErrorrs(error);
  }

  const statusCode = error.statusCode || 500;
  const message = error.message || "something went wrong";
  console.error(error);
  res.status(statusCode).json({
    status: statusCode >= 500 ? "error" : "fail",
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};
