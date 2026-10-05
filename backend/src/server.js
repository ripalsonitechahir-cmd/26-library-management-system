const app = require('./app');
const prisma = require('./db');
const config = require('./config');
const logger = require('./logger');

const server = app.listen(config.port, () => logger.info('server started', { port: config.port }));

function shutdown(signal) {
  logger.info('shutting down', { signal });
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
