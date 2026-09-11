export function createMobileGoogleModel(db) {
  return {
    async create(id, secretHash, linkUserId) {
      await db.query("DELETE FROM mobile_google_requests WHERE expires_at <= $1", [Date.now()]);
      await db.query("INSERT INTO mobile_google_requests(id,secret_hash,link_user_id,expires_at) VALUES($1,$2,$3,$4)", [id, secretHash, linkUserId, Date.now() + 10 * 60 * 1000]);
    },
    async start(id) {
      return (await db.query("UPDATE mobile_google_requests SET started=TRUE WHERE id=$1 AND started=FALSE AND expires_at>$2 RETURNING *", [id, Date.now()])).rows[0];
    },
    async complete(id, userId, result) {
      await db.query("UPDATE mobile_google_requests SET user_id=$2,result=$3 WHERE id=$1 AND result IS NULL AND expires_at>$4", [id, userId, result, Date.now()]);
    },
    async finish(id, secretHash, currentUserId) {
      const args = [id, secretHash, Date.now(), currentUserId];
      const condition = "id=$1 AND secret_hash=$2 AND expires_at>$3 AND (link_user_id IS NULL OR link_user_id=$4)";
      // Only one polling request may exchange a completed login for a session.
      const completed = (await db.query(`DELETE FROM mobile_google_requests WHERE ${condition} AND result IS NOT NULL RETURNING *`, args)).rows[0];
      if (completed) return completed;
      return (await db.query(`SELECT result FROM mobile_google_requests WHERE ${condition}`, args)).rows[0];
    },
  };
}
