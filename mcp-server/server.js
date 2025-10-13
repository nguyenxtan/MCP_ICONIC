// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const config = require('./config');
const logger = require('./modules/common/logger');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const markitdownRoutes = require('./routes/markitdown.routes');
const firecrawlRoutes = require('./routes/firecrawl.routes');
const aiRoutes = require('./routes/ai.routes');
const conversionRoutes = require('./routes/conversion.routes');
const healthRoutes = require('./routes/health.routes');
const doclingRoutes = require('./routes/docling.routes');
const telegramRoutes = require('./routes/telegram.routes');

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'MCP Server',
    version: '2.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      markitdown: '/api/markitdown',
      firecrawl: '/api/firecrawl',
      ai: '/api/ai',
      conversion: '/api/conversion',
      templates: '/api/templates',
      batch: '/api/batch',
      qrcode: '/api/qrcode',
      cloud: '/api/cloud',
      docs: '/api/docs'
    },
    modules: {
      markitdown: {
        enabled: config.markitdown.enabled,
        endpoints: [
          'POST /api/markitdown/convert - Convert file to Markdown',
          'GET /api/markitdown/status/:jobId - Get job status',
          'GET /api/markitdown/jobs - Get all jobs',
          'GET /api/markitdown/download/:jobId - Download markdown file'
        ]
      },
      firecrawl: {
        enabled: config.firecrawl.enabled,
        endpoints: [
          'POST /api/firecrawl/scrape - Scrape single URL to Markdown',
          'POST /api/firecrawl/crawl - Crawl website to Markdown',
          'GET /api/firecrawl/status/:jobId - Get job status',
          'GET /api/firecrawl/jobs - Get all jobs',
          'GET /api/firecrawl/download/:jobId - Download markdown file'
        ]
      },
      ai: {
        enabled: config.ai.enabled,
        endpoints: [
          'POST /api/ai/ocr/image - OCR on image file',
          'POST /api/ai/ocr/pdf - OCR on PDF file',
          'POST /api/ai/summarize - Summarize content',
          'POST /api/ai/summarize/keypoints - Extract key points',
          'POST /api/ai/translate - Translate text',
          'GET /api/ai/translate/languages - Get supported languages',
          'POST /api/ai/analyze - Full content analysis',
          'POST /api/ai/analyze/sentiment - Sentiment analysis',
          'POST /api/ai/analyze/keywords - Extract keywords',
          'POST /api/ai/analyze/entities - Extract entities',
          'POST /api/ai/analyze/topics - Classify topics',
          'POST /api/ai/analyze/stats - Reading statistics'
        ]
      },
      conversion: {
        enabled: config.conversion.enabled,
        endpoints: [
          'POST /api/conversion/md-to-html - Convert Markdown to HTML',
          'POST /api/conversion/md-to-pdf - Convert Markdown to PDF',
          'POST /api/conversion/md-to-docx - Convert Markdown to DOCX',
          'GET /api/conversion/download/:filename - Download converted file'
        ]
      },
      templates: {
        enabled: config.templates.enabled,
        endpoints: [
          'GET /api/templates - List all templates',
          'GET /api/templates/:name - Get template content',
          'POST /api/templates/render - Render template with data',
          'POST /api/templates - Create custom template',
          'DELETE /api/templates/:name - Delete template'
        ]
      },
      batch: {
        enabled: config.batch.enabled,
        endpoints: [
          'POST /api/batch/convert - Batch convert files',
          'GET /api/batch/status/:jobId - Get batch job status',
          'GET /api/batch/download/:jobId - Download batch results as ZIP',
          'GET /api/batch/jobs - List all batch jobs'
        ]
      },
      qrcode: {
        enabled: config.qrcode.enabled,
        endpoints: [
          'POST /api/qrcode/generate - Generate QR code'
        ]
      },
      cloud: {
        enabled: config.storage.s3.enabled || config.storage.googleDrive.enabled,
        endpoints: [
          'GET /api/cloud/providers - Get available cloud storage providers'
        ]
      }
    }
  });
});

// API Routes
app.use('/health', healthRoutes);
app.use('/api/markitdown', markitdownRoutes);
app.use('/api/firecrawl', firecrawlRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/conversion', conversionRoutes);
app.use('/api/templates', conversionRoutes);
app.use('/api/batch', conversionRoutes);
app.use('/api/qrcode', conversionRoutes);
app.use('/api/cloud', conversionRoutes);
app.use('/api/docling', doclingRoutes);
app.use('/api/telegram', telegramRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    availableEndpoints: [
      '/',
      '/health',
      '/api/markitdown/convert',
      '/api/markitdown/status/:jobId',
      '/api/markitdown/jobs',
      '/api/firecrawl/scrape',
      '/api/firecrawl/crawl',
      '/api/firecrawl/status/:jobId',
      '/api/firecrawl/jobs'
    ]
  });
});

// Error handler (phải để cuối cùng)
app.use(errorHandler);

// Start server
const PORT = config.port;
const HOST = config.host;

app.listen(PORT, HOST, () => {
  logger.info(`MCP Server started successfully`);
  logger.info(`Server running at http://localhost:${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info('');
  logger.info('Available modules:');
  logger.info(`  - MarkItDown: ${config.markitdown.enabled ? 'ENABLED' : 'DISABLED'}`);
  logger.info(`  - Firecrawl: ${config.firecrawl.enabled ? 'ENABLED' : 'DISABLED'}`);
  logger.info('');
  logger.info('Ready to accept requests! 🚀');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  app.close(() => {
    logger.info('HTTP server closed');
  });
});