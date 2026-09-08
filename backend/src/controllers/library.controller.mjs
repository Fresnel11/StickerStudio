export function createLibraryController(userModel, stickerModel) {
  return {
    async list(req, res) {
      const [name, stickers] = await Promise.all([
        userModel.packName(req.user.id),
        stickerModel.listStickers(req.user.id),
      ]);
      res.json({ name, stickers });
    },
    async rename(req, res) {
      await userModel.renamePack(req.user.id, req.validated.name);
      res.json({ name: req.validated.name });
    },
  };
}
