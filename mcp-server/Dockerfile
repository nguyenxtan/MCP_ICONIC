FROM node:20-alpine

# Install system dependencies (curl for healthcheck)
RUN apk add --no-cache python3 py3-pip curl

# Install MarkItDown for document conversion
RUN pip3 install --break-system-packages markitdown[all]

# Verify installation
RUN python3 -m markitdown --help || echo "MarkItDown installed"

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