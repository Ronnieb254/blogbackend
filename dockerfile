FROM node:24

WORKDIR /app

# Copy package files first
COPY package*.json ./

RUN npx prisma generate

EXPOSE 4000

# Install dependencies and start the app
CMD ["sh", "-c", "npm install && npm start"]