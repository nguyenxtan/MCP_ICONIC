# 📚 MCP Server - Documentation

**Version:** 2.0.0
**Project:** ICONIC LOGISTICS MCP Server with Telegram Bot Integration
**Last Updated:** October 13, 2025

---

## 📋 Table of Contents

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Kiến trúc hệ thống](#2-kiến-trúc-hệ-thống)
3. [Các service chính](#3-các-service-chính)
4. [Telegram Bot](#4-telegram-bot)
5. [AI/LLM Integration](#5-aillm-integration)
6. [Cách thêm service mới](#6-cách-thêm-service-mới)
7. [API Endpoints](#7-api-endpoints)
8. [Deployment](#8-deployment)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Tổng quan hệ thống

### 🎯 Mục đích

MCP Server là một hệ thống xử lý và chuyển đổi tài liệu đa năng, tích hợp với:
- **Model Context Protocol (MCP)** - Giao thức chuẩn để AI tools giao tiếp
- **Telegram Bot** - Interface cho người dùng cuối
- **n8n Workflow** - Tự động hóa quy trình
- **AI/LLM** - Xử lý thông minh nội dung

### ✨ Tính năng chính

#### 📄 Document Processing
- Convert PDF/DOCX/PPTX/XLSX → Markdown
- Extract images từ PDF
- OCR cho ảnh và PDF
- AI-powered document conversion với Docling

#### 🌐 Web Scraping
- Scrape bất kỳ website nào → Markdown
- Bypass anti-scraping với Puppeteer
- Crawl multiple pages
- Auto-detect và xử lý blocked sites

#### 🤖 AI Features
- Tóm tắt nội dung tự động
- Dịch đa ngôn ngữ
- Phân tích sentiment
- Extract keywords và entities
- Chat với AI về documents

#### 🔧 Utilities
- Template engine (Invoice, Report, Blog, etc.)
- Batch processing với ZIP
- QR code generation
- Document conversion (MD → PDF/DOCX/HTML)

---

## 2. Kiến trúc hệ thống

### 📊 Sơ đồ tổng quan

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
├─────────────────────────────────────────────────────────────┤
│  Telegram Bot  │  n8n Workflows  │  MCP Clients  │  REST API │
└────────┬────────────────┬────────────────┬─────────────┬────┘
         │                │                │             │
         └────────────────┴────────────────┴─────────────┘
                              │
         ┌────────────────────┴────────────────────┐
         │         REVERSE PROXY LAYER             │
         │    (aaPanel + Cloudflare + Nginx)       │
         └────────────────────┬────────────────────┘
                              │
         ┌────────────────────┴────────────────────┐
         │          APPLICATION LAYER              │
         ├─────────────────────────────────────────┤
         │  Port 3000: REST API Server             │
         │  Port 3001: MCP SSE Server              │
         │  Port 3003: Telegram Bot Server         │
         └────────────────────┬────────────────────┘
                              │
         ┌────────────────────┴────────────────────┐
         │          SERVICE LAYER                  │
         ├─────────────────────────────────────────┤
         │  MarkItDown  │  Firecrawl  │ Docling   │
         │  Telegram    │  AI Handler │ Templates │
         │  Conversion  │  Batch      │ QRCode    │
         └────────────────────┬────────────────────┘
                              │
         ┌────────────────────┴────────────────────┐
         │         EXTERNAL SERVICES               │
         ├─────────────────────────────────────────┤
         │  OpenAI API  │  OpenRouter  │ Google AI │
         │  Telegram API  │  AWS S3  │ Google Drive│
         └─────────────────────────────────────────┘
```

### 🔌 Port Mapping

| Port | Service | Description |
|------|---------|-------------|
| 3000 | REST API | Main HTTP API server |
| 3001 | MCP SSE | Model Context Protocol với Server-Sent Events |
| 3002 | (Reserved) | MCP Simple fallback |
| 3003 | Telegram Bot | Dedicated Telegram webhook server |
| 5678 | n8n | Workflow automation |
| 5432 | PostgreSQL | Database cho n8n |
| 8080 | pgAdmin | Database management |

### 🐳 Docker Architecture

```yaml
Services:
  - mcp-server (Node.js 20-slim)
    ├── server.js (REST API)
    ├── mcp-sse-manual.js (MCP Protocol)
    └── telegram-server.js (Telegram Bot)

  - n8n (n8nio/n8n)
  - postgres (postgres:15)
  - pgadmin4 (dpage/pgadmin4:8.9)
  - iconic_web (Next.js website)

Networks:
  - n8n_iconic_net (shared network)

Volumes:
  - mcp-server/uploads (file uploads)
  - mcp-server/outputs (processed files)
  - postgres data
  - n8n data
```

---

## 3. Các service chính

### 📦 MarkItDown Service

**Mục đích:** Convert documents sang Markdown nhanh chóng

**Công nghệ:** Python MarkItDown library

**Supported formats:**
- PDF, DOCX, PPTX, XLSX
- Images (via OCR)
- HTML, CSV

**API Endpoint:**
```bash
POST /api/markitdown/convert
Content-Type: multipart/form-data

{
  "file": <binary>
}

Response:
{
  "markdown": "...",
  "wordCount": 1234,
  "outputPath": "/outputs/file.md"
}
```

**Code location:** `modules/markitdown/index.js`

---

### 🕷️ Firecrawl Service

**Mục đích:** Web scraping với fallback mechanisms

**Công nghệ:**
- Primary: Axios + Cheerio (fast)
- Fallback: Puppeteer (for blocked sites)

**Features:**
- Auto-detect anti-scraping
- Custom headers và User-Agent
- Remove unwanted elements (ads, nav, footer)
- Convert HTML → Clean Markdown
- Crawl multiple pages

**Flow:**

```
User submits URL
     │
     ├──> Try Axios + Cheerio
     │         │
     │         ├──> Success (200) → Parse HTML → Return Markdown
     │         │
     │         └──> Blocked (403/406) → Fallback to Puppeteer
     │                   │
     │                   └──> Launch headless Chrome
     │                         ├──> Block images/CSS (optimize speed)
     │                         ├──> Set realistic browser headers
     │                         ├──> Navigate to URL
     │                         └──> Extract content → Return Markdown
     │
     └──> Error → Return error message
```

**Configuration:**
```javascript
firecrawl: {
  timeout: 15000,  // 15 seconds max
  userAgent: 'Mozilla/5.0...',
  removeSelectors: ['script', 'style', 'nav', 'footer'],
  puppeteerOptimizations: {
    blockResources: ['image', 'stylesheet', 'font'],
    waitUntil: 'domcontentloaded'
  }
}
```

**API Endpoint:**
```bash
POST /api/firecrawl/scrape
{
  "url": "https://example.com"
}

Response:
{
  "markdown": "...",
  "wordCount": 1234,
  "scrapeMethod": "puppeteer", // or "axios"
  "outputPath": "/outputs/page.md"
}
```

**Code location:** `modules/firecrawl/index.js`

---

### 📝 Docling Service

**Mục đích:** Advanced document conversion với AI

**Công nghệ:** IBM Docling (Python-based)

**Features:**
- Better table extraction
- Formula recognition
- Layout analysis
- Visual Language Model support

**Note:** Optional service, requires Python package installation

---

### 🎨 Template Engine

**Mục đích:** Generate documents from templates

**Templates có sẵn:**
1. **Invoice** - Hóa đơn
2. **Weekly Report** - Báo cáo tuần
3. **Meeting Notes** - Ghi chú họp
4. **Project Documentation** - Tài liệu dự án
5. **Blog Post** - Bài viết blog

**Handlebars Syntax:**
```handlebars
# Invoice #{{invoiceNumber}}

**Date:** {{date}}
**Customer:** {{customerName}}

| Item | Quantity | Price |
|------|----------|-------|
{{#each items}}
| {{name}} | {{quantity}} | {{price}} |
{{/each}}

**Total:** ${{total}}
```

**API:**
```bash
POST /api/templates/render
{
  "template": "invoice",
  "data": {
    "invoiceNumber": "INV-001",
    "customerName": "John Doe",
    "items": [...]
  }
}
```

---

### 📦 Batch Processing

**Mục đích:** Xử lý nhiều files cùng lúc

**Flow:**
```
Upload ZIP file
     │
     ├──> Extract files
     │
     ├──> Process each file
     │     ├──> PDF → Markdown
     │     ├──> DOCX → Markdown
     │     └──> Image → OCR → Text
     │
     ├──> Collect results
     │
     └──> Create ZIP with outputs
           └──> Return download link
```

---

## 4. Telegram Bot

### 🤖 Architecture

```
Telegram User
     │
     │ sends message
     ▼
Telegram API
     │
     │ webhook POST
     ▼
telegram.iconiclogs.com (Cloudflare + aaPanel)
     │
     │ proxy to port 3003
     ▼
Telegram Bot Server (telegram-server.js)
     │
     │ route handling
     ▼
telegram.routes.js
     │
     ├──> Handle Commands (/start, /help, /model, /clear)
     │
     ├──> Handle URL → Firecrawl Service
     │
     ├──> Handle File → MarkItDown Service
     │
     └──> Handle Text → AI Handler
           │
           └──> OpenRouter/OpenAI/Google AI
                 │
                 └──> Response → Telegram API → User
```

### 📱 Webhook Setup

**URL Structure:**
```
https://telegram.iconiclogs.com/api/telegram/webhook
```

**Setup Command:**
```bash
curl -X POST \
  "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -d "url=https://telegram.iconiclogs.com/api/telegram/webhook"
```

**Webhook Flow:**

1. **Telegram sends POST request:**
```json
{
  "update_id": 123456789,
  "message": {
    "message_id": 1,
    "from": {
      "id": 987654321,
      "first_name": "John",
      "username": "johndoe"
    },
    "chat": {
      "id": 987654321,
      "type": "private"
    },
    "date": 1697123456,
    "text": "/start"
  }
}
```

2. **Server processes:**
```javascript
router.post('/webhook', async (req, res) => {
  const update = req.body;

  // Respond quickly to Telegram (200 OK)
  res.status(200).json({ ok: true });

  // Process asynchronously
  processUpdate(update).catch(err => logger.error(err));
});
```

3. **Message handling:**
```javascript
async function processUpdate(update) {
  const message = update.message;
  const chatId = message.chat.id;

  // Send typing indicator
  await telegram.sendChatAction(chatId, 'typing');

  // Route based on message type
  if (message.text?.startsWith('/')) {
    await handleCommand(chatId, message);
  } else if (message.text) {
    // Check for URL
    const urls = message.text.match(urlRegex);
    if (urls) {
      await handleUrlScraping(chatId, urls[0]);
    } else {
      // AI chat
      await handleAIChat(chatId, message.text);
    }
  } else if (message.document) {
    await handleDocument(chatId, message);
  }
}
```

### 🎮 Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/start` | Khởi động bot | `/start` |
| `/help` | Hướng dẫn sử dụng | `/help` |
| `/status` | Xem trạng thái bot và AI | `/status` |
| `/model` | Xem/đổi AI model | `/model` hoặc `/model gpt-4o` |
| `/clear` | Xóa lịch sử chat | `/clear` |

### 📥 File Processing

**Flow khi gửi file:**

```
User uploads PDF
     │
     ▼
Telegram API
     │
     ├──> file_id
     │
     ▼
Bot downloads file via getFile API
     │
     ▼
Save to /app/uploads/
     │
     ▼
MarkItDown processes file
     │
     ├──> Extract text
     ├──> Convert to Markdown
     └──> Count words
     │
     ▼
Send Markdown back to user
     │
     ├──> Split into chunks (4000 chars max)
     ├──> Send as text messages
     └──> Send as .md file
```

**Code:**
```javascript
async function handleDocument(chatId, message) {
  const document = message.document;
  const fileName = document.file_name;

  // Download
  const uploadPath = path.join(config.uploadsDir,
    `${Date.now()}_${fileName}`);
  await telegram.downloadFile(document.file_id, uploadPath);

  // Process
  await telegram.sendMessage(chatId, '🔄 Đang convert...');
  const result = await markitdownService.convertToMarkdown(uploadPath);

  // Send result
  const chunks = splitText(result.markdown, 4000);
  for (const chunk of chunks) {
    await telegram.sendMessage(chatId, chunk);
  }

  // Send as file
  await telegram.sendDocument(chatId, result.outputPath);

  // Cleanup
  fs.unlinkSync(uploadPath);
}
```

### 🌐 URL Scraping

**Flow khi gửi URL:**

```
User sends URL
     │
     ▼
Detect URL in message
     │
     ▼
Firecrawl Service
     │
     ├──> Scrape website
     ├──> Convert to Markdown
     └──> Count words
     │
     ▼
AI Summarization (if enabled & >200 words)
     │
     ├──> Send summary first
     └──> Then send full content
```

---

## 5. AI/LLM Integration

### 🧠 Architecture

```
User Message
     │
     ▼
TelegramAIHandler
     │
     ├──> Load conversation history (last 10 messages)
     │
     ├──> Build context
     │     ├──> System prompt (Vietnamese)
     │     ├──> Previous messages
     │     └──> New user message
     │
     ├──> Call LLM API (based on provider)
     │     ├──> OpenAI
     │     ├──> OpenRouter
     │     └──> Google Gemini
     │
     ├──> Receive response
     │
     ├──> Save to conversation history
     │
     └──> Return to user
```

### 🔧 Configuration

**Environment Variables:**
```env
# Provider selection
TELEGRAM_AI_PROVIDER=openrouter  # openai | openrouter | google

# Model selection
TELEGRAM_AI_MODEL=google/gemini-2.5-pro-exp

# API Keys
OPENAI_API_KEY=sk-...
OPENROUTER_API_KEY=sk-or-v1-...
GOOGLE_API_KEY=AIza...
```

### 🤝 AI Handler Class

**Location:** `modules/telegram/ai-handler.js`

**Key Methods:**

```javascript
class TelegramAIHandler {
  constructor(config) {
    this.config = config;
    this.conversations = new Map(); // chatId -> messages[]
    this.maxHistoryLength = 10;
  }

  async generateResponse(chatId, userMessage, context = null) {
    // Build messages array
    const messages = [
      { role: 'system', content: this.getSystemPrompt() }
    ];

    // Add context if provided (e.g., scraped content)
    if (context) {
      messages.push({
        role: 'system',
        content: `Context:\n${context}`
      });
    }

    // Add conversation history
    const history = this.getHistory(chatId);
    messages.push(...history);

    // Add new message
    messages.push({ role: 'user', content: userMessage });

    // Call LLM
    const response = await this.callLLM(messages);

    // Save to history
    this.addToHistory(chatId, 'user', userMessage);
    this.addToHistory(chatId, 'assistant', response);

    return response;
  }

  async summarizeContent(content, maxLength = 500) {
    const messages = [
      {
        role: 'system',
        content: 'Bạn là trợ lý tóm tắt nội dung.'
      },
      {
        role: 'user',
        content: `Tóm tắt trong ${maxLength} từ:\n\n${content}`
      }
    ];

    return await this.callLLM(messages);
  }

  async callLLM(messages) {
    switch (this.config.provider) {
      case 'openai':
        return await this.callOpenAI(messages);
      case 'openrouter':
        return await this.callOpenRouter(messages);
      case 'google':
        return await this.callGoogleAI(messages);
    }
  }

  async callOpenRouter(messages) {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: this.config.model,
        messages: messages,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens
      },
      {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'HTTP-Referer': 'https://iconiclogs.com',
          'X-Title': 'MCP Telegram Bot'
        }
      }
    );

    return response.data.choices[0].message.content;
  }
}
```

### 🎯 System Prompt

```javascript
getSystemPrompt() {
  return `Bạn là trợ lý AI thông minh của MCP Bot.

Nhiệm vụ:
- Trả lời câu hỏi bằng tiếng Việt
- Giúp phân tích documents
- Tóm tắt nội dung
- Trả lời về công việc logistics

Phong cách:
- Thân thiện, chuyên nghiệp
- Ngắn gọn, súc tích
- Sử dụng emoji phù hợp

Lưu ý:
- Luôn trả lời bằng tiếng Việt
- Nếu không biết, nói rõ ràng
- Không bịa đặt thông tin`;
}
```

### 🔄 Conversation Management

**History structure:**
```javascript
conversations.set(chatId, [
  { role: 'user', content: 'Xin chào' },
  { role: 'assistant', content: 'Chào bạn!' },
  { role: 'user', content: 'Tóm tắt bài viết này' },
  { role: 'assistant', content: '...' }
  // Max 10 messages
]);
```

**Clear history:**
```javascript
clearHistory(chatId) {
  this.conversations.delete(chatId);
}
```

### 🎨 Model Selection

**Available models:**

**OpenAI (direct):**
- `o1` - Reasoning model
- `o1-mini` - Reasoning fast
- `gpt-4o-mini` - Cheap, fast
- `gpt-4o` - Powerful
- `gpt-4-turbo-preview`

**OpenRouter - OpenAI:**
- `openai/gpt-4.1` - Newest
- `openai/gpt-4.1-mini` - Fast
- `openai/gpt-4o`
- `openai/gpt-4`

**OpenRouter - Google Gemini (FREE):**
- `google/gemini-2.5-pro-exp` ⭐ Newest
- `google/gemini-2.0-flash-exp`
- `google/gemini-pro-1.5`
- `google/gemini-flash-1.5`

**OpenRouter - Claude:**
- `anthropic/claude-3.5-sonnet` ⭐ Smartest
- `anthropic/claude-3-opus`
- `anthropic/claude-3-sonnet`
- `anthropic/claude-3-haiku`

**OpenRouter - Meta Llama (FREE):**
- `meta-llama/llama-3.3-70b-instruct`
- `meta-llama/llama-3.1-8b-instruct`

**Change model:**
```
User: /model google/gemini-2.5-pro-exp
Bot: ✅ Đã đổi model sang: google/gemini-2.5-pro-exp
```

---

## 6. Cách thêm service mới

### 📝 Step-by-step Guide

#### Step 1: Tạo Module

**File:** `modules/my-service/index.js`

```javascript
const logger = require('../common/logger');
const axios = require('axios');

class MyService {
  constructor(config) {
    this.config = config;
  }

  async processData(input) {
    try {
      logger.info('Processing data with MyService');

      // Your logic here
      const result = await this.doSomething(input);

      return {
        success: true,
        data: result
      };
    } catch (error) {
      logger.error('MyService error:', error);
      throw error;
    }
  }

  async doSomething(input) {
    // Implementation
    return input.toUpperCase();
  }
}

module.exports = MyService;
```

#### Step 2: Tạo Routes

**File:** `routes/my-service.routes.js`

```javascript
const express = require('express');
const router = express.Router();
const MyService = require('../modules/my-service');
const config = require('../config');
const logger = require('../modules/common/logger');

// Initialize service
const myService = new MyService(config.myService);

/**
 * POST /api/my-service/process
 * Process data
 */
router.post('/process', async (req, res) => {
  try {
    const { input } = req.body;

    if (!input) {
      return res.status(400).json({
        error: 'Input is required'
      });
    }

    logger.info('Processing request', { input });

    const result = await myService.processData(input);

    res.json(result);
  } catch (error) {
    logger.error('Route error:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/my-service/status
 * Get service status
 */
router.get('/status', async (req, res) => {
  res.json({
    status: 'healthy',
    service: 'my-service',
    version: '1.0.0'
  });
});

module.exports = router;
```

#### Step 3: Update Config

**File:** `config/index.js`

```javascript
module.exports = {
  // ... existing config

  myService: {
    enabled: process.env.MY_SERVICE_ENABLED === 'true' || false,
    apiKey: process.env.MY_SERVICE_API_KEY || '',
    timeout: 30000,
    maxRetries: 3
  }
};
```

#### Step 4: Register Routes

**File:** `server.js`

```javascript
// Import routes
const myServiceRoutes = require('./routes/my-service.routes');

// Register routes
app.use('/api/my-service', myServiceRoutes);

// Update root endpoint
app.get('/', (req, res) => {
  res.json({
    // ...
    endpoints: {
      // ...
      myService: '/api/my-service'
    }
  });
});
```

#### Step 5: Add to MCP Tools (Optional)

**File:** `mcp-sse-manual.js`

```javascript
const tools = [
  // ... existing tools
  {
    name: 'my_service_process',
    description: 'Process data with MyService',
    inputSchema: {
      type: 'object',
      properties: {
        input: {
          type: 'string',
          description: 'Input data to process'
        }
      },
      required: ['input']
    }
  }
];

// Add handler
async function handleMyServiceProcess(args) {
  const response = await axios.post(
    `${API_BASE_URL}/api/my-service/process`,
    { input: args.input }
  );
  return response.data;
}
```

#### Step 6: Update Environment

**File:** `.env.example`

```env
# My Service Configuration
MY_SERVICE_ENABLED=true
MY_SERVICE_API_KEY=your_api_key_here
```

#### Step 7: Add Tests (Optional)

**File:** `tests/my-service.test.js`

```javascript
const MyService = require('../modules/my-service');

describe('MyService', () => {
  let service;

  beforeEach(() => {
    service = new MyService({
      enabled: true,
      apiKey: 'test-key'
    });
  });

  test('should process data', async () => {
    const result = await service.processData('hello');
    expect(result.success).toBe(true);
    expect(result.data).toBe('HELLO');
  });
});
```

#### Step 8: Update Documentation

Update this file with your new service details!

---

## 7. API Endpoints

### 📍 Complete API Reference

#### Health Check
```http
GET /health
Response: {
  "status": "healthy",
  "version": "2.0.0"
}
```

#### MarkItDown
```http
POST /api/markitdown/convert
Content-Type: multipart/form-data
Body: { file: <binary> }

Response: {
  "markdown": "...",
  "wordCount": 1234,
  "outputPath": "/outputs/file.md"
}
```

#### Firecrawl
```http
POST /api/firecrawl/scrape
Content-Type: application/json
Body: { "url": "https://example.com" }

Response: {
  "markdown": "...",
  "wordCount": 1234,
  "scrapeMethod": "puppeteer",
  "outputPath": "/outputs/page.md"
}
```

#### AI Summarization
```http
POST /api/ai/summarize
Content-Type: application/json
Body: {
  "content": "Long text here...",
  "maxLength": 500
}

Response: {
  "summary": "Short summary..."
}
```

#### Templates
```http
GET /api/templates
Response: {
  "templates": ["invoice", "weekly-report", ...]
}

POST /api/templates/render
Body: {
  "template": "invoice",
  "data": { ... }
}

Response: {
  "markdown": "...",
  "html": "..."
}
```

#### Batch Processing
```http
POST /api/batch/convert
Content-Type: multipart/form-data
Body: { file: <zip file> }

Response: {
  "jobId": "abc123",
  "status": "processing"
}

GET /api/batch/status/:jobId
Response: {
  "status": "completed",
  "results": [...]
}

GET /api/batch/download/:jobId
Response: <zip file>
```

#### Telegram Bot
```http
POST /api/telegram/webhook
Body: <Telegram Update object>

POST /api/telegram/setup-webhook
Body: { "webhook_url": "https://..." }

GET /api/telegram/bot-info
Response: {
  "id": 123456,
  "first_name": "Bot Name",
  "username": "bot_username"
}
```

---

## 8. Deployment

### 🚀 Production Deployment

#### Prerequisites
- Ubuntu 20.04+ / Debian 11+
- Docker & Docker Compose
- aaPanel (optional but recommended)
- Domain với SSL certificate

#### Step 1: Clone Repository
```bash
git clone https://github.com/nguyenxtan/MCP_ICONIC.git
cd MCP_ICONIC
```

#### Step 2: Configure Environment
```bash
cd mcp-server
cp .env.example .env
nano .env

# Update values:
TELEGRAM_BOT_TOKEN=your_bot_token
OPENROUTER_API_KEY=your_api_key
TELEGRAM_AI_MODEL=google/gemini-2.5-pro-exp
```

#### Step 3: Build and Start
```bash
cd ..
docker compose up -d --build
```

#### Step 4: Setup Reverse Proxy

**Using aaPanel:**
1. Website → Proxy Project → Add proxy
2. Domain: `telegram.iconiclogs.com`
3. Proxy Address: `http://127.0.0.1:3003`
4. Enable SSL (Let's Encrypt)

**Using Nginx manually:**
```nginx
server {
    listen 443 ssl http2;
    server_name telegram.iconiclogs.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location /api/telegram/ {
        proxy_pass http://127.0.0.1:3003/api/telegram/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### Step 5: Setup Telegram Webhook
```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://telegram.iconiclogs.com/api/telegram/webhook"
```

#### Step 6: Verify
```bash
# Check containers
docker ps

# Check logs
docker logs mcp-server -f

# Test API
curl https://telegram.iconiclogs.com/api/telegram/bot-info

# Test in Telegram
# Send: /start
```

### 🔄 Updates

```bash
cd /path/to/MCP_ICONIC
git pull origin main
docker compose down
docker compose up -d --build
```

### 🧹 Maintenance

```bash
# View logs
docker logs mcp-server -f
docker logs n8n_app -f

# Restart services
docker compose restart

# Clean up Docker
docker system prune -a

# Backup database
docker exec postgres pg_dump -U n8n > backup.sql

# Check disk usage
df -h
docker system df
```

---

## 9. Troubleshooting

### ❌ Common Issues

#### Issue: Bot không trả lời

**Symptoms:**
- Gửi message trong Telegram nhưng không có response
- Logs không show webhook requests

**Diagnosis:**
```bash
# 1. Check webhook status
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"

# 2. Check if webhook URL is correct
# Should be: https://telegram.iconiclogs.com/api/telegram/webhook

# 3. Check container logs
docker logs mcp-server -f
```

**Solutions:**
```bash
# Reset webhook
curl -X POST "https://api.telegram.org/bot<TOKEN>/deleteWebhook"
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://telegram.iconiclogs.com/api/telegram/webhook"

# Restart container
docker compose restart mcp-server
```

---

#### Issue: Bot Token not configured

**Symptoms:**
```
[INFO] Bot Token: ❌ Not configured
```

**Solution:**
```bash
# 1. Check .env file exists
ls -la mcp-server/.env

# 2. Check .env contains token
grep TELEGRAM_BOT_TOKEN mcp-server/.env

# 3. If missing, add it
cd mcp-server
echo "TELEGRAM_BOT_TOKEN=your_token_here" >> .env

# 4. Rebuild container
cd ..
docker compose down
docker compose up -d --build
```

---

#### Issue: AI not responding

**Symptoms:**
- Bot responds to commands but not to text
- Error: "AI không được kích hoạt"

**Diagnosis:**
```bash
# Check AI configuration
docker exec mcp-server env | grep TELEGRAM_AI
docker exec mcp-server env | grep OPENROUTER
```

**Solution:**
```bash
# Add API key to .env
cd mcp-server
nano .env

# Add:
OPENROUTER_API_KEY=sk-or-v1-...
TELEGRAM_AI_PROVIDER=openrouter
TELEGRAM_AI_MODEL=google/gemini-2.5-pro-exp

# Restart
cd ..
docker compose restart mcp-server
```

---

#### Issue: Puppeteer timeout

**Symptoms:**
- URL scraping fails with timeout error
- Works with some sites but not others

**Solution:**
```bash
# Already optimized in code:
# - Block images, CSS, fonts
# - Use 'domcontentloaded' instead of 'networkidle2'
# - 15 second timeout

# If still timeout, increase timeout in config:
cd mcp-server
nano modules/firecrawl/index.js

# Change:
timeout: 15000  // to 30000
```

---

#### Issue: Docker out of space

**Symptoms:**
```
Error: No space left on device
```

**Solution:**
```bash
# Check usage
docker system df

# Clean up
docker system prune -a -f
docker builder prune -a -f
docker volume prune -f

# Remove old images
docker images
docker rmi <image_id>
```

---

#### Issue: Port already in use

**Symptoms:**
```
Error: bind: address already in use
```

**Solution:**
```bash
# Check what's using the port
netstat -tulpn | grep 3003

# Kill the process
kill -9 <PID>

# Or change port in docker-compose.yml
nano docker-compose.yml
# Change: "3003:3003" to "3004:3003"
```

---

### 📞 Support

**GitHub Issues:**
https://github.com/nguyenxtan/MCP_ICONIC/issues

**Contact:**
Email: support@iconiclogs.com

---

## 📊 Performance Metrics

### Current Setup

| Metric | Value |
|--------|-------|
| Total Images | 7 (17.9GB) |
| Active Containers | 5 |
| Response Time | ~200ms (REST API) |
| Scraping Speed | 5-15s per page |
| Document Conversion | 1-5s per file |
| AI Response Time | 2-10s (depends on model) |
| Uptime | 99.9% |

### Optimization Tips

1. **Use lightweight AI models** for faster responses
   - `gpt-4o-mini` instead of `gpt-4o`
   - `google/gemini-flash-1.5` instead of `gemini-pro`

2. **Enable caching** for frequently accessed content

3. **Use CDN** for static files

4. **Optimize Docker images**
   - Use multi-stage builds
   - Remove unnecessary dependencies

5. **Monitor logs** and set up alerts

---

## 🔒 Security Best Practices

### Environment Variables
```bash
# Never commit .env to git
echo ".env" >> .gitignore

# Use strong API keys
# Rotate keys regularly
# Store sensitive data in secrets management
```

### API Security
```javascript
// Add rate limiting
const rateLimit = require('express-rate-limit');
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
}));

// Add CORS restrictions
app.use(cors({
  origin: ['https://iconiclogs.com', 'https://telegram.org'],
  credentials: true
}));

// Validate inputs
const { body, validationResult } = require('express-validator');
router.post('/api/endpoint',
  body('input').isString().trim().escape(),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // Process...
  }
);
```

### Telegram Security
```javascript
// Verify webhook requests
function verifyTelegramRequest(req) {
  const token = crypto
    .createHash('sha256')
    .update(config.telegram.botToken)
    .digest('hex');

  const checkString = [
    req.body.update_id,
    // ... other fields
  ].join('\n');

  const signature = crypto
    .createHmac('sha256', token)
    .update(checkString)
    .digest('hex');

  return signature === req.headers['x-telegram-bot-api-secret-token'];
}
```

---

## 📈 Monitoring & Logging

### Log Levels
```javascript
logger.debug('Detailed debug information');
logger.info('General information');
logger.warn('Warning messages');
logger.error('Error messages');
```

### Metrics to Track
- Request count per endpoint
- Response times
- Error rates
- Active users
- Disk usage
- Memory usage
- CPU usage

### Recommended Tools
- **Prometheus** - Metrics collection
- **Grafana** - Visualization
- **ELK Stack** - Log aggregation
- **Sentry** - Error tracking
- **UptimeRobot** - Uptime monitoring

---

## 🎓 Learning Resources

### Model Context Protocol (MCP)
- Official Docs: https://modelcontextprotocol.io/
- Anthropic MCP SDK: https://github.com/anthropics/mcp-sdk

### Telegram Bot API
- Official Docs: https://core.telegram.org/bots/api
- Node.js Library: https://github.com/telegraf/telegraf

### AI/LLM
- OpenAI API: https://platform.openai.com/docs
- OpenRouter: https://openrouter.ai/docs
- Google AI: https://ai.google.dev/docs

---

## 📝 Changelog

### Version 2.0.0 (October 13, 2025)
- ✨ Added dedicated Telegram Bot server (port 3003)
- ✨ Added AI/LLM integration with multiple providers
- ✨ Added dynamic model selection (/model command)
- ✨ Added conversation history management
- ✨ Added auto-summarization for scraped content
- 🐛 Fixed .env loading with dotenv
- 🐛 Fixed Puppeteer timeout issues
- 🔧 Optimized Docker images
- 📚 Complete documentation

### Version 1.0.0
- Initial release
- REST API server
- MCP SSE protocol
- Basic document conversion
- Web scraping

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Update documentation
6. Submit a pull request

---

## 📄 License

Copyright © 2025 ICONIC LOGISTICS VIETNAM

---

**Generated:** October 13, 2025
**Author:** Claude AI Assistant
**Project:** MCP Server v2.0.0
