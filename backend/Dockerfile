# ─────────────────────────────────────────────────────────────────────────────
#  Backend Dockerfile – NestJS (Multi-Stage)
#  Stage 1: builder  → compile TypeScript + generate Prisma client
#  Stage 2: production → lean runtime image
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (leverages Docker layer cache)
COPY package*.json ./
RUN npm ci

# Copy application source and Prisma schema
COPY src ./src
COPY prisma ./prisma
COPY tsconfig*.json ./

# Generate Prisma client and compile TypeScript
RUN npx prisma generate
RUN npm run build

# ── Stage 2: production ───────────────────────────────────────────────────────
FROM node:20-alpine AS production

LABEL maintainer="hr-payroll-team"
LABEL version="1.0.0"
LABEL description="HR Attendance & Payroll Engine – Backend Service"

ENV NODE_ENV=production

WORKDIR /app

# Create a non-root user/group for security hardening
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nestjs -u 1001 -G nodejs

# Copy compiled output, dependencies, and Prisma artefacts from builder
COPY --from=builder --chown=nestjs:nodejs /app/dist       ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/prisma     ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json

# Switch to least-privilege user
USER nestjs

# Expose API port
EXPOSE 3000

# Health-check endpoint (requires the backend to expose /health)
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/main.js"]
