# ---- Build ----
FROM node:22-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json nest-cli.json ./
COPY src ./src
RUN npm run build

# ---- Runtime ----
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY prisma ./prisma
RUN npx prisma generate

COPY --from=build /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/main"]
