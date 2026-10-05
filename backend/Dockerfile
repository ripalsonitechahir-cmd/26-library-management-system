# ---- deps: install production dependencies and generate the Prisma client ----
FROM node:22-alpine AS deps
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY prisma ./prisma
RUN npx prisma generate

# ---- runtime ----
FROM node:22-alpine
RUN apk add --no-cache openssl
ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_URL=file:/data/library.db
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY prisma ./prisma
COPY src ./src
COPY docker-entrypoint.sh ./
RUN mkdir -p /data && chown -R node:node /data /app && chmod +x docker-entrypoint.sh
USER node
VOLUME /data
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["./docker-entrypoint.sh"]
