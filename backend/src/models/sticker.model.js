import { randomUUID } from "node:crypto";
export function createStickerModel(db) {
  return {
    listStickers: async (id) =>
      (
        await db.query(
          "SELECT id,data FROM stickers WHERE user_id=$1 ORDER BY position",
          [id],
        )
      ).rows,
    deleteSticker: async (owner, id) =>
      (
        await db.query("DELETE FROM stickers WHERE id=$1 AND user_id=$2", [
          id,
          owner,
        ])
      ).rowCount,
    async insertStickers(userId, items) {
      const client = await db.connect();
      try {
        await client.query("BEGIN");
        // Serialize writes to each collection, including simultaneous imports on different devices.
        await client.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [
          userId,
        ]);
        let count = Number(
          (
            await client.query(
              "SELECT COUNT(*) AS count FROM stickers WHERE user_id=$1",
              [userId],
            )
          ).rows[0].count,
        );
        const result = [];
        for (const item of items) {
          const existing = (
            await client.query(
              "SELECT id,data FROM stickers WHERE user_id=$1 AND digest=$2",
              [userId, item.digest],
            )
          ).rows[0];
          if (existing) {
            result.push(existing);
            continue;
          }
          if (count >= 30)
            throw Object.assign(
              new Error(
                "Votre pack contient déjà 30 stickers. Exportez-le puis libérez des places.",
              ),
              { status: 409 },
            );
          const sticker = { id: randomUUID(), data: item.data };
          await client.query(
            "INSERT INTO stickers(id,user_id,data,digest,created_at) VALUES($1,$2,$3,$4,$5)",
            [sticker.id, userId, item.data, item.digest, Date.now()],
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
