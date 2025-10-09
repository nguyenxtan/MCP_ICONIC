# 🚀 Script Deploy MCP Server trên VPS

Copy-paste từng block vào terminal VPS.

---

## 📦 Option 1: Deploy REST API only (như hiện tại)

```bash
cd ~/mcp-server/MCP_ICONIC

# Pull code mới
git pull origin main

# Rebuild container
docker compose down
docker compose build --no-cache
docker compose up -d

# Check logs
docker logs -f mcp-server
```

**Kết quả:** REST API chạy trên port 3001

---

## 🎯 Option 2: Deploy REST API + MCP Protocol (Khuyến nghị)

### Cách A: Chạy cả 2 trong 1 container (Đơn giản)

```bash
cd ~/mcp-server/MCP_ICONIC

# 1. Update Dockerfile
cat > mcp-server/Dockerfile.new <<'EOF'
FROM node:20-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    py3-pip \
    curl \
    wget

# Install Python packages
RUN pip3 install --break-system-packages markitdown

# Copy package files
COPY package*.json ./

# Install Node dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Expose ports
EXPOSE 3000 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start both REST API and MCP Protocol
CMD ["sh", "-c", "node server.js & node mcp-simple.js"]
EOF

# Backup Dockerfile cũ và dùng file mới
mv mcp-server/Dockerfile mcp-server/Dockerfile.bak
mv mcp-server/Dockerfile.new mcp-server/Dockerfile

# 2. Update docker-compose.yml để expose port 3001 cho MCP
cat > docker-compose.yml <<'EOF'
version: '3.8'

services:
  mcp-server:
    build: ./mcp-server
    container_name: mcp-server
    restart: always
    ports:
      - "3001:3000"  # REST API
      - "3002:3001"  # MCP Protocol
    volumes:
      - ./mcp-server/uploads:/app/uploads
      - ./mcp-server/outputs:/app/outputs
      - ./mcp-server/.env:/app/.env
    environment:
      - NODE_ENV=production
      - DEBUG=false
      - API_BASE_URL=http://localhost:3000
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 20s
    networks:
      - iconic_net

networks:
  iconic_net:
    external: true
EOF

# 3. Rebuild và deploy
docker compose down
docker compose build --no-cache
docker compose up -d

# 4. Check logs
docker logs -f mcp-server
```

**Kết quả:**
- REST API: port 3001 (`https://mcp.iconiclogs.com`)
- MCP Protocol: port 3002 (chưa expose ra ngoài)

---

### Cách B: Chạy 2 container riêng (Production)

```bash
cd ~/mcp-server/MCP_ICONIC

# 1. Pull code mới
git pull origin main

# 2. Build cả 2 containers
docker compose down
docker compose build --no-cache
docker compose -f docker-compose.mcp-protocol.yml build --no-cache

# 3. Start REST API container
docker compose up -d

# 4. Start MCP Protocol container
docker compose -f docker-compose.mcp-protocol.yml up -d

# 5. Check containers
docker ps | grep mcp

# 6. Check logs
docker logs mcp-server
docker logs mcp-protocol
```

**Kết quả:**
- REST API: port 3001
- MCP Protocol: port 3002

---

## ✅ Verify Deployment

```bash
# Test REST API
curl http://localhost:3000/health
curl http://localhost:3001/health  # Từ host

# Test MCP Protocol (nếu deploy)
curl http://localhost:3001/health  # Trong container
curl http://localhost:3002/health  # Từ host

# Test JSON-RPC endpoint
curl -X POST http://localhost:3002/rpc \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}' \
  | python3 -m json.tool
```

---

## 🌐 Expose MCP Protocol ra ngoài Internet

### Option A: aaPanel Proxy (Khuyến nghị)

1. Vào aaPanel → Website → Add Proxy Project
2. Cấu hình:
   ```
   Domain: mcp-protocol.iconiclogs.com
   Target: http://127.0.0.1:3002
   Cache: Disable
   WebSocket: Enable
   ```
3. Add SSL certificate (Let's Encrypt)

### Option B: Nginx manual

```bash
cat > /etc/nginx/sites-available/mcp-protocol <<'EOF'
server {
    listen 80;
    server_name mcp-protocol.iconiclogs.com;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

ln -s /etc/nginx/sites-available/mcp-protocol /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

# Add SSL
certbot --nginx -d mcp-protocol.iconiclogs.com
```

---

## 🔧 Troubleshooting

### Lỗi: Port 3002 already in use

```bash
# Tìm process đang dùng port
lsof -i :3002

# Kill process
kill -9 <PID>
```

### Logs không hiện gì

```bash
# Check container status
docker ps -a | grep mcp

# Restart container
docker restart mcp-server

# View all logs
docker logs --tail 100 mcp-server
```

### MCP Protocol không hoạt động

```bash
# Vào trong container
docker exec -it mcp-server sh

# Test trong container
curl http://localhost:3001/health
node mcp-simple.js  # Test chạy trực tiếp

# Check biến môi trường
env | grep API_BASE_URL
```

---

## 📊 Monitoring

```bash
# Real-time logs
docker logs -f mcp-server

# Resource usage
docker stats mcp-server

# Container info
docker inspect mcp-server
```
