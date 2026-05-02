FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
RUN mkdir -p src/uploads
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node prisma/seed.js && node src/index.js"]
