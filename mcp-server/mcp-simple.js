/**
 * MCP Protocol Server - Simplified version
 * Không dùng SSE transport phức tạp, chỉ dùng HTTP JSON-RPC
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

// Available tools definition
const TOOLS = [
  {
    name: 'convert_to_markdown',
    description: 'Convert PDF, DOCX, PPTX, XLSX, or images to Markdown using MarkItDown',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'File URL to convert' },
        format: { type: 'string', enum: ['pdf', 'docx', 'pptx', 'xlsx', 'image'] }
      },
      required: ['url']
    }
  },
  {
    name: 'scrape_url',
    description: 'Scrape single URL to Markdown using Firecrawl',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to scrape' },
        includeHtml: { type: 'boolean', description: 'Include HTML in response' }
      },
      required: ['url']
    }
  },
  {
    name: 'crawl_website',
    description: 'Crawl entire website to Markdown',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Website URL' },
        maxPages: { type: 'number', description: 'Max pages to crawl' }
      },
      required: ['url']
    }
  },
  {
    name: 'ocr_image',
    description: 'Extract text from image using OCR',
    inputSchema: {
      type: 'object',
      properties: {
        imageUrl: { type: 'string', description: 'Image URL' },
        language: { type: 'string', description: 'OCR language (eng, vie)' }
      },
      required: ['imageUrl']
    }
  },
  {
    name: 'summarize_content',
    description: 'AI content summarization',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Text to summarize' },
        maxLength: { type: 'number', description: 'Max summary length' }
      },
      required: ['content']
    }
  },
  {
    name: 'translate_text',
    description: 'AI text translation',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to translate' },
        targetLang: { type: 'string', description: 'Target language code' },
        sourceLang: { type: 'string', description: 'Source language (auto)' }
      },
      required: ['text', 'targetLang']
    }
  }
];

// Tool execution logic
async function executeTool(name, args) {
  try {
    let response;

    switch (name) {
      case 'convert_to_markdown':
        response = await axios.post(`${API_BASE_URL}/api/markitdown/convert`, args);
        return response.data.markdown || JSON.stringify(response.data);

      case 'scrape_url':
        response = await axios.post(`${API_BASE_URL}/api/firecrawl/scrape`, {
          url: args.url,
          formats: ['markdown'],
          includeHtml: args.includeHtml || false
        });
        return response.data.markdown || JSON.stringify(response.data);

      case 'crawl_website':
        response = await axios.post(`${API_BASE_URL}/api/firecrawl/crawl`, {
          url: args.url,
          maxPages: args.maxPages || 10,
          formats: ['markdown']
        });
        return JSON.stringify(response.data);

      case 'ocr_image':
        response = await axios.post(`${API_BASE_URL}/api/ai/ocr/image`, {
          imageUrl: args.imageUrl,
          language: args.language || 'eng'
        });
        return response.data.text || JSON.stringify(response.data);

      case 'summarize_content':
        response = await axios.post(`${API_BASE_URL}/api/ai/summarize`, {
          content: args.content,
          maxLength: args.maxLength || 200
        });
        return response.data.summary || JSON.stringify(response.data);

      case 'translate_text':
        response = await axios.post(`${API_BASE_URL}/api/ai/translate`, {
          text: args.text,
          targetLang: args.targetLang,
          sourceLang: args.sourceLang || 'auto'
        });
        return response.data.translation || JSON.stringify(response.data);

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    throw new Error(`Tool execution failed: ${error.response?.data?.error || error.message}`);
  }
}

// JSON-RPC endpoint
app.post('/rpc', async (req, res) => {
  const { jsonrpc, method, params, id } = req.body;

  try {
    let result;

    if (method === 'tools/list') {
      result = { tools: TOOLS };
    } else if (method === 'tools/call') {
      const { name, arguments: args } = params;
      const output = await executeTool(name, args);
      result = {
        content: [{ type: 'text', text: output }]
      };
    } else if (method === 'initialize') {
      result = {
        protocolVersion: '1.0',
        serverInfo: {
          name: 'iconic-mcp-server',
          version: '2.0.0'
        },
        capabilities: { tools: {} }
      };
    } else {
      throw new Error(`Unknown method: ${method}`);
    }

    res.json({ jsonrpc, result, id });
  } catch (error) {
    logger.error('MCP RPC error:', error.message);
    res.json({
      jsonrpc,
      error: {
        code: -32603,
        message: error.message
      },
      id
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    protocol: 'MCP-Simple',
    version: '2.0.0',
    transport: 'HTTP JSON-RPC',
    baseApiUrl: API_BASE_URL
  });
});

// Root
app.get('/', (req, res) => {
  res.json({
    name: 'MCP Protocol Server (Simplified)',
    version: '2.0.0',
    endpoints: {
      rpc: '/rpc',
      health: '/health'
    },
    usage: {
      listTools: {
        method: 'POST',
        url: '/rpc',
        body: {
          jsonrpc: '2.0',
          method: 'tools/list',
          id: 1
        }
      },
      callTool: {
        method: 'POST',
        url: '/rpc',
        body: {
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'scrape_url',
            arguments: { url: 'https://example.com' }
          },
          id: 2
        }
      }
    }
  });
});

// Start server
app.listen(MCP_PORT, '0.0.0.0', () => {
  logger.info('='.repeat(60));
  logger.info('🚀 MCP Protocol Server (Simplified) Started');
  logger.info('='.repeat(60));
  logger.info(`Port: ${MCP_PORT}`);
  logger.info(`JSON-RPC endpoint: http://localhost:${MCP_PORT}/rpc`);
  logger.info(`Health check: http://localhost:${MCP_PORT}/health`);
  logger.info(`API backend: ${API_BASE_URL}`);
  logger.info('='.repeat(60));
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down...');
  process.exit(0);
});
