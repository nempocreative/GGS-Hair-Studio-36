import { Router, type IRouter } from "express";
import ggsRouter from "./ggs";
import healthRouter from "./health";

const router: IRouter = Router();

router.use(healthRouter);
router.use(ggsRouter);

export default router;
