# Deployment Guide - MCP Server

Hướng dẫn deploy MCP Server lên production server.

## 📋 Prerequisites

### Server Requirements

**Minimum:**
- OS: Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- RAM: 2GB
- CPU: 2 cores
- Disk: 10GB
- Node.js: 18+
- Python: 3.8+

**Recommended:**
- RAM: 4GB
- CPU: 4 cores
- Disk: 20GB SSD

### Software Requirements

```bash
# Node.js 18+
node --version  # v18.x.x or higher

# Python 3.8+
python3 --version  # Python 3.8.x or higher

# PM2 (process manager)
npm install -g pm2

# Nginx (reverse proxy)
sudo apt install nginx
```

---

## 🚀 Deployment Options

### Option 1: Docker (Recommended)

**Ưu điểm:**
- Dễ setup
- Isolated environment
- Easy scaling
- Consistent across environments

**Nhược điểm:**
- Cần Docker installed
- Slightly more resource usage

### Option 2: PM2 (Node Process Manager)

**Ưu điểm:**
- Native performance
- Lower resource usage
- Better for single server

**Nhược điểm:**
- Manual dependency management
- Requires more configuration

### Option 3: Systemd

**Ưu điểm:**
- Native Linux service
- Auto-restart on boot
- System integration

**Nhược điểm:**
- Linux only
- More manual setup

---

## 🐳 Option 1: Docker Deployment

### 1. Install Docker

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose

# Add user to docker group
sudo usermod -aG docker $USER
```

### 2. Clone Repository

```bash
cd /opt
sudo git clone https://github.com/nguyenxtan/MCP_ICONIC.git
cd MCP_ICONIC/mcp-server
```

### 3. Create .env File

```bash
sudo nano .env
```

```bash
# Server Config
PORT=3000
NODE_ENV=production

# AI Features (Optional)
OPENAI_API_KEY=sk-proj-xxxxx

# Cloud Storage (Optional)
AWS_S3_ENABLED=false
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=

# Google Services (Optional)
GOOGLE_TRANSLATE_API_KEY=
GOOGLE_DRIVE_ENABLED=false
GOOGLE_DRIVE_CREDENTIALS=
```

### 4. Update docker-compose.yml

```yaml
version: '3.8'

services:
  mcp-server:
    build: ./mcp-server
    container_name: mcp-server
    restart: always
    ports:
      - "3000:3000"
    volumes:
      - ./mcp-server/uploads:/app/uploads
      - ./mcp-server/outputs:/app/outputs
    environment:
      - NODE_ENV=production
      - PORT=3000
    env_file:
      - ./mcp-server/.env
    networks:
      - mcp-network

  nginx:
    image: nginx:alpine
    container_name: mcp-nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - mcp-server
    networks:
      - mcp-network

networks:
  mcp-network:
    driver: bridge
```

### 5. Create Nginx Config

```bash
sudo nano nginx.conf
```

```nginx
events {
    worker_connections 1024;
}

http {
    upstream mcp_backend {
        server mcp-server:3000;
    }

    server {
        listen 80;
        server_name your-domain.com;

        # Redirect HTTP to HTTPS
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        # SSL certificates (comment out if not using SSL)
        # ssl_certificate /etc/nginx/ssl/cert.pem;
        # ssl_certificate_key /etc/nginx/ssl/key.pem;

        client_max_body_size 100M;

        location / {
            proxy_pass http://mcp_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # Timeouts for long-running requests
            proxy_connect_timeout 300s;
            proxy_send_timeout 300s;
            proxy_read_timeout 300s;
        }
    }
}
```

### 6. Deploy

```bash
# Build and start
sudo docker-compose up -d --build

# Check logs
sudo docker-compose logs -f mcp-server

# Check status
sudo docker-compose ps
```

### 7. Test Deployment

```bash
# Local test
curl http://localhost:3000

# External test
curl http://your-domain.com
```

---

## 🔧 Option 2: PM2 Deployment

### 1. Clone Repository

```bash
cd /opt
sudo git clone https://github.com/nguyenxtan/MCP_ICONIC.git
cd MCP_ICONIC/mcp-server
```

### 2. Install Dependencies

```bash
# Node.js dependencies
npm install --production

# Python dependencies
pip3 install markitdown

# Install Tesseract for OCR
sudo apt install tesseract-ocr
```

### 3. Create .env File

```bash
nano .env
```

(Same as Docker option above)

### 4. Create PM2 Ecosystem File

```bash
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'mcp-server',
    script: './server.js',
    instances: 2,  // Number of instances (CPU cores)
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    max_memory_restart: '1G',
    autorestart: true,
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'uploads', 'outputs'],
    exp_backoff_restart_delay: 100
  }]
};
```

### 5. Start with PM2

```bash
# Create logs directory
mkdir -p logs

# Start application
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Setup auto-start on boot
pm2 startup systemd
# Copy and run the command PM2 outputs

# Monitor
pm2 monit

# View logs
pm2 logs mcp-server
```

### 6. Setup Nginx Reverse Proxy

```bash
sudo nano /etc/nginx/sites-available/mcp-server
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    client_max_body_size 100M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/mcp-server /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## 🔒 SSL/HTTPS Setup (Let's Encrypt)

### Using Certbot

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo certbot renew --dry-run
```

### Manual SSL

```bash
# Copy your certificates
sudo mkdir -p /etc/nginx/ssl
sudo cp cert.pem /etc/nginx/ssl/
sudo cp key.pem /etc/nginx/ssl/
```

Update nginx config to use SSL (already in examples above).

---

## 🔥 Firewall Setup

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Check status
sudo ufw status
```

---

## 📊 Monitoring & Logs

### PM2 Monitoring

```bash
# Real-time monitoring
pm2 monit

# Process list
pm2 list

# Logs
pm2 logs mcp-server --lines 100

# Restart
pm2 restart mcp-server

# Stop
pm2 stop mcp-server
```

### Docker Monitoring

```bash
# Logs
docker-compose logs -f --tail=100 mcp-server

# Stats
docker stats mcp-server

# Restart
docker-compose restart mcp-server

# Stop
docker-compose down
```

### System Logs

```bash
# Nginx access log
sudo tail -f /var/log/nginx/access.log

# Nginx error log
sudo tail -f /var/log/nginx/error.log

# System log
sudo journalctl -u mcp-server -f
```

---

## 🔄 Updates & Maintenance

### Update Application

```bash
cd /opt/MCP_ICONIC

# Pull latest code
git pull origin main

# Docker deployment
cd mcp-server
docker-compose down
docker-compose up -d --build

# PM2 deployment
npm install --production
pm2 reload ecosystem.config.js
```

### Backup

```bash
# Backup uploads and outputs
tar -czf backup-$(date +%Y%m%d).tar.gz uploads outputs

# Backup .env
cp .env .env.backup

# Backup to remote
rsync -avz /opt/MCP_ICONIC user@backup-server:/backups/
```

---

## 🧪 Health Checks

### Manual Health Check

```bash
# Local
curl http://localhost:3000/health

# External
curl http://your-domain.com/health
```

### Automated Health Check (Uptime Robot)

1. Sign up at https://uptimerobot.com
2. Add monitor: `https://your-domain.com/health`
3. Set interval: 5 minutes
4. Get alerts via email/SMS/Slack

### PM2 Health Check

```bash
# Add to ecosystem.config.js
module.exports = {
  apps: [{
    // ... other config
    health_check: {
      url: 'http://localhost:3000/health',
      interval: 5000
    }
  }]
};
```

---

## 🐛 Troubleshooting

### Server won't start

```bash
# Check port availability
sudo netstat -tulpn | grep 3000

# Check logs
pm2 logs mcp-server --err
# or
docker-compose logs mcp-server

# Check permissions
ls -la /opt/MCP_ICONIC/mcp-server
```

### High memory usage

```bash
# Restart application
pm2 restart mcp-server

# Reduce PM2 instances
# Edit ecosystem.config.js: instances: 1

# Clear old files
cd /opt/MCP_ICONIC/mcp-server
rm -rf uploads/* outputs/*
```

### Nginx 502 Bad Gateway

```bash
# Check if MCP server is running
pm2 list
# or
docker ps

# Check Nginx config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### PDF generation fails

```bash
# Install Chromium (for Puppeteer)
sudo apt install chromium-browser

# Or use Docker (recommended)
```

---

## 📈 Performance Optimization

### 1. Enable Caching

Add to Nginx config:

```nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 2. Enable Gzip

Add to Nginx config:

```nginx
gzip on;
gzip_comp_level 6;
gzip_types text/plain text/css application/json application/javascript;
```

### 3. PM2 Cluster Mode

```javascript
// ecosystem.config.js
instances: 'max',  // Use all CPU cores
exec_mode: 'cluster'
```

### 4. Database Connection Pooling

If using database, configure connection pooling.

---

## 🔐 Security Best Practices

### 1. Environment Variables

```bash
# Never commit .env to git
echo ".env" >> .gitignore

# Use strong API keys
# Rotate keys regularly
```

### 2. Firewall

```bash
# Only allow necessary ports
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

### 3. Rate Limiting

Add to Nginx:

```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

location /api/ {
    limit_req zone=api burst=20;
}
```

### 4. Regular Updates

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Node.js packages
npm audit fix

# Update Docker images
docker-compose pull
```

---

## 📞 Support & Monitoring

### Set up Alerts

**Email Alerts:**
```bash
# Configure PM2 email alerts
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
```

**Slack Integration:**
- Use Uptime Robot
- Configure webhooks for PM2

**Error Tracking:**
- Sentry: https://sentry.io
- LogRocket: https://logrocket.com

---

## ✅ Post-Deployment Checklist

- [ ] MCP Server accessible at domain
- [ ] Health check endpoint responding
- [ ] SSL certificate installed and working
- [ ] Firewall configured
- [ ] PM2/Docker auto-restart enabled
- [ ] Logs rotation configured
- [ ] Backup strategy in place
- [ ] Monitoring/alerts setup
- [ ] API keys secured in .env
- [ ] Test all major endpoints
- [ ] n8n can connect to MCP server

---

## 🎯 Quick Commands Reference

```bash
# PM2
pm2 start ecosystem.config.js    # Start
pm2 stop mcp-server              # Stop
pm2 restart mcp-server           # Restart
pm2 logs mcp-server              # Logs
pm2 monit                        # Monitor

# Docker
docker-compose up -d             # Start
docker-compose down              # Stop
docker-compose restart           # Restart
docker-compose logs -f           # Logs

# Nginx
sudo systemctl start nginx       # Start
sudo systemctl stop nginx        # Stop
sudo systemctl reload nginx      # Reload
sudo nginx -t                    # Test config

# System
sudo systemctl status mcp-server
sudo journalctl -u mcp-server -f
htop
df -h
```

---

**Deployment Complete! 🚀**

Your MCP Server is now running in production!
