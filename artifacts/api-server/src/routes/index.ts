import { Router } from "express";
import { createReadStream } from "fs";
import { join } from "path";
import healthRouter from "./health";
import authRouter from "./auth";
import categoriesRouter from "./categories";
import itemsRouter from "./items";
import equipmentRouter from "./equipment";
import transactionsRouter from "./transactions";
import recipientsRouter from "./recipients";
import exitReasonsRouter from "./exit-reasons";
import dashboardRouter from "./dashboard";
import alertsRouter from "./alerts";
import reportsRouter from "./reports";
import usersRouter from "./users";

const router = Router();

router.use("/health", healthRouter);
router.use("/auth", authRouter);
router.use("/categories", categoriesRouter);
router.use("/items", itemsRouter);
router.use("/equipment", equipmentRouter);
router.use("/transactions", transactionsRouter);
router.use("/recipients", recipientsRouter);
router.use("/exit-reasons", exitReasonsRouter);
router.use("/dashboard", dashboardRouter);
router.use("/alerts", alertsRouter);
router.use("/reports", reportsRouter);
router.use("/users", usersRouter);

export default router;
