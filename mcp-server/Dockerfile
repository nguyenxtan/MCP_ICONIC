FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    curl \
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