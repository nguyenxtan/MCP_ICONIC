const express = require('express');
const router = express.Router();
const config = require('../config');

/**
 * GET /health
 * Health check endpoint
 */
router.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    modules: {
      markitdown: config.markitdown.enabled,
      firecrawl: config.firecrawl.enabled
    }
  });
});

/**
 * GET /health/info
 * Server information
 */
router.get('/info', (req, res) => {
  res.json({
    name: 'MCP Server',
    version: '2.0.0',
    node: process.version,
    platform: process.platform,
    config: {
      maxFileSize: config.upload.maxFileSize,
      allowedTypes: config.upload.allowedTypes.length,
      modules: {
        markitdown: config.markitdown.enabled,
        firecrawl: config.firecrawl.enabled
      }
    }
  });
});

module.exports = router;