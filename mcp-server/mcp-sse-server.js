/**
 * MCP Server with SSE Transport
 * Compatible với n8n MCP Client Tool node
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { SSEServerTransport } = require('@modelcontextprotocol/sdk/server/sse.js');
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const logger = require('./modules/common/logger');

const MCP_PORT = process.env.MCP_PORT || 3001;
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// Create MCP Server
const server = new Server(
  {
    name: 'iconic-mcp-server',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define tools
const tools = [
  {
    name: 'scrape_url',
    description: 'Scrape a webpage and convert to markdown',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to scrape' }
      },
      required: ['url']
    }
  },
  {
    name: 'convert_to_markdown',
    description: 'Convert PDF/DOCX/PPTX to markdown',
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
    name: 'summarize_text',
    description: 'Summarize text using AI',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Text to summarize' }
      },
      required: ['content']
    }
  }
];

// Register handlers
server.setRequestHandler({
  method: 'tools/list'
}, async () => ({ tools }));

server.setRequestHandler({
  method: 'tools/call'
}, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let response;

    if (name === 'scrape_url') {
      response = await axios.post(`${API_BASE_URL}/api/firecrawl/scrape`, {
        url: args.url,
        formats: ['markdown']
      });
      return {
        content: [{ type: 'text', text: response.data.markdown }]
      };
    }

    if (name === 'convert_to_markdown') {
      response = await axios.post(`${API_BASE_URL}/api/markitdown/convert`, args);
      return {
        content: [{ type: 'text', text: response.data.markdown }]
      };
    }

    if (name === 'summarize_text') {
      response = await axios.post(`${API_BASE_URL}/api/ai/summarize`, args);
      return {
        content: [{ type: 'text', text: response.data.summary }]
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    logger.error('Tool error:', error.message);
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true
    };
  }
});

// Express app
const app = express();
app.use(cors());
app.use(express.json());

// SSE endpoint
app.get('/sse', async (req, res) => {
  logger.info('SSE connection established');

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const transport = new SSEServerTransport('/message', res);
  await server.connect(transport);

  req.on('close', () => {
    logger.info('SSE connection closed');
  });
});

// Message endpoint
app.post('/message', express.json(), async (req, res) => {
  res.status(200).end();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    protocol: 'MCP with SSE',
    version: '2.0.0',
    transport: 'SSE'
  });
});

app.listen(MCP_PORT, '0.0.0.0', () => {
  logger.info('='.repeat(60));
  logger.info('🚀 MCP Server with SSE Transport Started');
  logger.info('='.repeat(60));
  logger.info(`Port: ${MCP_PORT}`);
  logger.info(`SSE endpoint: http://localhost:${MCP_PORT}/sse`);
  logger.info(`Health: http://localhost:${MCP_PORT}/health`);
  logger.info(`Tools: ${tools.length}`);
  logger.info('='.repeat(60));
});
