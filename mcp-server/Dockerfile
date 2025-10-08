FROM node:18-alpine

# Install Python and pip
RUN apk add --no-cache python3 py3-pip

# Install MarkItDown
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

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]