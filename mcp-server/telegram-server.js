const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const config = require('./config');
const logger = require('./modules/common/logger');

// Import Telegram routes
const telegramRoutes = require('./routes/telegram.routes');

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`[TELEGRAM] ${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'MCP Telegram Bot Server',
    version: '2.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      webhook: '/api/telegram/webhook',
      botInfo: '/api/telegram/bot-info',
      setupWebhook: '/api/telegram/setup-webhook',
      deleteWebhook: '/api/telegram/delete-webhook'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'telegram-bot',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

// Telegram routes
app.use('/api/telegram', telegramRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    availableEndpoints: [
      '/',
      '/health',
      '/api/telegram/webhook',
      '/api/telegram/bot-info',
      '/api/telegram/setup-webhook',
      '/api/telegram/delete-webhook'
    ]
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
const PORT = process.env.TELEGRAM_PORT || 3003;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  logger.info('============================================================');
  logger.info('🤖 MCP Telegram Bot Server Started');
  logger.info('============================================================');
  logger.info(`Port: ${PORT}`);
  logger.info(`Server: http://localhost:${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`Bot Token: ${config.telegram.botToken ? '✅ Configured' : '❌ Not configured'}`);
  logger.info('============================================================');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});
