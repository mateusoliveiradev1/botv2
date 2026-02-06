
FROM node:20-bullseye-slim

# Install system dependencies for Canvas and Build Tools
RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
# Using npm install instead of ci to ensure devDependencies are installed and binaries are linked
RUN npm install

# Copy source code
COPY . .

# Build the TypeScript code using local node_modules binary
# We explicitly call the binary to avoid path issues
RUN ./node_modules/.bin/tsc

# Start the bot
CMD ["npm", "start"]
