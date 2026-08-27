FROM node:22.14.0-alpine3.21 AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22.14.0-alpine3.21 AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next

EXPOSE 8080
CMD ["npm", "run", "start"]
