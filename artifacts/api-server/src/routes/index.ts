import { Router, type IRouter } from "express";
import ggsAccountsRouter from "./ggs-accounts";
import ggsRouter from "./ggs";
import healthRouter from "./health";

const router: IRouter = Router();

router.use(healthRouter);
router.use(ggsAccountsRouter);
router.use(ggsRouter);

export default router;
