# Official Playwright image: Chromium + all required OS deps preinstalled,
# version-matched to the `playwright` npm package below — avoids the
# fragility of `apt-get`/`playwright install --with-deps` in a slim base.
FROM mcr.microsoft.com/playwright:v1.48.0-jammy

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY src ./src

ENV NODE_ENV=production

EXPOSE 8080

CMD ["node", "src/index.js"]
