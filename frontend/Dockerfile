# ─────────────────────────────────────────────────────────────────────────────
#  Frontend Dockerfile – Next.js (Multi-Stage)
#  Stage 1: deps     → install production node_modules
#  Stage 2: builder  → build Next.js standalone bundle
#  Stage 3: runner   → lean runtime image
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: deps ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy manifests and install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# ── Stage 2: builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Reuse production node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy full source
COPY . .

# Build-time public API URL (injected from docker-compose build args)
ARG NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Tell Next.js to produce a standalone output (set output: 'standalone' in next.config)
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ── Stage 3: runner ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

LABEL maintainer="hr-payroll-team"
LABEL version="1.0.0"
LABEL description="HR Attendance & Payroll Engine – Frontend Service"

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001

# Create a non-root system user
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nextjs -u 1001 -G nodejs

# Copy Next.js standalone bundle and static assets
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static     ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public           ./public

# Switch to least-privilege user
USER nextjs

# Expose frontend port
EXPOSE 3001

# Health-check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3001/ || exit 1

CMD ["node", "server.js"]
