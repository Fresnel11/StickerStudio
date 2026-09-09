export const createHealthController = (model) => async (req, res) => {
  await model.check();
  res.json({ status: "ok" });
};
