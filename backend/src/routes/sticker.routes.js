import { Router } from "express";
import { requireUser } from "../middlewares/auth.middleware.js";
export function stickerRoutes(controller) {
  const router = Router();
  router.use(requireUser);
  router.post("/", controller.create);
  router.post("/import", controller.importLocal);
  router.delete("/:id", controller.remove);
  return router;
}
