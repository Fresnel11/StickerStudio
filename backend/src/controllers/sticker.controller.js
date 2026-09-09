import { validateSticker } from "../validators/sticker.validator.js";
import { httpError } from "../utils/http-error.js";
export function createStickerController(stickerModel) {
  return {
    async create(req, res) {
      const item = await validateSticker(req.body?.data);
      const [sticker] = await stickerModel.insertStickers(req.user.id, [item]);
      res.status(201).json({ sticker });
    },
    async importLocal(req, res) {
      if (
        !Array.isArray(req.body?.stickers) ||
        !req.body.stickers.length ||
        req.body.stickers.length > 30
      )
        throw httpError(400, "Sélectionnez entre 1 et 30 stickers.");
      const items = [];
      for (const item of req.body.stickers)
        items.push(await validateSticker(item?.data));
      await stickerModel.insertStickers(req.user.id, items);
      res
        .status(201)
        .json({ stickers: await stickerModel.listStickers(req.user.id) });
    },
    async remove(req, res) {
      if (
        !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
          req.params.id,
        )
      )
        throw httpError(404, "Sticker introuvable.");
      if (!(await stickerModel.deleteSticker(req.user.id, req.params.id)))
        throw httpError(404, "Sticker introuvable.");
      res.status(204).end();
    },
  };
}
