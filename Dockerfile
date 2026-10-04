FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY server.js ./
COPY src ./src
COPY public ./public
RUN mkdir .data && chown -R node:node /app
USER node
ENV PORT=3000
ENV BIND_HOST=0.0.0.0
EXPOSE 3000
CMD ["node", "server.js"]
