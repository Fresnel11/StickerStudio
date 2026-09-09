import { Router } from "express";
import { requireUser } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { packInput } from "../validators/library.validator.js";
export function libraryRoutes(controller) {
  const router = Router();
  router.use(requireUser);
  router.get("/", controller.list);
  router.patch("/", validate(packInput), controller.rename);
  return router;
}
