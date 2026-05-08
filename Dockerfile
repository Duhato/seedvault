FROM node:20-alpine

RUN addgroup -S seedvault && adduser -S seedvault -G seedvault

WORKDIR /app

COPY package.json .
RUN npm install --production

COPY server.js .
COPY public/ ./public/

RUN chown -R seedvault:seedvault /app

USER seedvault

EXPOSE 3000

CMD ["node", "server.js"]
