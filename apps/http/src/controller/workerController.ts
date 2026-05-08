import { prisma } from "@repo/db";
import { asyncHandler } from "../utils/tryCatch";
import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/errorHandler";
import { AuthRequest } from "../utils/authRequest";
interface workerInput {
  name: string;
  wage: number;
  isActive: boolean;
}
const RESERVED_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function parseInput(body: any): {
  data?: workerInput;
  error?: string;
} {
  if (!body || typeof body !== "object") {
    return { error: "Invalid payload" };
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const wage = typeof body.wage === "number" ? Math.abs(body.wage) : null;
  const isActive = typeof body.isActive === "boolean" ? body.isActive : true;
  if (!name) return { error: "name is required" };
  if (!wage) {
    return { error: "wage is required" };
  }
  if (wage > 5000) {
    return { error: "max wage is too big" };
  }
  if (RESERVED_KEYS.has(name)) {
    return {
      error: "please enter a valid name",
    };
  }
  return {
    data: {
      name,
      wage,
      isActive,
    },
  };
}
export const addWorker = asyncHandler(async function (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const { data, error } = parseInput(req.body);
  if (error) {
    throw new AppError(error, 500);
  }
  const userId = Number(req.userId);
  const existingWorker = await prisma.worker.findFirst({
    where: {
      name: data?.name,
    },
  });
  if (existingWorker) {
    throw new AppError("already added employee", 401);
  }
  const worker = await prisma.worker.create({
    data: {
      name: data!.name,
      wage: data!.wage,
      isActive: data!.isActive,
      userId: userId,
    },
  });
  res.status(200).json({
    message: "worker added successfully",
  });
});

export const deleteWorker = asyncHandler(async function (
  req: AuthRequest,
  res: Response,
) {
  const { name } = req.body;
  if (typeof name !== "string") {
    throw new AppError("name should be string", 401);
  }
  const userId = Number(req.userId);
  const worker = await prisma.worker.findFirst({
    where: {
      name,
    },
  });
  if (!worker) {
    throw new AppError("user does not exist", 401);
  }
  await prisma.worker.delete({
    where: {
      id: worker.id,
    },
  });
});

export const getAllWorkers = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    const workers = await prisma.worker.findMany({
      where: {
        userId: Number(userId),
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({
      success: "true",
      workers,
    });
  },
);
