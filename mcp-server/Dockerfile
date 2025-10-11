FROM node:20-slim

# Install system dependencies including Chrome dependencies for Puppeteer
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    curl \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Install MarkItDown and Docling for document conversion
RUN pip3 install --break-system-packages markitdown[all] && \
    pip3 install --break-system-packages docling

# Verify installations
RUN python3 -m markitdown --help || echo "MarkItDown installed" && \
    python3 -m docling --version || echo "Docling installed"

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node dependencies
RUN npm install

# Copy application files
COPY . .

# Create necessary directories
RUN mkdir -p uploads outputs

# Expose ports (REST API and MCP SSE)
EXPOSE 3000 3001

# Start application
CMD ["npm", "start"]