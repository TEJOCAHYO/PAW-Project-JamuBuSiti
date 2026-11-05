const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'logs', 'access.log');

module.exports = (req, res, next) => {
  const t = Date.now();
  res.on('finish', () => {
    const line = `${new Date().toISOString()} ${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - t}ms\n`;
    process.stdout.write(line);
    fs.appendFile(file, line, () => {});
  });
  next();
};
