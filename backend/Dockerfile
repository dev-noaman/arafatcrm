FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-workspace.yaml ../
COPY packages/shared/package.json ../packages/shared/
COPY backend/package.json ./

# Install dependencies
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy source
COPY packages/shared ./packages/shared
COPY backend ./backend

# Build shared package
RUN pnpm --filter @arafat/shared build

# Expose port
EXPOSE 3000

# Start command
CMD ["pnpm", "--filter", "backend", "dev"]
