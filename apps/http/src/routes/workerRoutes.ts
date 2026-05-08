import { Router } from "express";
import {
  addWorker,
  deleteWorker,
  getAllWorkers,
} from "../controller/workerController";
import { authMiddleware } from "../middleware/auth";

const workerRouter: any = Router();
workerRouter.post("/add", authMiddleware, addWorker);
workerRouter.get("/workers", authMiddleware, getAllWorkers);
workerRouter.delete("/delete", authMiddleware, deleteWorker);

export default workerRouter;
