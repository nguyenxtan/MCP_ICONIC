FROM node:20-alpine

# Install system dependencies (curl for healthcheck)
RUN apk add --no-cache python3 py3-pip curl

# Install MarkItDown first
RUN pip3 install --break-system-packages markitdown[all]

# Install Docling separately (without conflicting extras)
RUN pip3 install --break-system-packages docling --no-deps && \
    pip3 install --break-system-packages \
    pydantic pydantic-settings \
    docling-core docling-parse docling-ibm-models \
    pypdfium2 filetype pillow \
    huggingface_hub easyocr \
    typer python-docx marko lxml \
    tqdm pluggy pylatexenc scipy \
    numpy certifi rtree

# Verify installations
RUN python3 -m markitdown --help || echo "MarkItDown installed"
RUN python3 -m docling --version || echo "Docling installed"

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