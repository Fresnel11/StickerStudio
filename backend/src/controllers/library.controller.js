export function createLibraryController(userModel, stickerModel, packModel) {
  return {
    async list(req, res) {
      const packs = await packModel.list(req.user.id);
      const active = packs.find((pack) => pack.id === req.query.packId) || packs[0];
      const stickers = active ? await stickerModel.listStickers(req.user.id, active.id) : [];
      res.json({ packs, activePackId: active?.id || null, name: active?.name || "Mon pack 1", stickers });
    },
    async rename(req, res) {
      await packModel.rename(req.user.id, req.body.packId, req.validated.name);
      res.json({ name: req.validated.name });
    },
    async packs(req, res) {
      res.json({ packs: await packModel.list(req.user.id) });
    },
    async createPack(req, res) {
      res.status(201).json({ pack: await packModel.create(req.user.id, req.validated.name) });
    },
  };
}
