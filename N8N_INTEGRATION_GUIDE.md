# n8n Integration Guide - MCP Server

Hướng dẫn chi tiết cách sử dụng MCP Server với n8n HTTP Request node.

## 📋 Mục lục

- [Setup MCP Server](#setup-mcp-server)
- [n8n Workflows KHÔNG cần AI](#workflows-không-cần-ai)
- [n8n Workflows có AI](#workflows-có-ai)
- [Examples đầy đủ](#examples)

---

## 🚀 Setup MCP Server

### 1. Start MCP Server

```bash
cd mcp-server

# Tạo .env file
cp .env.example .env

# Thêm API keys (nếu dùng AI)
nano .env
```

**File .env:**
```bash
# Required cho AI features
OPENAI_API_KEY=sk-proj-xxxxx

# Optional
GOOGLE_TRANSLATE_API_KEY=xxxxx
AWS_ACCESS_KEY_ID=xxxxx
AWS_SECRET_ACCESS_KEY=xxxxx
```

```bash
# Start server
npm start
```

Server chạy tại: `http://localhost:3000`

### 2. Kiểm tra Server

```bash
curl http://localhost:3000
```

Response:
```json
{
  "name": "MCP Server",
  "version": "2.0.0",
  "status": "running",
  "endpoints": {
    "health": "/health",
    "markitdown": "/api/markitdown",
    "firecrawl": "/api/firecrawl",
    "ai": "/api/ai",
    "conversion": "/api/conversion",
    "templates": "/api/templates",
    "batch": "/api/batch",
    "qrcode": "/api/qrcode"
  }
}
```

---

## 🆓 n8n Workflows KHÔNG cần AI

### 1. MarkItDown - Convert File to Markdown

**Use Case:** Upload PDF/DOCX và nhận Markdown

**n8n HTTP Request Node:**

```json
{
  "method": "POST",
  "url": "http://localhost:3000/api/markitdown/convert",
  "sendBody": true,
  "contentType": "multipart-form-data",
  "bodyParameters": {
    "parameters": [
      {
        "name": "file",
        "value": "={{ $binary.data }}"
      }
    ]
  },
  "options": {}
}
```

**n8n Workflow Example:**

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Webhook     │────▶│ HTTP Request │────▶│  Set Node    │
│  (Get File)  │     │  (MarkItDown)│     │ (Format MD)  │
└──────────────┘     └──────────────┘     └──────────────┘
```

**Response:**
```json
{
  "success": true,
  "jobId": "abc-123",
  "markdown": "# Document Title\n\nContent here...",
  "outputPath": "/app/outputs/abc-123.md"
}
```

---

### 2. Firecrawl - Scrape Website to Markdown

**Use Case:** Scrape competitor website, lưu thành Markdown

**n8n HTTP Request Node:**

```json
{
  "method": "POST",
  "url": "http://localhost:3000/api/firecrawl/scrape",
  "sendBody": true,
  "contentType": "json",
  "body": {
    "url": "https://example.com/blog/article",
    "selector": "article",
    "removeSelectors": ["nav", "footer", "aside"]
  }
}
```

**n8n Workflow Example:**

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Schedule    │────▶│ HTTP Request │────▶│  Google Docs │
│  (Daily 9AM) │     │  (Scrape)    │     │  (Save MD)   │
└──────────────┘     └──────────────┘     └──────────────┘
```

**Response:**
```json
{
  "success": true,
  "jobId": "xyz-456",
  "title": "Article Title",
  "markdown": "# Article Title\n\n**Source:** https://example.com...",
  "wordCount": 1250
}
```

---

### 3. Firecrawl - Crawl Entire Website

**Use Case:** Crawl toàn bộ documentation website

**n8n HTTP Request Node:**

```json
{
  "method": "POST",
  "url": "http://localhost:3000/api/firecrawl/crawl",
  "sendBody": true,
  "contentType": "json",
  "body": {
    "url": "https://docs.example.com",
    "maxPages": 20,
    "maxDepth": 3,
    "sameDomain": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "jobId": "crawl-789",
  "pagesProcessed": 18,
  "pagesSuccessful": 17,
  "pagesFailed": 1,
  "results": [
    {
      "url": "https://docs.example.com/intro",
      "title": "Introduction",
      "wordCount": 500,
      "outputFile": "crawl-789_1.md"
    }
  ]
}
```

---

### 4. Markdown → PDF Conversion

**Use Case:** Tạo PDF invoice từ Markdown

**n8n HTTP Request Node:**

```json
{
  "method": "POST",
  "url": "http://localhost:3000/api/conversion/md-to-pdf",
  "sendBody": true,
  "contentType": "json",
  "body": {
    "markdown": "# Invoice #001\n\n**Date:** 2024-01-15\n\n...",
    "theme": "default",
    "format": "A4",
    "margin": {
      "top": "20mm",
      "right": "20mm",
      "bottom": "20mm",
      "left": "20mm"
    }
  }
}
```

**n8n Workflow Example:**

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Database    │────▶│  Template    │────▶│ HTTP Request │────▶│  Send Email  │
│  (Get Order) │     │  (Build MD)  │     │  (MD→PDF)    │     │  (Attach PDF)│
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

**Response:**
```json
{
  "success": true,
  "filename": "abc-123.pdf",
  "outputPath": "/app/outputs/abc-123.pdf",
  "message": "PDF generated successfully"
}
```

---

### 5. Template Engine - Generate Report

**Use Case:** Tạo weekly report tự động

**Step 1: Render Template**

```json
{
  "method": "POST",
  "url": "http://localhost:3000/api/templates/render",
  "sendBody": true,
  "contentType": "json",
  "body": {
    "templateName": "weekly-report",
    "data": {
      "weekStart": "2024-01-01",
      "weekEnd": "2024-01-07",
      "author": "{{ $json.author }}",
      "summary": "{{ $json.summary }}",
      "accomplishments": "={{ $json.accomplishments }}",
      "metrics": "={{ $json.metrics }}"
    }
  }
}
```

**Step 2: Convert to PDF**

```json
{
  "method": "POST",
  "url": "http://localhost:3000/api/conversion/md-to-pdf",
  "sendBody": true,
  "contentType": "json",
  "body": {
    "markdown": "={{ $json.rendered }}"
  }
}
```

**n8n Workflow Example:**

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Schedule    │────▶│  Get Metrics │────▶│ Render Templ │────▶│  MD to PDF   │
│  (Weekly)    │     │  (Database)  │     │  (HTTP Req)  │     │  (HTTP Req)  │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                                        │
                                                                        ▼
                                                                ┌──────────────┐
                                                                │  Send Email  │
                                                                │  (with PDF)  │
                                                                └──────────────┘
```

---

### 6. QR Code Generator

**Use Case:** Generate QR codes cho sản phẩm

**n8n HTTP Request Node:**

```json
{
  "method": "POST",
  "url": "http://localhost:3000/api/qrcode/generate",
  "sendBody": true,
  "contentType": "json",
  "body": {
    "data": "https://shop.example.com/product/{{ $json.productId }}",
    "format": "dataurl",
    "width": 300,
    "errorCorrectionLevel": "H"
  }
}
```

**n8n Workflow Example:**

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Database    │────▶│ HTTP Request │────▶│  Update DB   │
│  (Products)  │     │  (Gen QR)    │     │  (Save QR)   │
└──────────────┘     └──────────────┘     └──────────────┘
```

**Response:**
```json
{
  "success": true,
  "format": "dataurl",
  "dataURL": "data:image/png;base64,iVBORw0KGgoAAAANS..."
}
```

---

### 7. Batch Processing

**Use Case:** Convert 100 markdown files sang PDF cùng lúc

**n8n HTTP Request Node:**

```json
{
  "method": "POST",
  "url": "http://localhost:3000/api/batch/convert",
  "sendBody": true,
  "contentType": "multipart-form-data",
  "bodyParameters": {
    "parameters": [
      {
        "name": "files",
        "value": "={{ $binary.file1 }}"
      },
      {
        "name": "files",
        "value": "={{ $binary.file2 }}"
      },
      {
        "name": "operation",
        "value": "md-to-pdf"
      },
      {
        "name": "theme",
        "value": "default"
      }
    ]
  }
}
```

**Step 2: Check Status (Loop until done)**

```json
{
  "method": "GET",
  "url": "http://localhost:3000/api/batch/status/{{ $json.jobId }}"
}
```

**Step 3: Download ZIP**

```json
{
  "method": "GET",
  "url": "http://localhost:3000/api/batch/download/{{ $json.jobId }}",
  "options": {
    "response": {
      "response": {
        "responseFormat": "file"
      }
    }
  }
}
```

---

## 🤖 n8n Workflows CÓ AI

### 1. AI Summarization

**Use Case:** Tóm tắt article thành 5 bullet points

**n8n HTTP Request Node:**

```json
{
  "method": "POST",
  "url": "http://localhost:3000/api/ai/summarize",
  "sendBody": true,
  "contentType": "json",
  "body": {
    "content": "{{ $json.article }}",
    "maxLength": "short",
    "style": "bullet_points",
    "language": "en"
  }
}
```

**n8n Workflow Example:**

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  RSS Feed    │────▶│ HTTP Request │────▶│ HTTP Request │────▶│  Notion DB   │
│  (News)      │     │  (Scrape)    │     │  (Summarize) │     │  (Save)      │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

**Response:**
```json
{
  "success": true,
  "summary": "- Key point 1\n- Key point 2\n- Key point 3\n- Key point 4\n- Key point 5",
  "originalLength": 5000,
  "summaryLength": 250,
  "tokensUsed": 1200,
  "model": "gpt-4o-mini"
}
```

---

### 2. AI Translation

**Use Case:** Dịch blog post sang tiếng Việt

**n8n HTTP Request Node:**

```json
{
  "method": "POST",
  "url": "http://localhost:3000/api/ai/translate",
  "sendBody": true,
  "contentType": "json",
  "body": {
    "text": "{{ $json.content }}",
    "targetLang": "vi",
    "sourceLang": "auto",
    "preserveFormatting": true,
    "provider": "openai"
  }
}
```

**n8n Workflow Example:**

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Webhook     │────▶│ HTTP Request │────▶│  WordPress   │
│  (New Post)  │     │  (Translate) │     │  (Publish VI)│
└──────────────┘     └──────────────┘     └──────────────┘
```

**Response:**
```json
{
  "success": true,
  "translatedText": "Nội dung đã dịch sang tiếng Việt...",
  "detectedSourceLang": "en",
  "provider": "openai",
  "tokensUsed": 800
}
```

---

### 3. AI Content Analysis

**Use Case:** Phân tích sentiment của customer reviews

**n8n HTTP Request Node:**

```json
{
  "method": "POST",
  "url": "http://localhost:3000/api/ai/analyze",
  "sendBody": true,
  "contentType": "json",
  "body": {
    "content": "{{ $json.review }}",
    "features": {
      "sentiment": true,
      "keywords": true,
      "entities": false,
      "topics": false
    }
  }
}
```

**n8n Workflow Example:**

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Database    │────▶│ HTTP Request │────▶│  Filter      │────▶│  Send Alert  │
│  (Reviews)   │     │  (Analyze)   │     │  (Negative)  │     │  (Slack)     │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

**Response:**
```json
{
  "success": true,
  "sentiment": {
    "label": "positive",
    "confidence": 0.92,
    "explanation": "Customer is very satisfied with the product"
  },
  "keywords": [
    {
      "keyword": "excellent quality",
      "relevance": 0.95,
      "count": 2
    },
    {
      "keyword": "fast shipping",
      "relevance": 0.88,
      "count": 1
    }
  ],
  "tokensUsed": 500
}
```

---

### 4. OCR - Extract Text from Image

**Use Case:** Scan business cards tự động

**n8n HTTP Request Node:**

```json
{
  "method": "POST",
  "url": "http://localhost:3000/api/ai/ocr/image",
  "sendBody": true,
  "contentType": "multipart-form-data",
  "bodyParameters": {
    "parameters": [
      {
        "name": "file",
        "value": "={{ $binary.data }}"
      },
      {
        "name": "language",
        "value": "eng"
      }
    ]
  }
}
```

**n8n Workflow Example:**

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Email       │────▶│ HTTP Request │────▶│  Parse Text  │────▶│  Google CRM  │
│  (Scan Card) │     │  (OCR)       │     │  (Extract)   │     │  (Add Contact│
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

**Response:**
```json
{
  "success": true,
  "filename": "business-card.jpg",
  "text": "John Doe\nCEO, Example Corp\nPhone: +1-555-1234\nEmail: john@example.com",
  "confidence": 94.5,
  "words": 12,
  "lines": 4
}
```

---

## 💡 Complete Workflow Examples

### Example 1: Auto Blog Translator

**Workflow:** English Blog → Translate → Summarize → Post to WordPress

```
┌──────────────┐
│  RSS Trigger │
│  (EN Blog)   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Firecrawl    │ POST /api/firecrawl/scrape
│ (Get Content)│ {"url": "{{ $json.link }}"}
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ AI Translate │ POST /api/ai/translate
│ (EN → VI)    │ {"text": "{{ $json.markdown }}", "targetLang": "vi"}
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ AI Summarize │ POST /api/ai/summarize
│ (Summary)    │ {"content": "{{ $json.translatedText }}", "maxLength": "short"}
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ WordPress    │
│ (Publish)    │
└──────────────┘
```

---

### Example 2: Auto Invoice Generator

**Workflow:** Order → Template → PDF → Email

```
┌──────────────┐
│  Webhook     │
│  (New Order) │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Prepare Data│ (Set variables)
│  (Transform) │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Render Templ │ POST /api/templates/render
│ (Invoice)    │ {"templateName": "invoice", "data": {...}}
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Generate PDF │ POST /api/conversion/md-to-pdf
│              │ {"markdown": "{{ $json.rendered }}"}
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Send Email   │
│ (with PDF)   │
└──────────────┘
```

---

### Example 3: Content Monitor & Alert

**Workflow:** Crawl Competitor → Analyze → Alert if negative

```
┌──────────────┐
│  Schedule    │
│  (Daily)     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Firecrawl    │ POST /api/firecrawl/crawl
│ (Competitor) │ {"url": "https://competitor.com/blog", "maxPages": 10}
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Loop Pages   │ (Split into items)
│              │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ AI Analyze   │ POST /api/ai/analyze/sentiment
│ (Sentiment)  │ {"content": "{{ $json.markdown }}"}
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  IF Node     │
│  (Negative?) │
└──────┬───────┘
       │ Yes
       ▼
┌──────────────┐
│ Send Slack   │
│ (Alert Team) │
└──────────────┘
```

---

## 🔧 n8n HTTP Request Node - Best Practices

### 1. Error Handling

```json
{
  "continueOnFail": true,
  "options": {
    "response": {
      "response": {
        "fullResponse": false,
        "neverError": false
      }
    },
    "timeout": 30000
  }
}
```

### 2. Retry Logic

```json
{
  "options": {
    "retry": {
      "retry": {
        "maxTries": 3,
        "waitBetweenTries": 1000
      }
    }
  }
}
```

### 3. Authentication (nếu cần)

```json
{
  "authentication": "genericCredentialType",
  "genericAuthType": "httpHeaderAuth",
  "httpHeaderAuth": {
    "name": "Authorization",
    "value": "Bearer YOUR_TOKEN"
  }
}
```

---

## 📊 Response Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Process response |
| 400 | Bad Request | Check input data |
| 404 | Not Found | Check endpoint URL |
| 503 | Service Unavailable | Check API keys |
| 500 | Server Error | Retry later |

---

## 🎯 Common Use Cases Summary

| Use Case | Endpoint | Needs API Key? |
|----------|----------|----------------|
| PDF → Markdown | `/api/markitdown/convert` | ❌ No |
| Web Scraping | `/api/firecrawl/scrape` | ❌ No |
| MD → PDF | `/api/conversion/md-to-pdf` | ❌ No |
| Generate Report | `/api/templates/render` | ❌ No |
| QR Code | `/api/qrcode/generate` | ❌ No |
| Batch Convert | `/api/batch/convert` | ❌ No |
| AI Summarize | `/api/ai/summarize` | ✅ Yes (OpenAI) |
| AI Translate | `/api/ai/translate` | ✅ Yes (Google/OpenAI) |
| AI Analyze | `/api/ai/analyze` | ✅ Yes (OpenAI) |
| OCR | `/api/ai/ocr/image` | ❌ No (Tesseract) |

---

## 🚀 Quick Start Template

**Minimal n8n HTTP Request:**

```json
{
  "url": "http://localhost:3000/api/YOUR_ENDPOINT",
  "method": "POST",
  "sendBody": true,
  "contentType": "json",
  "body": {
    "param1": "value1"
  }
}
```

**Download file response:**

```json
{
  "url": "http://localhost:3000/api/conversion/download/{{ $json.filename }}",
  "method": "GET",
  "options": {
    "response": {
      "response": {
        "responseFormat": "file"
      }
    }
  }
}
```

---

## 📞 Support

- **GitHub Issues**: https://github.com/nguyenxtan/MCP_ICONIC/issues
- **API Docs**: http://localhost:3000 (when server running)
- **Health Check**: http://localhost:3000/health

---

**Tip:** Import workflow JSON từ n8n community để bắt đầu nhanh hơn! 🚀
