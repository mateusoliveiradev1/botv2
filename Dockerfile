
FROM node:20-bullseye-slim

# Install dependencies (Canvas needs build-essential and fonts)
RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    fonts-dejavu-core \
    fonts-liberation \
    fontconfig \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (try prebuilds first)
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Force cache bust for rebuild
RUN echo "Cache bust 2"

# Build TypeScript
RUN npm run build

# Start the bot
CMD ["npm", "start"]
