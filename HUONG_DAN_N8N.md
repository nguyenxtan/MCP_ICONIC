# Hướng dẫn kết nối n8n với MCP Server

## ❌ Vấn đề hiện tại

**n8n MCP Client node** yêu cầu server implement MCP Protocol (JSON-RPC 2.0), nhưng server hiện tại chỉ là REST API thông thường.

---

## ✅ GIẢI PHÁP 1: Sử dụng HTTP Request node (KHUYẾN NGHỊ)

### Tại sao dùng HTTP Request thay vì MCP Client?

- ✅ Server hiện tại đã hoạt động tốt với REST API
- ✅ Không cần thay đổi code server
- ✅ Dễ debug và test
- ✅ Full control over request/response

### Cách setup trong n8n:

#### 1. **MarkItDown Conversion**

```
Node: HTTP Request
Method: POST
URL: https://mcp.iconiclogs.com/api/markitdown/convert
Authentication: None (hoặc API Key nếu bật MASTER_API_KEY)

Body (JSON):
{
  "url": "{{ $json.fileUrl }}",
  "format": "pdf"
}

Headers:
Content-Type: application/json
```

#### 2. **Firecrawl - Scrape URL**

```
Node: HTTP Request
Method: POST
URL: https://mcp.iconiclogs.com/api/firecrawl/scrape

Body (JSON):
{
  "url": "{{ $json.targetUrl }}",
  "formats": ["markdown"],
  "includeHtml": false
}
```

#### 3. **Firecrawl - Crawl Website**

```
Node: HTTP Request
Method: POST
URL: https://mcp.iconiclogs.com/api/firecrawl/crawl

Body (JSON):
{
  "url": "{{ $json.websiteUrl }}",
  "maxPages": 10,
  "formats": ["markdown"]
}
```

#### 4. **AI OCR - Extract text from image**

```
Node: HTTP Request
Method: POST
URL: https://mcp.iconiclogs.com/api/ai/ocr/image

Body (multipart-form-data):
- file: {{ $binary.data }}
- language: eng
```

#### 5. **AI Summarization**

```
Node: HTTP Request
Method: POST
URL: https://mcp.iconiclogs.com/api/ai/summarize

Body (JSON):
{
  "content": "{{ $json.textContent }}",
  "maxLength": 200
}
```

#### 6. **AI Translation**

```
Node: HTTP Request
Method: POST
URL: https://mcp.iconiclogs.com/api/ai/translate

Body (JSON):
{
  "text": "{{ $json.sourceText }}",
  "sourceLang": "auto",
  "targetLang": "vi"
}
```

---

## 🛠️ GIẢI PHÁP 2: Implement MCP Protocol wrapper

Nếu bạn **thực sự cần dùng n8n MCP Client node**, cần thêm MCP Protocol layer:

### Cài đặt MCP SDK

```bash
cd /path/to/mcp-server
npm install @modelcontextprotocol/sdk
```

### Tạo file `mcp-adapter.js`

```javascript
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { SSEServerTransport } = require('@modelcontextprotocol/sdk/server/sse.js');
const express = require('express');
const axios = require('axios');

const mcpServer = new Server(
  { name: 'iconic-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// Define available tools
mcpServer.setRequestHandler('tools/list', async () => ({
  tools: [
    {
      name: 'convert_to_markdown',
      description: 'Convert PDF/DOCX/PPTX to Markdown',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'File URL' },
          format: { type: 'string', enum: ['pdf', 'docx', 'pptx'] }
        },
        required: ['url']
      }
    },
    {
      name: 'scrape_url',
      description: 'Scrape URL to Markdown',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Target URL' }
        },
        required: ['url']
      }
    }
  ]
}));

// Handle tool execution
mcpServer.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'convert_to_markdown') {
      const res = await axios.post('http://localhost:3000/api/markitdown/convert', args);
      return { content: [{ type: 'text', text: JSON.stringify(res.data) }] };
    }

    if (name === 'scrape_url') {
      const res = await axios.post('http://localhost:3000/api/firecrawl/scrape', {
        url: args.url,
        formats: ['markdown']
      });
      return { content: [{ type: 'text', text: res.data.markdown }] };
    }
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
});

// Express app for SSE transport
const app = express();

app.get('/mcp', async (req, res) => {
  const transport = new SSEServerTransport('/mcp/message', res);
  await mcpServer.connect(transport);
});

app.post('/mcp/message', express.json(), (req, res) => {
  res.status(200).end();
});

app.listen(3001, () => console.log('MCP adapter running on port 3001'));
```

### Update server.js

```javascript
// Thêm vào cuối file server.js
if (process.env.MCP_ENABLED === 'true') {
  require('./mcp-adapter');
}
```

### Cấu hình n8n MCP Client

```
Server URL: https://mcp.iconiclogs.com/mcp
Transport: Server Sent Events
```

---

## 📊 So sánh 2 giải pháp

| Tiêu chí | HTTP Request node | MCP Client node |
|----------|-------------------|-----------------|
| Độ phức tạp | ⭐ Đơn giản | ⭐⭐⭐ Phức tạp |
| Code thay đổi | Không cần | Cần thêm MCP layer |
| Performance | Nhanh hơn | Chậm hơn (nhiều layer) |
| Debug | Dễ | Khó |
| Tính năng | Full access API | Giới hạn bởi MCP spec |

---

## 🎯 Khuyến nghị

**Dùng HTTP Request node** - đơn giản, hiệu quả, không cần sửa code.

MCP Client node chỉ cần thiết khi:
- Bạn muốn tích hợp với AI agent framework (Claude Desktop, etc.)
- Cần dynamic tool discovery
- Follow chuẩn MCP protocol cho interoperability

Với use case của bạn (n8n automation), **HTTP Request là lựa chọn tốt nhất**.
