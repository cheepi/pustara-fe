FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --production=false || npm install

# Copy source code
COPY . .

# Build Next.js
RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]
