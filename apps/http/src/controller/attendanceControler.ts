import { NextFunction, Response } from "express";
import { asyncHandler } from "../utils/tryCatch";
import { AppError } from "../utils/errorHandler";
import prisma from "@repo/db";
import { AuthRequest } from "../utils/authRequest";
import { success } from "zod";

interface attendanceInput {
  attendanceDate: string;
  workerId: number;
  attendanceValue: 1 | 0 | 0.5;
}
const validValue = [0.5, 1, 0];

function validateInput(body: any): {
  data?: attendanceInput;
  error?: string;
} {
  if (typeof body !== "object") {
    return { error: "give a valid input" };
  }
  const attendanceDate =
    typeof body.attendanceDate === "string" ? body.attendanceDate : null;

  const workerId = typeof body.workerId === "number" ? body.workerId : null;

  const attendanceValue = validValue.includes(body.attendanceValue)
    ? body.attendanceValue
    : null;
  if (!attendanceDate) {
    return { error: "attendance date is required" };
  }

  if (!workerId || workerId <= 0) {
    return { error: "worker id is invalid" };
  }

  if (attendanceValue === null) {
    return { error: "invalid attendance value" };
  }

  return {
    data: {
      attendanceDate,
      workerId,
      attendanceValue,
    },
  };
}

export const markAttendance = asyncHandler(async function (
  req: AuthRequest,
  res: Response,
) {
  const { data, error } = validateInput(req.body);
  if (error) {
    throw new AppError("something went wrong", 401);
  }
  if (!data) {
    throw new AppError("please enter valid data", 402);
  }
  const userId = req.userId;
  const attendance = await prisma.attendance.create({
    data: {
      workerId: data?.workerId,
      attendanceDate: new Date(data?.attendanceDate),
      attendanceValue: data?.attendanceValue,
    },
  });
  res.status(200).json({
    message: "attendance marked successfully",
    attendance,
  });
});

export const updateAttendane = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { data, error } = validateInput(req.body);

    if (error) {
      return new AppError("something went wrong", 401);
    }
    if (!data) {
      return new AppError("please enter valid data", 402);
    }
    const userId = req.userId;
    const attendance = await prisma.attendance.upsert({
      where: {
        workerId_attendanceDate: {
          workerId: data.workerId,
          attendanceDate: new Date(data.attendanceDate),
        },
      },

      update: {
        attendanceValue: data.attendanceValue,
      },

      create: {
        workerId: data.workerId,
        attendanceDate: new Date(data.attendanceDate),
        attendanceValue: data.attendanceValue,
      },
    });
    return res.status(200).json({
      success: "true",
      attendance,
    });
  },
);

export const getAttendance = asyncHandler(async function (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const userId = req.userId;
  const source =
    req.body && typeof req.body === "object" && Object.keys(req.body).length > 0
      ? req.body
      : req.query;
  const workerIdRaw = source.workerId;
  const workerId =
    typeof workerIdRaw === "number" ? workerIdRaw : Number(workerIdRaw);
  const startDate =
    typeof source.startDate === "string" ? source.startDate : undefined;
  const endDate =
    typeof source.endDate === "string" ? source.endDate : undefined;

  if (!workerId || Number.isNaN(workerId)) {
    throw new AppError("invalid input", 402);
  }
  const currentDate = new Date();

  const finalStartDate = startDate
    ? new Date(startDate)
    : new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

  const finalEndDate = endDate
    ? new Date(endDate)
    : new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

  if (isNaN(finalStartDate.getTime()) || isNaN(finalEndDate.getTime())) {
    throw new AppError("Invalid date format", 400);
  }
  if (finalEndDate > new Date()) {
    throw new AppError("Future dates are not allowed", 400);
  }
  const diffInDays =
    (finalEndDate.getTime() - finalStartDate.getTime()) / (1000 * 60 * 60 * 24);

  if (diffInDays > 365) {
    throw new AppError("Date range too large", 400);
  }
  if (finalEndDate < finalStartDate) {
    throw new AppError("invalid input", 402);
  }
  const totalAttendance = await prisma.attendance.findMany({
    where: {
      workerId: workerId,
      attendanceDate: {
        gte: finalStartDate,
        lte: finalEndDate,
      },
    },
    select: {
      attendanceDate: true,
      attendanceValue: true,
    },
    orderBy: {
      attendanceDate: "asc",
    },
  });

  if (totalAttendance.length === 0) {
    throw new AppError("No attendance found", 404);
  }
  let totalDays = 0;
  totalAttendance.forEach((attendance) => {
    totalDays += attendance.attendanceValue;
  });
  const worker = await prisma.worker.findUnique({
    where: {
      id: workerId,
      userId: Number(userId),
    },
    select: {
      wage: true,
    },
  });
  if (!worker) {
    throw new AppError("Worker not found", 404);
  }
  const totalSalary = totalDays * (worker?.wage || 0);
  return res.status(200).json({
    success: true,
    data: {
      totalDays: totalDays,
      totalSalary: totalSalary,
      records: totalAttendance,
    },
  });
});

export const getAttendanceByDate = asyncHandler(async function (
  req: AuthRequest,
  res: Response,
) {
  const dateParam = typeof req.query.date === "string" ? req.query.date : null;
  if (!dateParam) {
    throw new AppError("date is required", 400);
  }

  const startOfDay = new Date(dateParam);
  if (Number.isNaN(startOfDay.getTime())) {
    throw new AppError("Invalid date format", 400);
  }

  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setHours(23, 59, 59, 999);

  const records = await prisma.attendance.findMany({
    where: {
      attendanceDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
      worker: {
        userId: Number(req.userId),
      },
    },
    select: {
      workerId: true,
      attendanceValue: true,
    },
  });

  return res.status(200).json({
    success: true,
    records,
  });
});
