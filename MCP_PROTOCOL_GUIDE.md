# 🚀 MCP Protocol Server - Hướng dẫn sử dụng

## 📌 Tổng quan

MCP Protocol Server chạy **độc lập** cùng với REST API server:

- **REST API Server**: Port 3000 (không thay đổi gì)
- **MCP Protocol Server**: Port 3001 (mới thêm)

## 🏗️ Kiến trúc

```
┌─────────────────┐
│   n8n Workflow  │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────────┐ ┌──────────────┐
│ HTTP    │ │ MCP Client   │
│ Request │ │ Node         │
│ Node    │ │ (SSE)        │
└────┬────┘ └──────┬───────┘
     │             │
     ▼             ▼
┌─────────────────────────────┐
│   REST API      MCP Protocol│
│   :3000         :3001       │
│   ┌───────────────────────┐ │
│   │  Business Logic       │ │
│   │  (MarkItDown, etc.)   │ │
│   └───────────────────────┘ │
└─────────────────────────────┘
```

## 🚀 Deployment

### Option 1: Chạy cả 2 server trong cùng 1 container (Đơn giản)

**Update Dockerfile:**

```dockerfile
# Thêm vào cuối Dockerfile
EXPOSE 3000 3001

# Sửa CMD
CMD ["sh", "-c", "node server.js & node mcp-server.js"]
```

**Update docker-compose.mcp.yml:**

```yaml
services:
  mcp-server:
    build: ./mcp-server
    ports:
      - "3001:3000"  # REST API
      - "3002:3001"  # MCP Protocol
```

### Option 2: Chạy 2 container riêng biệt (Khuyến nghị production)

```bash
# Start REST API server (đã có)
docker compose -f docker-compose.mcp.yml up -d

# Start MCP Protocol server (mới)
docker compose -f docker-compose.mcp-protocol.yml up -d
```

Kiểm tra:

```bash
# REST API
curl http://localhost:3001/health
# => {"status":"healthy",...}

# MCP Protocol
curl http://localhost:3002/health
# => {"status":"healthy","protocol":"MCP",...}
```

### Option 3: Development (Local)

```bash
# Terminal 1: REST API
cd mcp-server
npm start

# Terminal 2: MCP Protocol
cd mcp-server
npm run mcp
```

## 🔧 Cấu hình n8n

### Cách 1: HTTP Request Node (Đơn giản)

**MarkItDown Conversion:**
```
URL: https://mcp.iconiclogs.com/api/markitdown/convert
Method: POST
Body: {"url": "...", "format": "pdf"}
```

### Cách 2: MCP Client Node (MCP Protocol)

**Cấu hình:**
```
Server URL: http://mcp-server:3001/sse
  (hoặc https://mcp-protocol.iconiclogs.com/sse nếu expose ra ngoài)

Server Transport: Server Sent Events

Authentication: None

Tools to Include: All
```

**Available Tools:**
- `convert_to_markdown` - Convert files to Markdown
- `scrape_url` - Scrape single URL
- `crawl_website` - Crawl entire website
- `ocr_image` - OCR text extraction
- `summarize_content` - AI summarization
- `translate_text` - AI translation
- `convert_markdown_to_pdf` - MD to PDF conversion

## 📡 Expose MCP Protocol ra internet

Nếu muốn dùng từ n8n cloud hoặc client bên ngoài:

### 1. aaPanel Proxy Project

```
Domain: mcp-protocol.iconiclogs.com
Target: http://127.0.0.1:3002
```

### 2. Nginx (nếu dùng)

```nginx
server {
    listen 443 ssl http2;
    server_name mcp-protocol.iconiclogs.com;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. Cloudflare Settings

- **SSL/TLS**: Full (not Flexible)
- **HTTP/2**: Enabled
- **WebSockets**: Enabled (quan trọng cho SSE)

## ✅ Testing

### Test local

```bash
# Health check
curl http://localhost:3002/health

# Test SSE connection (sẽ giữ kết nối mở)
curl -N http://localhost:3002/sse
```

### Test trong n8n

1. Tạo workflow mới
2. Thêm **MCP Client** node
3. Configure:
   - URL: `http://mcp-server:3001/sse` (nếu n8n cùng Docker network)
   - URL: `https://mcp-protocol.iconiclogs.com/sse` (nếu n8n cloud)
4. Click "Test" → Sẽ thấy danh sách tools

## 🔍 Troubleshooting

### Lỗi: "Could not connect to MCP server"

**Nguyên nhân:** SSE connection bị block

**Fix:**
1. Kiểm tra Cloudflare WebSocket setting
2. Thử tắt proxy (grey cloud) để test
3. Check logs: `docker logs mcp-protocol`

### Lỗi: "Error executing tool"

**Nguyên nhân:** REST API server (port 3000) không chạy

**Fix:**
```bash
docker ps | grep mcp-server  # Phải thấy container chạy
curl http://mcp-server:3000/health  # Test từ trong mcp-protocol container
```

## 📊 So sánh HTTP Request vs MCP Client

| Feature | HTTP Request | MCP Client |
|---------|-------------|------------|
| Setup | Đơn giản | Phức tạp hơn |
| Tools discovery | Manual | Automatic |
| Error handling | Chi tiết | Generic |
| Use case | Direct API calls | AI agent integration |
| Khuyến nghị | ✅ Workflow automation | ⚠️ Advanced use cases |

## 💡 Khi nào dùng MCP Protocol?

✅ **Nên dùng khi:**
- Tích hợp với Claude Desktop / AI assistants
- Cần dynamic tool discovery
- Follow chuẩn Model Context Protocol

❌ **Không cần dùng khi:**
- Chỉ làm n8n automation → Dùng HTTP Request node
- API đã rõ ràng → Direct REST call nhanh hơn

## 📝 Notes

- MCP Protocol server **không làm thay đổi** REST API hiện tại
- Có thể **tắt bất cứ lúc nào** bằng cách stop container `mcp-protocol`
- Code gốc **không bị ảnh hưởng**, tất cả logic trong file `mcp-server.js` riêng biệt
