import { Router } from "express";
import { createHealthModel } from "../models/health.model.js";
import { createHealthController } from "../controllers/health.controller.js";
import { createUserModel } from "../models/user.model.js";
import { createSessionModel } from "../models/session.model.js";
import { createStickerModel } from "../models/sticker.model.js";
import { createOAuthModel } from "../models/oauth.model.js";
import { createAuthService } from "../services/auth.service.js";
import { createSessionService } from "../services/session.service.js";
import { loadSession } from "../middlewares/auth.middleware.js";
import { authLimiter } from "../middlewares/security.middleware.js";
import { createAuthController } from "../controllers/auth.controller.js";
import { createGoogleController } from "../controllers/google.controller.js";
import { createLibraryController } from "../controllers/library.controller.js";
import { createStickerController } from "../controllers/sticker.controller.js";
import { authRoutes } from "./auth.routes.js";
import { libraryRoutes } from "./library.routes.js";
import { stickerRoutes } from "./sticker.routes.js";
export async function apiRoutes({ db, secure, authLimit, google }) {
  const users = createUserModel(db),
    sessions = createSessionModel(db),
    stickers = createStickerModel(db);
  const session = createSessionService(sessions, secure);
  const router = Router();
  router.use(loadSession(sessions));
  router.get("/health", createHealthController(createHealthModel(db)));
  router.use(
    "/auth",
    authRoutes(
      createAuthController(await createAuthService(users), session),
      createGoogleController({
        oauthModel: createOAuthModel(db),
        session,
        secure,
        ...google,
      }),
      authLimiter(authLimit),
    ),
  );
  router.use(
    "/library",
    libraryRoutes(createLibraryController(users, stickers)),
  );
  router.use("/stickers", stickerRoutes(createStickerController(stickers)));
  return router;
}
