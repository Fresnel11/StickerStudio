import { randomUUID } from "node:crypto";
export function createStickerModel(db) {
  return {
    listStickers: async (userId, packId) =>
      (
        await db.query(
          "SELECT id,data FROM stickers WHERE user_id=$1 AND pack_id=$2 ORDER BY position",
          [userId, packId],
        )
      ).rows,
    deleteSticker: async (owner, id) =>
      (
        await db.query("DELETE FROM stickers WHERE id=$1 AND user_id=$2", [
          id,
          owner,
        ])
      ).rowCount,
    async insertStickers(userId, packId, items) {
      const client = await db.connect();
      try {
        await client.query("BEGIN");
        // Serialize writes to each collection, including simultaneous imports on different devices.
        await client.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [
          userId,
        ]);
        if (!packId) {
          packId = (
            await client.query(
              "SELECT id FROM packs WHERE user_id=$1 ORDER BY position LIMIT 1",
              [userId],
            )
          ).rows[0]?.id;
        }
        if (!packId)
          throw Object.assign(new Error("Pack introuvable."), { status: 404 });
        let count = Number(
          (
            await client.query(
              "SELECT COUNT(*) AS count FROM stickers WHERE user_id=$1 AND pack_id=$2",
              [userId, packId],
            )
          ).rows[0].count,
        );
        const result = [];
        for (const item of items) {
          const existing = (
            await client.query(
              "SELECT id,data FROM stickers WHERE user_id=$1 AND pack_id=$2 AND digest=$3",
              [userId, packId, item.digest],
            )
          ).rows[0];
          if (existing) {
            result.push(existing);
            continue;
          }
          if (count >= 6)
            throw Object.assign(
              new Error(
                "Votre pack contient déjà 6 stickers. Exportez-le puis libérez des places.",
              ),
              { status: 409 },
            );
          const sticker = { id: randomUUID(), data: item.data };
          await client.query(
            "INSERT INTO stickers(id,user_id,pack_id,data,digest,created_at) VALUES($1,$2,$3,$4,$5,$6)",
            [sticker.id, userId, packId, item.data, item.digest, Date.now()],
          );
          result.push(sticker);
          count++;
        }
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
  };
}
