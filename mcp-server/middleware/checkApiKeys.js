const config = require('../config');
const logger = require('../modules/common/logger');

/**
 * Middleware to check if required API keys are configured
 * Returns helpful error message if keys are missing
 */
const checkApiKeys = (req, res, next) => {
  const path = req.path;

  // Check OpenAI API key for AI features
  if (path.startsWith('/api/ai/summarize') ||
      path.startsWith('/api/ai/analyze')) {

    if (!config.ai.enabled) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'AI features are disabled',
        hint: 'Enable AI features in config and provide API keys'
      });
    }

    if (!config.ai.summarization.apiKey || config.ai.summarization.apiKey === 'test-key') {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'OpenAI API key not configured',
        hint: 'Set OPENAI_API_KEY environment variable',
        documentation: 'https://platform.openai.com/api-keys'
      });
    }
  }

  // Check translation API keys
  if (path.startsWith('/api/ai/translate')) {
    if (!config.ai.enabled || !config.ai.translation.enabled) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'Translation service is disabled',
        hint: 'Enable translation in config and provide API keys'
      });
    }

    const provider = req.body.provider || config.ai.translation.provider;

    if (provider === 'google' && !config.ai.translation.apiKey) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'Google Translate API key not configured',
        hint: 'Set GOOGLE_TRANSLATE_API_KEY environment variable or use OpenAI provider',
        documentation: 'https://cloud.google.com/translate/docs/setup'
      });
    }

    if (provider === 'openai' && !config.ai.summarization.apiKey) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'OpenAI API key not configured for translation',
        hint: 'Set OPENAI_API_KEY environment variable',
        documentation: 'https://platform.openai.com/api-keys'
      });
    }
  }

  // Check cloud storage keys
  if (req.body && req.body.uploadToCloud) {
    const provider = req.body.cloudProvider || 'auto';

    if (provider === 's3' || (provider === 'auto' && config.storage.s3.enabled)) {
      if (!config.storage.s3.accessKeyId || !config.storage.s3.secretAccessKey) {
        return res.status(503).json({
          error: 'Service Unavailable',
          message: 'AWS S3 credentials not configured',
          hint: 'Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables',
          documentation: 'https://docs.aws.amazon.com/general/latest/gr/aws-sec-cred-types.html'
        });
      }
    }

    if (provider === 'google-drive' || (provider === 'auto' && config.storage.googleDrive.enabled)) {
      if (!config.storage.googleDrive.credentials) {
        return res.status(503).json({
          error: 'Service Unavailable',
          message: 'Google Drive credentials not configured',
          hint: 'Set GOOGLE_DRIVE_CREDENTIALS environment variable',
          documentation: 'https://developers.google.com/drive/api/quickstart/nodejs'
        });
      }
    }
  }

  next();
};

module.exports = checkApiKeys;
