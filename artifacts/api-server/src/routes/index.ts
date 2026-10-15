import { Router, type IRouter } from "express";
import ggsAccountsRouter from "./ggs-accounts";
import ggsEmployeesRouter from "./ggs-employees";
import ggsRouter from "./ggs";
import ggsOwnerCenterRouter from "./ggs-owner-center";
import healthRouter from "./health";

const router: IRouter = Router();

router.use(healthRouter);
router.use(ggsAccountsRouter);
router.use(ggsEmployeesRouter);
router.use(ggsRouter);
router.use(ggsOwnerCenterRouter);

export default router;
