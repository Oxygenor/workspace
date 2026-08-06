# Official Playwright image: Chromium + all required OS deps preinstalled,
# version-matched to the `playwright` npm package below — avoids the
# fragility of `apt-get`/`playwright install --with-deps` in a slim base.
FROM mcr.microsoft.com/playwright:v1.62.1-jammy

# The base image ships Node 20, but @supabase/supabase-js's realtime client
# throws synchronously at startup on Node <22 (no native WebSocket) even
# though this worker never uses realtime features — swap in Node 22.
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY src ./src

ENV NODE_ENV=production

EXPOSE 8080

CMD ["node", "src/index.js"]
