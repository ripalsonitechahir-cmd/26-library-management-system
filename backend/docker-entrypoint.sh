#!/bin/sh
set -e

# Apply migrations (idempotent), optionally seed demo data, then start the API.
npx prisma migrate deploy
if [ "$SEED_DEMO_DATA" = "true" ]; then
  node prisma/seed.js
fi
exec node src/server.js
