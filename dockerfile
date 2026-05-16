FROM node:24
WORKDIR /app

# Copy package files first (for layer caching)
COPY package*.json ./

# Install dependencies at BUILD time
RUN npm install

# Copy the rest of your source code (including schema.prisma)
COPY . .

# Generate Prisma client AFTER install and source is present
RUN npx prisma generate
# RUN npm run db:seed


EXPOSE 4000

# Run migrations then start the app
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]