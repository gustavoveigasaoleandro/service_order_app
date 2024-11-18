import { Router } from "express";
import { ServiceOrderController } from "../controllers/serviceOrderController";

const router = Router();

router.post(
  "/serviceorder/create",
  ServiceOrderController.addServiceOrder.bind(ServiceOrderController)
);

router.put(
  "/serviceorder/update",
  ServiceOrderController.updateServiceOrder.bind(ServiceOrderController)
);

router.get(
  "/serviceorder/list",
  ServiceOrderController.listServiceOrders.bind(ServiceOrderController)
);

export default router;
