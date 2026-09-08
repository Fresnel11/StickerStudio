import { Router } from "express";
import { validate } from "../middlewares/validate.middleware.mjs";
import { loginInput, registerInput } from "../validators/auth.validator.mjs";
export function authRoutes(controller, google, limiter) {
  const router = Router();
  router.get("/me", controller.me);
  router.post(
    "/register",
    limiter,
    validate(registerInput),
    controller.register,
  );
  router.post("/login", limiter, validate(loginInput), controller.login);
  router.post("/logout", controller.logout);
  router.get("/providers", google.providers);
  router.get("/google", limiter, google.start);
  router.get("/google/callback", limiter, google.callback);
  return router;
}
