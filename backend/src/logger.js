// Structured JSON logs to stdout.
function log(level, msg, extra = {}) {
  process.stdout.write(
    JSON.stringify({ time: new Date().toISOString(), level, msg, ...extra }) + '\n'
  );
}

function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    if (process.env.NODE_ENV === 'test') return;
    log('info', 'request', {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      ms: Date.now() - start,
    });
  });
  next();
}

module.exports = {
  info: (m, e) => log('info', m, e),
  error: (m, e) => log('error', m, e),
  requestLogger,
};
