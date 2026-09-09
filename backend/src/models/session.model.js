export function createSessionModel(db) {
  const one = async (sql, args) => (await db.query(sql, args)).rows[0];
  return {
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
  };
}
