# MCP ICONIC Server

Powerful document processing and AI content analysis server with multiple features.

## 🚀 Features

### ✅ Works WITHOUT API Keys:
- **MarkItDown**: Convert files (PDF, DOCX, PPTX, etc.) to Markdown
- **Firecrawl**: Web scraping and crawling to Markdown
- **Document Conversion**: Markdown → PDF/DOCX/HTML with themes
- **Template Engine**: 5 built-in templates (reports, docs, invoices, etc.)
- **Batch Processing**: Upload and convert multiple files at once
- **QR Code Generator**: Generate QR codes (PNG, SVG, Data URL)
- **OCR**: Extract text from images using Tesseract (local)

### 🔑 Requires API Keys (Optional):
- **AI Summarization**: Summarize content with GPT-4o-mini
- **AI Translation**: Translate to 8 languages (Google/OpenAI)
- **AI Content Analysis**: Sentiment, keywords, entities, topics
- **Cloud Storage**: Upload to AWS S3 or Google Drive

## 📦 Installation

### Prerequisites
- Node.js 18+
- Python 3 (for MarkItDown)
- Docker (optional)

### Quick Start

```bash
# Clone repository
git clone https://github.com/nguyenxtan/MCP_ICONIC.git
cd MCP_ICONIC/mcp-server

# Install dependencies
npm install

# Install Python dependencies for MarkItDown
pip3 install markitdown

# Copy environment file
cp .env.example .env

# Start server
npm start
```

Server will run at `http://localhost:3000`

## 🔧 Configuration

### Without API Keys (Free Features Only)

Just run `npm start` - all core features will work!

### With API Keys (Full Features)

Edit `.env` file:

```bash
# OpenAI (for AI features)
OPENAI_API_KEY=sk-...

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
- Google Cloud: $300 free (12 months) → https://cloud.google.com/free
- AWS: Free tier → https://aws.amazon.com/free

## 📚 API Documentation

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

```bash
# Build and run with docker-compose
docker-compose up -d

# Or build manually
docker build -t mcp-server ./mcp-server
docker run -p 3000:3000 mcp-server
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
│   ├── firecrawl/   # Web scraping
│   ├── markitdown/  # MarkItDown integration
│   ├── storage/     # Cloud storage
│   ├── templates/   # Template engine
│   └── utils/       # QR code, etc.
├── routes/          # API routes
├── templates/       # Markdown templates
├── tests/           # Unit tests
└── server.js        # Main server file
```

## 🎯 Use Cases

1. **Documentation Generation**: Convert code/docs to multiple formats
2. **Content Processing**: Scrape, convert, and analyze web content
3. **Report Automation**: Generate weekly/monthly reports from templates
4. **Batch Document Conversion**: Convert hundreds of files at once
5. **AI Content Analysis**: Analyze sentiment, extract keywords from documents
6. **Multi-language Support**: Translate content to 8 languages

## 🛠️ Tech Stack

- **Backend**: Node.js, Express
- **AI**: OpenAI GPT-4o-mini, Google Translate API
- **OCR**: Tesseract.js
- **Conversion**: Puppeteer (PDF), docx (DOCX), marked (HTML)
- **Templates**: Handlebars
- **Web Scraping**: Axios, Cheerio, Turndown
- **Cloud**: AWS S3, Google Drive
- **Testing**: Jest, Supertest

## 💰 Cost Estimation

### Free Tier (No API Keys)
- **Cost**: $0/month
- **Features**: Document conversion, templates, batch processing, QR codes, OCR, web scraping

### Basic Usage (~100 requests/day)
- **OpenAI**: ~$3-5/month
- **Google Translate**: ~$1-2/month (optional)
- **Total**: ~$4-7/month

### Medium Usage (~1000 requests/day)
- **OpenAI**: ~$30-50/month
- **Google Translate**: ~$10-20/month (optional)
- **Total**: ~$40-70/month

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
- **OpenAI Docs**: https://platform.openai.com/docs
- **MarkItDown**: https://github.com/microsoft/markitdown

## ⚡ Quick Tips

1. **Start without API keys** - Most features work perfectly fine!
2. **Get free credits** - OpenAI gives $5, Google Cloud gives $300
3. **Use batch processing** - Much faster for multiple files
4. **Try templates** - 5 built-in templates ready to use
5. **Run tests** - Comprehensive test suite included

---

Built with ❤️ using Claude Code
