import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import "dotenv/config";
import globalErrorHandler from "./utils/globalErrorHandler";
import attendanceRouter from "./routes/attendanceRoute";
import workerRouter from "./routes/workerRoutes";
import userRoutes from "./routes/userRoutes";
const app = express();
app.disable("x-powered-by");
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  }),
);
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

app.use("/api/v1/worker", workerRouter);
app.use("/api/v1/attendance", attendanceRouter);
app.use("/api/v1/auth", userRoutes);
app.use(globalErrorHandler);
app.listen(3001, () => console.log("port running "));
