import { Router } from "express";
import { createHealthModel } from "../models/health.model.mjs";
import { createHealthController } from "../controllers/health.controller.mjs";
import { createUserModel } from "../models/user.model.mjs";
import { createSessionModel } from "../models/session.model.mjs";
import { createStickerModel } from "../models/sticker.model.mjs";
import { createOAuthModel } from "../models/oauth.model.mjs";
import { createAuthService } from "../services/auth.service.mjs";
import { createSessionService } from "../services/session.service.mjs";
import { loadSession } from "../middlewares/auth.middleware.mjs";
import { authLimiter } from "../middlewares/security.middleware.mjs";
import { createAuthController } from "../controllers/auth.controller.mjs";
import { createGoogleController } from "../controllers/google.controller.mjs";
import { createLibraryController } from "../controllers/library.controller.mjs";
import { createStickerController } from "../controllers/sticker.controller.mjs";
import { authRoutes } from "./auth.routes.mjs";
import { libraryRoutes } from "./library.routes.mjs";
import { stickerRoutes } from "./sticker.routes.mjs";
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
