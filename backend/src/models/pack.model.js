import { randomUUID } from "node:crypto";
export function createPackModel(db) {
  return {
    list: async (userId) =>
      (await db.query("SELECT id,name FROM packs WHERE user_id=$1 ORDER BY position", [userId])).rows,
    find: async (userId, id) =>
      (await db.query("SELECT id,name FROM packs WHERE id=$1 AND user_id=$2", [id, userId])).rows[0],
    async create(userId, name) {
      const client = await db.connect();
      try {
        await client.query("BEGIN");
        await client.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [userId]);
        const count = Number(
          (await client.query("SELECT COUNT(*) AS count FROM packs WHERE user_id=$1", [userId])).rows[0].count,
        );
        if (count >= 5)
          throw Object.assign(new Error("Un utilisateur ne peut pas avoir plus de 5 packs."), { status: 409 });
        const result = await client.query(
          "INSERT INTO packs(id,user_id,name,created_at) VALUES($1,$2,$3,$4) RETURNING id,name",
          [randomUUID(), userId, name, Date.now()],
        );
        await client.query("COMMIT");
        return result.rows[0];
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
    async rename(userId, id, name) {
      const packId =
        id ||
        (
          await db.query(
            "SELECT id FROM packs WHERE user_id=$1 ORDER BY position LIMIT 1",
            [userId],
          )
        ).rows[0]?.id;
      return db.query("UPDATE packs SET name=$1 WHERE id=$2 AND user_id=$3", [
        name,
        packId,
        userId,
      ]);
    },
  };
}