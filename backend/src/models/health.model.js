export const createHealthModel = (db) => ({
  check: () => db.query("SELECT 1"),
});
