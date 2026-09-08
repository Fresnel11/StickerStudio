import { Router } from "express";
import { requireUser } from "../middlewares/auth.middleware.mjs";
import { validate } from "../middlewares/validate.middleware.mjs";
import { packInput } from "../validators/library.validator.mjs";
export function libraryRoutes(controller) {
  const router = Router();
  router.use(requireUser);
  router.get("/", controller.list);
  router.patch("/", validate(packInput), controller.rename);
  return router;
}
