import { Router } from "express";
import {
  getAttendanceByDate,
  getAttendance,
  markAttendance,
  updateAttendane,
} from "../controller/attendanceControler";
import { authMiddleware } from "../middleware/auth";

const attendanceRouter: any = Router();
attendanceRouter.post("/markattendance", authMiddleware, markAttendance);
attendanceRouter.patch("/editattendance", authMiddleware, updateAttendane);
attendanceRouter.get("/getattendance", authMiddleware, getAttendance);
attendanceRouter.get("/by-date", authMiddleware, getAttendanceByDate);

export default attendanceRouter;
