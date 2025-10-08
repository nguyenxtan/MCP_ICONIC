# Nginx Setup for MCP Server (mcp.iconiclogs.com)

## 1. Tạo file cấu hình Nginx

```bash
sudo nano /etc/nginx/sites-available/mcp.iconiclogs.com
```

Paste nội dung sau:

```nginx
# MCP Server - mcp.iconiclogs.com
server {
    listen 80;
    listen [::]:80;
    server_name mcp.iconiclogs.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name mcp.iconiclogs.com;

    # SSL Certificate (sẽ được tạo bởi Certbot)
    ssl_certificate /etc/letsencrypt/live/mcp.iconiclogs.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mcp.iconiclogs.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Log files
    access_log /var/log/nginx/mcp-access.log;
    error_log /var/log/nginx/mcp-error.log;

    # Client body size (cho upload files lớn)
    client_max_body_size 100M;

    # Proxy settings
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts (cho các tác vụ xử lý lâu)
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        proxy_read_timeout 300;
        send_timeout 300;
    }

    # Health check endpoint (optional)
    location /health {
        access_log off;
        proxy_pass http://localhost:3001/health;
    }
}
```

## 2. Enable site và test cấu hình

```bash
# Tạo symbolic link
sudo ln -s /etc/nginx/sites-available/mcp.iconiclogs.com /etc/nginx/sites-enabled/

# Test cấu hình Nginx
sudo nginx -t

# Reload Nginx (chưa có SSL, sẽ fail, OK)
sudo systemctl reload nginx
```

## 3. Cài đặt SSL với Certbot

```bash
# Install Certbot (nếu chưa có)
sudo apt update
sudo apt install certbot python3-certbot-nginx -y

# Tạo SSL certificate
sudo certbot --nginx -d mcp.iconiclogs.com

# Certbot sẽ tự động:
# 1. Tạo SSL certificate
# 2. Cập nhật Nginx config
# 3. Setup auto-renewal
```

## 4. Kiểm tra DNS trước khi chạy Certbot

```bash
# Kiểm tra DNS đã trỏ đúng chưa
dig mcp.iconiclogs.com
nslookup mcp.iconiclogs.com

# Phải trỏ về IP của VPS
# Nếu chưa: Vào DNS provider (Cloudflare/NameCheap...) và tạo A record:
# Type: A
# Name: mcp
# Value: IP_CUA_VPS (ví dụ: 95.217.xxx.xxx)
# TTL: Auto hoặc 300
```

## 5. Deploy MCP Server

### Bước 1: Tạo file .env

```bash
cd /root/mcp-server/MCP_ICONIC
nano .env
```

Paste nội dung (thay YOUR_KEY bằng API key thực):

```env
# Server
NODE_ENV=production
PORT=3000
DEBUG=false

# AI Services (Optional - bỏ trống nếu không dùng)
OPENAI_API_KEY=sk-proj-YOUR_OPENAI_KEY
GOOGLE_TRANSLATE_API_KEY=YOUR_GOOGLE_TRANSLATE_KEY

# AWS S3 (Optional)
AWS_ACCESS_KEY_ID=YOUR_AWS_KEY
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name

# Google Drive (Optional)
GOOGLE_DRIVE_CLIENT_ID=YOUR_CLIENT_ID
GOOGLE_DRIVE_CLIENT_SECRET=YOUR_CLIENT_SECRET
GOOGLE_DRIVE_REDIRECT_URI=YOUR_REDIRECT_URI
GOOGLE_DRIVE_REFRESH_TOKEN=YOUR_REFRESH_TOKEN
```

### Bước 2: Chạy Docker Compose

```bash
# Stop container cũ nếu có
docker compose down

# Build và start container
docker compose up -d --build

# Kiểm tra logs
docker logs -f mcp-server

# Kiểm tra container đang chạy
docker ps | grep mcp-server
```

### Bước 3: Test kết nối

```bash
# Test local
curl http://localhost:3001/health

# Nếu OK, response:
# {"status":"ok","timestamp":"2025-10-08T..."}

# Test qua domain (sau khi setup SSL)
curl https://mcp.iconiclogs.com/health
```

## 6. Kết nối từ n8n

Trong n8n HTTP Request node, dùng URL:

```
https://mcp.iconiclogs.com/api/firecrawl/scrape
```

Hoặc nếu n8n cùng server:

```
http://mcp-server:3000/api/firecrawl/scrape
```

⚠️ **Lưu ý**: Phải đảm bảo n8n và mcp-server cùng Docker network để gọi bằng container name.

## 7. Kiểm tra network connection giữa n8n và MCP

```bash
# Liệt kê tất cả networks
docker network ls

# Kiểm tra network của n8n
docker inspect n8n_app | grep NetworkMode

# Nếu n8n dùng network khác (ví dụ: iconic_website_default)
# Cập nhật docker-compose.yml:
```

### Option 1: Kết nối vào network của n8n

Edit `docker-compose.yml`:

```yaml
networks:
  mcp-network:
    driver: bridge
  n8n-network:
    external: true
    name: iconic_website_default  # Hoặc network name thực tế của n8n
```

### Option 2: Tạo network chung cho tất cả services

```bash
# Tạo network chung
docker network create shared-network

# Kết nối n8n vào network này
docker network connect shared-network n8n_app

# Cập nhật docker-compose.yml của MCP
networks:
  shared-network:
    external: true
```

## 8. Troubleshooting

### Container không start

```bash
# Xem logs chi tiết
docker logs mcp-server --tail 100

# Kiểm tra port conflict
sudo netstat -tulpn | grep 3001
```

### Network error

```bash
# Xem network của container
docker inspect mcp-server | grep -A 10 Networks

# Nếu không thấy n8n-network, chạy lại:
docker compose down
docker compose up -d
```

### SSL không hoạt động

```bash
# Kiểm tra Nginx error log
sudo tail -f /var/log/nginx/mcp-error.log

# Test SSL
curl -I https://mcp.iconiclogs.com

# Renew SSL manually
sudo certbot renew --dry-run
```

### Không kết nối được từ n8n

```bash
# Test từ container n8n
docker exec n8n_app curl http://mcp-server:3000/health

# Nếu fail: n8n và mcp-server không cùng network
# Fix: Xem Option 2 ở trên
```

## 9. Monitoring & Maintenance

```bash
# Xem resource usage
docker stats mcp-server

# Xem logs real-time
docker logs -f mcp-server

# Restart container
docker restart mcp-server

# Update code và rebuild
cd /root/mcp-server/MCP_ICONIC
git pull origin main
docker compose up -d --build
```

## 10. URLs sau khi deploy

- **Public API**: `https://mcp.iconiclogs.com`
- **Health check**: `https://mcp.iconiclogs.com/health`
- **API docs**: `https://mcp.iconiclogs.com` (homepage)
- **Internal (từ n8n)**: `http://mcp-server:3000`

## Tóm tắt các bước

1. ✅ Setup DNS: `mcp.iconiclogs.com` → IP VPS
2. ✅ Tạo Nginx config: `/etc/nginx/sites-available/mcp.iconiclogs.com`
3. ✅ Enable site: `sudo ln -s ...`
4. ✅ Setup SSL: `sudo certbot --nginx -d mcp.iconiclogs.com`
5. ✅ Tạo `.env` file với API keys
6. ✅ Deploy: `docker compose up -d --build`
7. ✅ Test: `curl https://mcp.iconiclogs.com/health`
8. ✅ Config n8n: Dùng `https://mcp.iconiclogs.com` hoặc `http://mcp-server:3000`
