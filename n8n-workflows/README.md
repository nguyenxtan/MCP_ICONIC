# n8n Workflow Templates for MCP Server

Ready-to-use n8n workflows for MCP Server integration.

## 📦 Available Workflows

### 1. Simple Scrape to PDF
**File:** `1-simple-scrape-to-pdf.json`

**What it does:**
- Scrapes any website URL
- Converts content to Markdown
- Generates PDF
- Downloads the PDF

**Requires API Key:** ❌ No

**Use Cases:**
- Save web articles as PDF
- Archive blog posts
- Convert documentation pages

**How to use:**
1. Import workflow in n8n
2. Edit "Input URL" node with your target URL
3. Execute workflow
4. Get PDF output

---

### 2. AI Translate & Summarize
**File:** `2-ai-translate-summarize.json`

**What it does:**
- Takes English text
- Translates to Vietnamese using OpenAI
- Summarizes into bullet points
- Returns original, translated, and summary

**Requires API Key:** ✅ Yes (OPENAI_API_KEY)

**Use Cases:**
- Translate and summarize articles
- Process multilingual content
- Create Vietnamese content from English

**How to use:**
1. Set OPENAI_API_KEY in MCP server .env
2. Import workflow in n8n
3. Edit "Input Text" with your content
4. Execute workflow
5. Get translated + summarized output

---

### 3. Auto Invoice Generator
**File:** `3-auto-invoice-generator.json`

**What it does:**
- Takes invoice data (client, items, amounts)
- Renders using invoice template
- Converts to professional PDF
- Downloads invoice

**Requires API Key:** ❌ No

**Use Cases:**
- Automated invoice generation
- Monthly billing automation
- Client invoicing workflows

**How to use:**
1. Import workflow in n8n
2. Edit "Invoice Data" node with your data
3. Execute workflow
4. Get PDF invoice

**Integration example:**
```
Stripe Webhook → n8n → MCP Invoice → Email to Client
```

---

## 🚀 How to Import Workflows

### Method 1: Via n8n UI

1. Open n8n
2. Click "Workflows" → "Import from File"
3. Select workflow JSON file
4. Click "Import"
5. Configure nodes if needed
6. Activate workflow

### Method 2: Via File System

```bash
# Copy to n8n workflows folder
cp n8n-workflows/*.json ~/.n8n/workflows/

# Restart n8n
docker-compose restart n8n
```

---

## ⚙️ Configuration

### MCP Server Setup

```bash
# Make sure MCP server is running
cd mcp-server
npm start
```

Server should be at: `http://localhost:3000`

### For AI Workflows

Edit `mcp-server/.env`:

```bash
OPENAI_API_KEY=sk-proj-xxxxx
```

---

## 🔧 Customization Guide

### Change Target Language

Edit "AI: Translate" node:

```json
{
  "targetLang": "zh"  // English → Chinese
}
```

Supported: `en`, `vi`, `zh`, `ja`, `ko`, `fr`, `es`, `de`

### Change PDF Theme

Edit "Convert to PDF" node:

```json
{
  "theme": "dark"  // Options: default, dark, minimal
}
```

### Change Summary Style

Edit "AI: Summarize" node:

```json
{
  "style": "paragraph"  // Options: bullet_points, paragraph, executive
  "maxLength": "medium" // Options: short, medium, long
}
```

---

## 🎯 Workflow Combinations

### Content Translation Pipeline

```
RSS Feed → Scrape → Translate → Summarize → Notion
```

**Nodes:**
1. RSS Feed Trigger
2. HTTP Request (Firecrawl Scrape)
3. HTTP Request (AI Translate)
4. HTTP Request (AI Summarize)
5. Notion (Create Page)

### Auto Documentation

```
GitHub Release → Crawl Docs → Convert PDF → Upload S3
```

**Nodes:**
1. GitHub Trigger (New Release)
2. HTTP Request (Firecrawl Crawl)
3. HTTP Request (MD to PDF)
4. AWS S3 (Upload)

### Customer Review Analysis

```
Database → Analyze Sentiment → Filter Negative → Slack Alert
```

**Nodes:**
1. Postgres (Get Reviews)
2. HTTP Request (AI Analyze Sentiment)
3. IF (sentiment === 'negative')
4. Slack (Send Message)

---

## 📊 Workflow Templates Summary

| Workflow | Complexity | API Key | Processing Time | Use Case |
|----------|------------|---------|-----------------|----------|
| Scrape to PDF | Simple | ❌ No | ~10s | Archive web content |
| AI Translate | Medium | ✅ Yes | ~5s | Multilingual content |
| Auto Invoice | Simple | ❌ No | ~8s | Billing automation |

---

## 💡 Tips

1. **Test with Manual Trigger** first before scheduling
2. **Use Error Workflow** for production
3. **Set Retry Logic** for API calls (3 retries, 1s wait)
4. **Monitor Execution Time** - optimize slow nodes
5. **Use Batching** for processing multiple items

---

## 🐛 Troubleshooting

### Workflow fails with 503

**Problem:** API keys not configured

**Solution:**
```bash
# Check MCP server .env file
cat mcp-server/.env

# Add missing keys
echo "OPENAI_API_KEY=sk-xxxxx" >> mcp-server/.env

# Restart server
npm start
```

### Workflow times out

**Problem:** Processing large files

**Solution:**
- Increase timeout in HTTP Request node options
- Use batch processing for multiple files
- Check MCP server logs

### PDF not generating

**Problem:** Puppeteer not installed

**Solution:**
```bash
cd mcp-server
npm install puppeteer
```

---

## 📝 Creating Custom Workflows

### Basic Template

```json
{
  "name": "My Custom Workflow",
  "nodes": [
    {
      "parameters": {
        "url": "http://localhost:3000/api/YOUR_ENDPOINT",
        "method": "POST",
        "sendBody": true,
        "contentType": "json",
        "bodyParametersJson": "={\"param\": \"value\"}"
      },
      "name": "MCP API Call",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3
    }
  ]
}
```

---

## 🔗 Resources

- **MCP Server API Docs:** `http://localhost:3000`
- **n8n Docs:** https://docs.n8n.io
- **n8n Community:** https://community.n8n.io
- **GitHub Issues:** https://github.com/nguyenxtan/MCP_ICONIC/issues

---

**Happy Automating! 🚀**
