FROM node:20-alpine

RUN addgroup -S seedvault && adduser -S seedvault -G seedvault

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json .
RUN npm install --production

COPY server.js .
COPY public/ ./public/

RUN mkdir -p /app/certs &&     openssl req -x509 -nodes -days 3650 -newkey rsa:2048     -keyout /app/certs/key.pem     -out /app/certs/cert.pem     -subj "/C=US/ST=WV/L=Clarksburg/O=SeedVault/CN=seedvault.local" &&     chown -R seedvault:seedvault /app

USER seedvault

EXPOSE 3000

CMD ["node", "server.js"]
