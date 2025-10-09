/**
 * MCP Server with manual SSE implementation
 * Tương thích với n8n MCP Client Tool
 */

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const logger = require('./modules/common/logger');

const MCP_PORT = process.env.MCP_PORT || 3001;
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

const app = express();
app.use(cors());
app.use(express.json());

// Store active SSE connections
const connections = new Map();
let nextId = 1;

// Tools definition
const TOOLS = [
  {
    name: 'scrape_url',
    description: 'Scrape a webpage and convert to markdown format',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL of the webpage to scrape'
        }
      },
      required: ['url']
    }
  },
  {
    name: 'convert_to_markdown',
    description: 'Convert PDF, DOCX, PPTX files to markdown',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL of the file to convert'
        },
        format: {
          type: 'string',
          enum: ['pdf', 'docx', 'pptx', 'xlsx'],
          description: 'File format'
        }
      },
      required: ['url']
    }
  },
  {
    name: 'summarize_text',
    description: 'Summarize long text using AI',
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'Text content to summarize'
        },
        maxLength: {
          type: 'number',
          description: 'Maximum summary length in words'
        }
      },
      required: ['content']
    }
  }
];

// Execute tool
async function executeTool(name, args) {
  try {
    let response;

    switch (name) {
      case 'scrape_url':
        response = await axios.post(`${API_BASE_URL}/api/firecrawl/scrape`, {
          url: args.url,
          formats: ['markdown']
        });
        return response.data.markdown || JSON.stringify(response.data);

      case 'convert_to_markdown':
        response = await axios.post(`${API_BASE_URL}/api/markitdown/convert`, args);
        return response.data.markdown || JSON.stringify(response.data);

      case 'summarize_text':
        response = await axios.post(`${API_BASE_URL}/api/ai/summarize`, {
          content: args.content,
          maxLength: args.maxLength || 200
        });
        return response.data.summary || JSON.stringify(response.data);

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    throw new Error(`Tool execution failed: ${error.response?.data?.error || error.message}`);
  }
}

// Handle MCP requests
async function handleMCPRequest(message) {
  const { jsonrpc, method, params, id } = message;

  try {
    let result;

    if (method === 'initialize') {
      result = {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: {
          name: 'iconic-mcp-server',
          version: '2.0.0'
        }
      };
    } else if (method === 'tools/list') {
      result = { tools: TOOLS };
    } else if (method === 'tools/call') {
      const { name, arguments: args } = params;
      const output = await executeTool(name, args);
      result = {
        content: [
          {
            type: 'text',
            text: output
          }
        ]
      };
    } else {
      throw new Error(`Unknown method: ${method}`);
    }

    return {
      jsonrpc: '2.0',
      id,
      result
    };
  } catch (error) {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32603,
        message: error.message
      }
    };
  }
}

// SSE endpoint
app.get('/sse', (req, res) => {
  const connId = nextId++;

  logger.info(`SSE connection established: ${connId}`);

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering

  // Store connection
  connections.set(connId, res);

  // Send initial endpoint info
  res.write(`event: endpoint\n`);
  res.write(`data: ${JSON.stringify({ endpoint: '/message' })}\n\n`);

  // Keep-alive ping every 30 seconds
  const keepAlive = setInterval(() => {
    res.write(': ping\n\n');
  }, 30000);

  // Handle client disconnect
  req.on('close', () => {
    clearInterval(keepAlive);
    connections.delete(connId);
    logger.info(`SSE connection closed: ${connId}`);
  });
});

// Message endpoint (receive from client)
app.post('/message', async (req, res) => {
  const request = req.body;

  logger.info(`Received message: ${request.method}`);

  const response = await handleMCPRequest(request);

  // Send response via SSE to all connections
  const eventData = `data: ${JSON.stringify(response)}\n\n`;

  connections.forEach((conn, id) => {
    try {
      conn.write(eventData);
    } catch (err) {
      logger.error(`Failed to send to connection ${id}:`, err.message);
      connections.delete(id);
    }
  });

  res.status(202).json({ accepted: true });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    protocol: 'MCP',
    version: '2.0.0',
    transport: 'SSE (Manual)',
    activeConnections: connections.size,
    tools: TOOLS.length
  });
});

// Root
app.get('/', (req, res) => {
  res.json({
    name: 'MCP Server with SSE',
    version: '2.0.0',
    transport: 'Server-Sent Events',
    endpoints: {
      sse: '/sse - SSE connection endpoint',
      message: '/message - Send messages',
      health: '/health - Health check'
    },
    usage: {
      n8n: {
        tool: 'MCP Client Tool',
        url: 'http://mcp-server:3001/sse',
        transport: 'Server Sent Events'
      }
    }
  });
});

app.listen(MCP_PORT, '0.0.0.0', () => {
  logger.info('='.repeat(60));
  logger.info('🚀 MCP Server with SSE Transport Started');
  logger.info('='.repeat(60));
  logger.info(`Port: ${MCP_PORT}`);
  logger.info(`SSE endpoint: http://localhost:${MCP_PORT}/sse`);
  logger.info(`Message endpoint: http://localhost:${MCP_PORT}/message`);
  logger.info(`Health check: http://localhost:${MCP_PORT}/health`);
  logger.info(`Available tools: ${TOOLS.length}`);
  logger.info(`Backend API: ${API_BASE_URL}`);
  logger.info('='.repeat(60));
});

process.on('SIGTERM', () => {
  connections.forEach((conn) => conn.end());
  logger.info('SIGTERM received, shutting down...');
  process.exit(0);
});
