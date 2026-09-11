import { Router } from "express";
import { validate } from "../middlewares/validate.middleware.js";
import { loginInput, registerInput } from "../validators/auth.validator.js";
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
  router.post("/google/mobile", limiter, google.mobileStart);
  router.post("/google/mobile/finish", google.mobileFinish);
  router.get("/google", limiter, google.start);
  router.get("/google/callback", limiter, google.callback);
  return router;
}
