
FROM node:20-bullseye-slim

# Install system dependencies for Canvas and Build Tools
# Using debian bullseye specific versions if needed, but standard should work
# librsvg2-dev is the key for SVG support which failed compilation
RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    python3 \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies
# Re-enabling --build-from-source because prebuilt binaries are failing with ELF header mismatch
# Now that we have pkg-config and librsvg2-dev, compilation should succeed
RUN npm install --build-from-source=canvas

# Copy source code
COPY . .

# Build the TypeScript code using explicit node call to the bin script
RUN node node_modules/typescript/bin/tsc

# Start the bot
CMD ["npm", "start"]
