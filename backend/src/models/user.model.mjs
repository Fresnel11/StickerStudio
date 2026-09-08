export function createUserModel(db) {
  const one = async (sql, args) => (await db.query(sql, args)).rows[0];
  return {
    findUser: (email) => one("SELECT * FROM users WHERE email = $1", [email]),
    createUser: (user, hash) =>
      db.query(
        "INSERT INTO users(id,name,email,password_hash,created_at) VALUES($1,$2,$3,$4,$5)",
        [user.id, user.name, user.email, hash, Date.now()],
      ),
    packName: async (id) =>
      (await one("SELECT pack_name FROM users WHERE id=$1", [id])).pack_name,
    renamePack: (id, name) =>
      db.query("UPDATE users SET pack_name=$1 WHERE id=$2", [name, id]),
  };
}
