import { publicUser } from "../services/auth.service.mjs";
export function createAuthController(authService, sessionService) {
  return {
    me(req, res) {
      res.json({ user: req.user ? publicUser(req.user) : null });
    },
    async register(req, res) {
      const user = await authService.register(req.validated);
      await sessionService.create(req, res, user.id);
      res.status(201).json({ user });
    },
    async login(req, res) {
      const user = await authService.login(req.validated);
      await sessionService.create(req, res, user.id);
      res.json({ user });
    },
    async logout(req, res) {
      await sessionService.destroy(req, res);
      res.status(204).end();
    },
  };
}
