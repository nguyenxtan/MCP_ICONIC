#!/bin/bash

# Script để kết nối MCP Server với n8n network
# Chạy script này sau khi deploy MCP Server

echo "🔍 Đang tìm n8n container và network..."

# Tìm container n8n
N8N_CONTAINER=$(docker ps --filter "ancestor=n8nio/n8n:latest" --format "{{.Names}}" | head -1)

if [ -z "$N8N_CONTAINER" ]; then
    echo "❌ Không tìm thấy n8n container đang chạy"
    echo "Các container đang chạy:"
    docker ps --format "table {{.Names}}\t{{.Image}}"
    exit 1
fi

echo "✅ Tìm thấy n8n container: $N8N_CONTAINER"

# Lấy network của n8n
N8N_NETWORK=$(docker inspect $N8N_CONTAINER | grep -oP '"NetworkMode": "\K[^"]+' | head -1)

if [ -z "$N8N_NETWORK" ]; then
    echo "❌ Không lấy được network của n8n"
    exit 1
fi

echo "✅ n8n đang dùng network: $N8N_NETWORK"

# Kiểm tra MCP container có tồn tại không
if ! docker ps -a --format "{{.Names}}" | grep -q "^mcp-server$"; then
    echo "❌ MCP Server container chưa được tạo"
    echo "Chạy: docker compose up -d --build"
    exit 1
fi

# Kiểm tra MCP đã kết nối vào n8n network chưa
MCP_NETWORKS=$(docker inspect mcp-server | grep -oP '"NetworkID": "\K[^"]+')
N8N_NETWORK_ID=$(docker network inspect $N8N_NETWORK | grep -oP '"Id": "\K[^"]+' | head -1)

if echo "$MCP_NETWORKS" | grep -q "$N8N_NETWORK_ID"; then
    echo "✅ MCP Server đã kết nối với n8n network"
else
    echo "🔗 Đang kết nối MCP Server vào network: $N8N_NETWORK"
    docker network connect $N8N_NETWORK mcp-server

    if [ $? -eq 0 ]; then
        echo "✅ Kết nối thành công!"
    else
        echo "❌ Kết nối thất bại"
        exit 1
    fi
fi

echo ""
echo "📋 Thông tin kết nối:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "MCP Container:  mcp-server"
echo "n8n Container:  $N8N_CONTAINER"
echo "Shared Network: $N8N_NETWORK"
echo ""
echo "✅ Bây giờ n8n có thể gọi MCP qua:"
echo "   http://mcp-server:3000"
echo ""
echo "Hoặc từ bên ngoài:"
echo "   https://mcp.iconiclogs.com"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test kết nối
echo "🧪 Test kết nối từ n8n container..."
TEST_RESULT=$(docker exec $N8N_CONTAINER wget -qO- http://mcp-server:3000/health 2>&1)

if echo "$TEST_RESULT" | grep -q "ok"; then
    echo "✅ Kết nối thành công! MCP Server đang hoạt động"
    echo "$TEST_RESULT"
else
    echo "⚠️  Không kết nối được. MCP Server có thể chưa sẵn sàng"
    echo "Kiểm tra logs: docker logs mcp-server"
fi
