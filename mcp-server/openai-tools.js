/**
 * OpenAI Function Calling endpoint for n8n AI Agent
 * Compatible với OpenAI Assistant API format
 */

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const logger = require('./modules/common/logger');

const PORT = process.env.OPENAI_TOOLS_PORT || 3003;
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

const app = express();
app.use(cors());
app.use(express.json());

// Define tools theo OpenAI Function format
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'scrape_url',
      description: 'Scrape a webpage and convert it to clean markdown format',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'The URL of the webpage to scrape'
          }
        },
        required: ['url']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'convert_to_markdown',
      description: 'Convert PDF, DOCX, PPTX, or image files to markdown',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'URL of the file to convert'
          },
          format: {
            type: 'string',
            enum: ['pdf', 'docx', 'pptx', 'xlsx', 'image'],
            description: 'File format'
          }
        },
        required: ['url']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'summarize_text',
      description: 'Summarize long text content using AI',
      parameters: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            description: 'Text content to summarize'
          },
          maxLength: {
            type: 'number',
            description: 'Maximum length of summary (default: 200 words)'
          }
        },
        required: ['content']
      }
    }
  }
];

// Tool execution
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

// GET /tools - List available tools (OpenAI format)
app.get('/tools', (req, res) => {
  res.json({ tools: TOOLS });
});

// POST /execute - Execute a tool
app.post('/execute', async (req, res) => {
  const { name, arguments: args } = req.body;

  try {
    const result = await executeTool(name, args);
    res.json({ success: true, result });
  } catch (error) {
    logger.error('Tool execution error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    format: 'OpenAI Function Calling',
    toolsCount: TOOLS.length
  });
});

// Root
app.get('/', (req, res) => {
  res.json({
    name: 'OpenAI Tools API',
    description: 'Compatible với n8n AI Agent node',
    endpoints: {
      tools: 'GET /tools - List all available tools',
      execute: 'POST /execute - Execute a tool',
      health: 'GET /health - Health check'
    },
    usage: {
      listTools: {
        method: 'GET',
        url: '/tools'
      },
      executeTool: {
        method: 'POST',
        url: '/execute',
        body: {
          name: 'scrape_url',
          arguments: {
            url: 'https://example.com'
          }
        }
      }
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  logger.info('='.repeat(60));
  logger.info('🤖 OpenAI Tools API Started');
  logger.info('='.repeat(60));
  logger.info(`Port: ${PORT}`);
  logger.info(`Tools endpoint: http://localhost:${PORT}/tools`);
  logger.info(`Execute endpoint: http://localhost:${PORT}/execute`);
  logger.info(`Backend API: ${API_BASE_URL}`);
  logger.info(`Tools available: ${TOOLS.length}`);
  logger.info('='.repeat(60));
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down...');
  process.exit(0);
});
