import { randomUUID } from "node:crypto";
export function createStore(db) {
  const one = async (sql, args) => (await db.query(sql, args)).rows[0];
  return {
    findUser: (email) => one("SELECT * FROM users WHERE email = $1", [email]),
    createUser: (user, hash) =>
      db.query(
        "INSERT INTO users(id,name,email,password_hash,created_at) VALUES($1,$2,$3,$4,$5)",
        [user.id, user.name, user.email, hash, Date.now()],
      ),
    findSession: (hash) =>
      one(
        "SELECT users.id,users.name,users.email,users.google_subject FROM sessions JOIN users ON users.id=sessions.user_id WHERE token_hash=$1 AND expires_at>$2",
        [hash, Date.now()],
      ),
    deleteSession: (hash) =>
      db.query("DELETE FROM sessions WHERE token_hash=$1", [hash]),
    purgeSessions: () =>
      db.query("DELETE FROM sessions WHERE expires_at<=$1", [Date.now()]),
    createSession: (hash, userId, expiry) =>
      db.query(
        "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,$3)",
        [hash, userId, expiry],
      ),
    packName: async (id) =>
      (await one("SELECT pack_name FROM users WHERE id=$1", [id])).pack_name,
    renamePack: (id, name) =>
      db.query("UPDATE users SET pack_name=$1 WHERE id=$2", [name, id]),
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
