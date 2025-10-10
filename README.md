# MCP ICONIC Server

Powerful document processing and AI content analysis server with **MCP Protocol** support for n8n AI Agent integration.

## 🚀 Features

### ✅ Works WITHOUT API Keys:
- **Docling (IBM AI)**: Advanced document conversion with layout understanding, table extraction, formula recognition
- **MarkItDown**: Convert files (PDF, DOCX, PPTX, etc.) to Markdown
- **Firecrawl**: Web scraping and crawling to Markdown
- **Audio Transcription**: Convert audio (WAV, MP3) to text using Docling ASR
- **PDF Image Extraction**: Extract all images from PDF documents
- **Document Conversion**: Markdown → PDF/DOCX/HTML with themes
- **Template Engine**: 5 built-in templates (reports, docs, invoices, etc.)
- **Batch Processing**: Upload and convert multiple files at once
- **QR Code Generator**: Generate QR codes (PNG, SVG, Data URL)
- **OCR**: Extract text from images using Tesseract (local)

### 🔑 Requires API Keys (Optional):
- **AI Summarization**: Summarize content with GPT-4o-mini or OpenRouter
- **AI Translation**: Translate to 8 languages (Google/OpenAI)
- **AI Content Analysis**: Sentiment, keywords, entities, topics
- **Cloud Storage**: Upload to AWS S3 or Google Drive

### 🤖 MCP Protocol Support:
- **n8n AI Agent Integration**: Use MCP Client Tool in n8n workflows
- **6 Available Tools**: scrape_url, convert_to_markdown, docling_convert, transcribe_audio, extract_pdf_images, summarize_text
- **SSE Transport**: Server-Sent Events for real-time communication
- **OpenAI Function Calling**: Alternative format for AI agent integration

## 📦 Installation

### Prerequisites
- Node.js 18+
- Python 3 (for MarkItDown & Docling)
- Docker (optional)

### Quick Start

```bash
# Clone repository
git clone https://github.com/nguyenxtan/MCP_ICONIC.git
cd MCP_ICONIC/mcp-server

# Install dependencies
npm install

# Install Python dependencies
pip3 install markitdown docling

# Copy environment file
cp .env.example .env

# Start server (includes REST API + MCP Server)
npm start
```

Server will run at:
- **REST API**: `http://localhost:3000`
- **MCP Server (SSE)**: `http://localhost:3001`

## 🔧 Configuration

### Without API Keys (Free Features Only)

Just run `npm start` - all core features will work!

### With API Keys (Full Features)

Edit `.env` file:

```bash
# OpenAI (for AI features)
OPENAI_API_KEY=sk-...

# OpenRouter (alternative to OpenAI, cheaper)
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=meta-llama/llama-3.1-8b-instruct:free

# Google Translate (optional)
GOOGLE_TRANSLATE_API_KEY=...

# AWS S3 (optional)
AWS_S3_ENABLED=true
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=my-bucket

# Google Drive (optional)
GOOGLE_DRIVE_ENABLED=true
GOOGLE_DRIVE_CREDENTIALS='{"type":"service_account",...}'
```

**Get Free API Keys:**
- OpenAI: $5 free credit → https://platform.openai.com/signup
- OpenRouter: Free models available → https://openrouter.ai/
- Google Cloud: $300 free (12 months) → https://cloud.google.com/free
- AWS: Free tier → https://aws.amazon.com/free

## 📚 API Documentation

### Docling - IBM AI Document Processing

#### Convert Document to Markdown
```bash
# Basic conversion
curl -X POST http://localhost:3000/api/docling/convert \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/document.pdf"}'

# With Visual Language Model (better accuracy)
curl -X POST http://localhost:3000/api/docling/convert \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/complex.pdf",
    "useVLM": true,
    "vlmModel": "granite_docling"
  }'
```

#### Audio Transcription (ASR)
```bash
# Transcribe audio file to text
curl -X POST http://localhost:3000/api/docling/transcribe \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/audio.mp3"}'
```

#### Extract Images from PDF
```bash
# Extract all images from PDF
curl -X POST http://localhost:3000/api/docling/extract-images \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/document.pdf"}'
```

#### Check Docling Status
```bash
curl http://localhost:3000/api/docling/status
```

**Response:**
```json
{
  "available": true,
  "engine": "IBM Docling",
  "capabilities": {
    "formats": ["PDF", "DOCX", "PPTX", "XLSX", "HTML", "Images", "Audio"],
    "features": [
      "Advanced layout understanding",
      "Table extraction",
      "Formula recognition",
      "Code block detection",
      "Visual Language Model support",
      "OCR capabilities",
      "Audio transcription (ASR)",
      "Image extraction from PDFs"
    ]
  }
}
```

### Core Features (No API Key Required)

#### MarkItDown Conversion
```bash
# Convert PDF to Markdown
curl -X POST http://localhost:3000/api/markitdown/convert \
  -F "file=@document.pdf"
```

#### Firecrawl - Web Scraping
```bash
# Scrape single URL
curl -X POST http://localhost:3000/api/firecrawl/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'

# Crawl entire website
curl -X POST http://localhost:3000/api/firecrawl/crawl \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "maxPages": 10, "maxDepth": 2}'
```

#### Document Conversion
```bash
# Markdown to PDF
curl -X POST http://localhost:3000/api/conversion/md-to-pdf \
  -H "Content-Type: application/json" \
  -d '{"markdown": "# Hello World", "theme": "default"}'

# Markdown to DOCX
curl -X POST http://localhost:3000/api/conversion/md-to-docx \
  -H "Content-Type: application/json" \
  -d '{"markdown": "# Hello World"}'

# Markdown to HTML
curl -X POST http://localhost:3000/api/conversion/md-to-html \
  -H "Content-Type: application/json" \
  -d '{"markdown": "# Hello World", "theme": "dark"}'
```

#### Template Engine
```bash
# List templates
curl http://localhost:3000/api/templates

# Render weekly report
curl -X POST http://localhost:3000/api/templates/render \
  -H "Content-Type: application/json" \
  -d '{
    "templateName": "weekly-report",
    "data": {
      "author": "John Doe",
      "weekStart": "2024-01-01",
      "weekEnd": "2024-01-07",
      "summary": "Great week!",
      "accomplishments": ["Completed feature X", "Fixed bug Y"],
      "metrics": [{"name": "Sales", "value": 50000, "change": "+10%"}]
    }
  }'
```

#### QR Code Generator
```bash
# Generate QR code as PNG
curl -X POST http://localhost:3000/api/qrcode/generate \
  -H "Content-Type: application/json" \
  -d '{"data": "https://example.com", "format": "image"}'

# Generate as Data URL
curl -X POST http://localhost:3000/api/qrcode/generate \
  -H "Content-Type: application/json" \
  -d '{"data": "https://example.com", "format": "dataurl"}'
```

#### Batch Processing
```bash
# Batch convert markdown files to PDF
curl -X POST http://localhost:3000/api/batch/convert \
  -F "files=@file1.md" \
  -F "files=@file2.md" \
  -F "files=@file3.md" \
  -F "operation=md-to-pdf"

# Check batch job status
curl http://localhost:3000/api/batch/status/{jobId}

# Download results as ZIP
curl http://localhost:3000/api/batch/download/{jobId} -o results.zip
```

### AI Features (Requires API Keys)

#### AI Summarization
```bash
curl -X POST http://localhost:3000/api/ai/summarize \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Long article text here...",
    "maxLength": "short",
    "style": "bullet_points"
  }'
```

#### AI Translation
```bash
curl -X POST http://localhost:3000/api/ai/translate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello world",
    "targetLang": "vi",
    "provider": "openai"
  }'
```

#### AI Content Analysis
```bash
# Full analysis
curl -X POST http://localhost:3000/api/ai/analyze \
  -H "Content-Type: application/json" \
  -d '{"content": "Your text here..."}'

# Sentiment only
curl -X POST http://localhost:3000/api/ai/analyze/sentiment \
  -H "Content-Type: application/json" \
  -d '{"content": "I love this product!"}'

# Keywords only
curl -X POST http://localhost:3000/api/ai/analyze/keywords \
  -H "Content-Type: application/json" \
  -d '{"content": "Your text here...", "limit": 10}'
```

#### OCR (Works without API key - uses Tesseract)
```bash
# OCR on image
curl -X POST http://localhost:3000/api/ai/ocr/image \
  -F "file=@image.png" \
  -F "language=eng"

# OCR on PDF
curl -X POST http://localhost:3000/api/ai/ocr/pdf \
  -F "file=@scanned.pdf" \
  -F "language=eng"
```

## 🤖 MCP Protocol Integration

### Using with n8n AI Agent

1. **Add MCP Client Tool node** in your n8n workflow

2. **Configure connection:**
   - **URL**: `http://mcp-server:3001/message` (if in same Docker network)
   - **Transport**: `HTTP` (not SSE)
   - Or external: `http://your-server-ip:3002/message`

3. **Available MCP Tools:**

| Tool Name | Description | Parameters |
|-----------|-------------|------------|
| `scrape_url` | Scrape webpage to markdown | `url` (string) |
| `convert_to_markdown` | Convert files using MarkItDown | `url` (string), `format` (optional) |
| `docling_convert` | Advanced AI document conversion | `url` (string), `useVLM` (bool), `vlmModel` (string) |
| `transcribe_audio` | Audio to text transcription | `url` (string) |
| `extract_pdf_images` | Extract images from PDF | `url` (string) |
| `summarize_text` | AI text summarization | `content` (string), `maxLength` (number) |

4. **Example n8n AI Agent prompt:**
```
"Scrape the content from https://example.com and summarize it in 3 bullet points"
```

The AI Agent will automatically:
- Call `scrape_url` to get content
- Call `summarize_text` to generate summary

### MCP Server Endpoints

```bash
# SSE endpoint (for SSE transport)
http://localhost:3001/sse

# Message endpoint (for HTTP transport) - RECOMMENDED
http://localhost:3001/message

# Health check
http://localhost:3001/health
```

### Testing MCP Connection

```bash
# From n8n container
docker exec -it n8n_app wget -qO- http://mcp-server:3001/health

# Should return:
# {"status":"healthy","protocol":"MCP","version":"2.0.0","transport":"SSE (Manual)","activeConnections":0,"tools":6}
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

Test coverage: **75+ tests** covering all major features.

## 🐳 Docker Deployment

### With n8n (Recommended)

```bash
# Clone repository
git clone https://github.com/nguyenxtan/MCP_ICONIC.git
cd MCP_ICONIC

# Build and run
docker-compose up -d

# Check logs
docker logs -f mcp-server
```

### Standalone

```bash
# Build image
docker build -t mcp-server ./mcp-server

# Run container
docker run -p 3000:3000 -p 3001:3001 -p 3002:3001 mcp-server
```

### Docker Compose Configuration

```yaml
services:
  mcp-server:
    build: ./mcp-server
    container_name: mcp-server
    restart: always
    ports:
      - "3001:3000"  # REST API
      - "3002:3001"  # MCP Protocol
    networks:
      - n8n_iconic_net  # Same network as n8n
    environment:
      - NODE_ENV=production
      - API_BASE_URL=http://localhost:3000
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}

networks:
  n8n_iconic_net:
    external: true
    name: n8n_iconic_net
```

## 📊 Project Structure

```
mcp-server/
├── config/           # Configuration files
├── middleware/       # Express middleware
├── modules/
│   ├── ai/          # AI services (OCR, summarization, translation, analysis)
│   ├── batch/       # Batch processing
│   ├── common/      # Common utilities
│   ├── conversion/  # Document conversion
│   ├── docling/     # IBM Docling integration ⭐ NEW
│   ├── firecrawl/   # Web scraping
│   ├── markitdown/  # MarkItDown integration
│   ├── storage/     # Cloud storage
│   ├── templates/   # Template engine
│   └── utils/       # QR code, etc.
├── routes/          # API routes
├── templates/       # Markdown templates
├── tests/           # Unit tests
├── server.js        # Main REST API server
├── mcp-sse-manual.js # MCP Protocol server ⭐ NEW
└── openai-tools.js  # OpenAI Function format (alternative)
```

## 🎯 Use Cases

1. **n8n AI Agent Workflows**: Automated document processing with AI
2. **Documentation Generation**: Convert code/docs to multiple formats
3. **Content Processing**: Scrape, convert, and analyze web content
4. **Audio Transcription**: Convert podcasts/meetings to text
5. **PDF Image Extraction**: Extract diagrams and images from reports
6. **Report Automation**: Generate weekly/monthly reports from templates
7. **Batch Document Conversion**: Convert hundreds of files at once
8. **AI Content Analysis**: Analyze sentiment, extract keywords from documents
9. **Multi-language Support**: Translate content to 8 languages

## 🛠️ Tech Stack

- **Backend**: Node.js, Express
- **AI**: IBM Docling, OpenAI GPT-4o-mini, OpenRouter, Google Translate API
- **OCR**: Tesseract.js, Docling ASR
- **MCP Protocol**: JSON-RPC 2.0, Server-Sent Events
- **Conversion**: Puppeteer (PDF), docx (DOCX), marked (HTML)
- **Templates**: Handlebars
- **Web Scraping**: Axios, Cheerio, Turndown
- **Cloud**: AWS S3, Google Drive
- **Testing**: Jest, Supertest

## 💰 Cost Estimation

### Free Tier (No API Keys)
- **Cost**: $0/month
- **Features**: Docling AI, MarkItDown, audio transcription, image extraction, templates, batch processing, QR codes, OCR, web scraping, MCP protocol

### Basic Usage (~100 requests/day)
- **OpenRouter** (Free models): $0/month
- **OpenAI** (if used): ~$3-5/month
- **Google Translate** (optional): ~$1-2/month
- **Total**: $0-7/month

### Medium Usage (~1000 requests/day)
- **OpenRouter**: ~$5-10/month (using paid models)
- **OpenAI** (if used): ~$30-50/month
- **Google Translate** (optional): ~$10-20/month
- **Total**: ~$15-80/month

## 📝 License

MIT

## 🤝 Contributing

Pull requests welcome! Please run tests before submitting:

```bash
npm test
npm run test:coverage
```

## 🔗 Links

- **GitHub**: https://github.com/nguyenxtan/MCP_ICONIC
- **Issues**: https://github.com/nguyenxtan/MCP_ICONIC/issues
- **MCP Protocol**: https://modelcontextprotocol.io/
- **IBM Docling**: https://www.docling.ai/
- **OpenRouter**: https://openrouter.ai/
- **n8n**: https://n8n.io/
- **MarkItDown**: https://github.com/microsoft/markitdown

## ⚡ Quick Tips

1. **Start without API keys** - Docling, MarkItDown, and most features work perfectly!
2. **Use OpenRouter for free models** - Get free AI capabilities
3. **MCP Protocol for n8n** - Powerful AI agent integration
4. **Docling vs MarkItDown** - Use Docling for complex PDFs with tables/formulas
5. **Audio transcription** - Works without API keys using Docling ASR
6. **Use batch processing** - Much faster for multiple files
7. **Try templates** - 5 built-in templates ready to use
8. **Run tests** - Comprehensive test suite included

---

Built with ❤️ using Claude Code
