# NIGHTWATCH — Intern Tracking Agent
# Backend cron worker. Stays alive 24/7 and fires at 19:00 IST daily.

FROM node:20-alpine

# Timezone data is required for node-cron's `Asia/Kolkata` timezone.
# Without tzdata, alpine silently falls back to UTC and the cron fires 5h30m early.
RUN apk add --no-cache tzdata \
 && cp /usr/share/zoneinfo/Asia/Kolkata /etc/localtime \
 && echo "Asia/Kolkata" > /etc/timezone

ENV TZ=Asia/Kolkata
ENV NODE_ENV=production

# Create non-root user and app directory.
# UID/GID 1001 pinned for predictable Coolify volume permissions across redeploys.
RUN addgroup -g 1001 -S nightwatch \
 && adduser -S -u 1001 -G nightwatch nightwatch \
 && mkdir -p /app/logs /app/reports \
 && chown -R nightwatch:nightwatch /app

WORKDIR /app

# Install production dependencies. Use npm ci when lockfile exists for reproducibility.
COPY --chown=nightwatch:nightwatch package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then \
      npm ci --omit=dev; \
    else \
      npm install --omit=dev; \
    fi \
 && npm cache clean --force

# Copy only what the scheduler needs at runtime.
COPY --chown=nightwatch:nightwatch src ./src
COPY --chown=nightwatch:nightwatch config ./config

USER nightwatch

# Lightweight liveness probe — confirms the node process can still execute.
# Coolify / Docker will restart the container if this fails repeatedly.
HEALTHCHECK --interval=5m --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "process.exit(0)"

CMD ["node", "src/scheduler.js"]
