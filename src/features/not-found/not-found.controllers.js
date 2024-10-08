const httpStatus = require('http-status');

module.exports.notFound = (req, res) => {
  res.status(httpStatus.NOT_FOUND).json({
    success: false,
    message: `${req.method} on route ${req.originalUrl} was not found.`,
  });
};
