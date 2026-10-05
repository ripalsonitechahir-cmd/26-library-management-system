const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = async () => {
  const dbFile = path.join(__dirname, '..', 'prisma', 'test.db');
  for (const f of [dbFile, dbFile + '-journal']) if (fs.existsSync(f)) fs.rmSync(f);
  execSync('npx prisma migrate deploy', {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
    stdio: 'ignore',
  });
};
