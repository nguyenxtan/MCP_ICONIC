const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const config = require('./config');
const logger = require('./modules/common/logger');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const markitdownRoutes = require('./routes/markitdown.routes');
const healthRoutes = require('./routes/health.routes');

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
        status: 'Coming soon...'
      }
    }
  });
});

// API Routes
app.use('/health', healthRoutes);
app.use('/api/markitdown', markitdownRoutes);

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
      '/api/markitdown/jobs'
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