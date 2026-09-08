export const validate = (validator) => (req, res, next) => {
  req.validated = validator(req.body);
  next();
};
