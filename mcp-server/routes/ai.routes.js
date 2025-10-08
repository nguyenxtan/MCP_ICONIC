const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const ocrService = require('../modules/ai/ocr.service');
const summarizationService = require('../modules/ai/summarization.service');
const translationService = require('../modules/ai/translation.service');
const analysisService = require('../modules/ai/analysis.service');
const logger = require('../modules/common/logger');
const config = require('../config');
const checkApiKeys = require('../middleware/checkApiKeys');

// Configure multer for file uploads
const upload = multer({
  dest: config.uploadsDir,
  limits: {
    fileSize: config.upload.maxFileSize
  }
});

/**
 * POST /api/ai/ocr/image
 * Perform OCR on an image file
 */
router.post('/ocr/image', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No file uploaded'
      });
    }

    const { language = 'eng' } = req.body;

    logger.info('OCR image request', {
      filename: req.file.originalname,
      language
    });

    const result = await ocrService.extractTextFromImage(req.file.path, {
      language
    });

    res.json({
      success: true,
      filename: req.file.originalname,
      text: result.text,
      confidence: result.confidence,
      words: result.words,
      lines: result.lines
    });

  } catch (error) {
    logger.error('OCR image error:', error);
    next(error);
  }
});

/**
 * POST /api/ai/ocr/pdf
 * Perform OCR on a PDF file (scanned)
 */
router.post('/ocr/pdf', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No file uploaded'
      });
    }

    const { language = 'eng' } = req.body;

    logger.info('OCR PDF request', {
      filename: req.file.originalname,
      language
    });

    const result = await ocrService.extractTextFromPDF(req.file.path, {
      language
    });

    res.json({
      success: true,
      filename: req.file.originalname,
      text: result.text,
      pages: result.pages,
      confidence: result.confidence,
      pageResults: result.pageResults
    });

  } catch (error) {
    logger.error('OCR PDF error:', error);
    next(error);
  }
});

/**
 * POST /api/ai/summarize
 * Summarize text/markdown content
 */
router.post('/summarize', checkApiKeys, async (req, res, next) => {
  try {
    const { content, maxLength, style, language } = req.body;

    if (!content) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Content is required'
      });
    }

    logger.info('Summarization request', {
      contentLength: content.length,
      maxLength,
      style
    });

    const result = await summarizationService.summarize(content, {
      maxLength,
      style,
      language
    });

    res.json({
      success: true,
      summary: result.summary,
      originalLength: result.originalLength,
      summaryLength: result.summaryLength,
      tokensUsed: result.tokensUsed,
      model: result.model
    });

  } catch (error) {
    logger.error('Summarization error:', error);
    next(error);
  }
});

/**
 * POST /api/ai/summarize/keypoints
 * Extract key points from content
 */
router.post('/summarize/keypoints', async (req, res, next) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Content is required'
      });
    }

    logger.info('Key points extraction request', {
      contentLength: content.length
    });

    const result = await summarizationService.extractKeyPoints(content);

    res.json({
      success: true,
      keyPoints: result.keyPoints,
      count: result.keyPoints.length,
      tokensUsed: result.tokensUsed
    });

  } catch (error) {
    logger.error('Key points extraction error:', error);
    next(error);
  }
});

/**
 * POST /api/ai/translate
 * Translate text to target language
 */
router.post('/translate', async (req, res, next) => {
  try {
    const { text, targetLang, sourceLang, preserveFormatting, provider } = req.body;

    if (!text) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Text is required'
      });
    }

    if (!targetLang) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Target language is required'
      });
    }

    logger.info('Translation request', {
      textLength: text.length,
      targetLang,
      sourceLang
    });

    const result = await translationService.translate(text, targetLang, {
      sourceLang,
      preserveFormatting,
      provider
    });

    res.json({
      success: true,
      translatedText: result.translatedText,
      detectedSourceLang: result.detectedSourceLang,
      provider: result.provider,
      tokensUsed: result.tokensUsed
    });

  } catch (error) {
    logger.error('Translation error:', error);
    next(error);
  }
});

/**
 * GET /api/ai/translate/languages
 * Get list of supported languages
 */
router.get('/translate/languages', (req, res) => {
  const languages = translationService.getSupportedLanguages();

  res.json({
    success: true,
    languages,
    count: languages.length
  });
});

/**
 * POST /api/ai/analyze
 * Comprehensive content analysis
 */
router.post('/analyze', async (req, res, next) => {
  try {
    const { content, features } = req.body;

    if (!content) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Content is required'
      });
    }

    logger.info('Content analysis request', {
      contentLength: content.length,
      features
    });

    const result = await analysisService.analyze(content, { features });

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    logger.error('Content analysis error:', error);
    next(error);
  }
});

/**
 * POST /api/ai/analyze/sentiment
 * Sentiment analysis only
 */
router.post('/analyze/sentiment', async (req, res, next) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Content is required'
      });
    }

    const result = await analysisService.analyzeSentiment(content);

    res.json({
      success: true,
      sentiment: result.sentiment,
      tokensUsed: result.tokensUsed
    });

  } catch (error) {
    logger.error('Sentiment analysis error:', error);
    next(error);
  }
});

/**
 * POST /api/ai/analyze/keywords
 * Extract keywords only
 */
router.post('/analyze/keywords', async (req, res, next) => {
  try {
    const { content, limit } = req.body;

    if (!content) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Content is required'
      });
    }

    const result = await analysisService.extractKeywords(content, limit);

    res.json({
      success: true,
      keywords: result.keywords,
      tokensUsed: result.tokensUsed
    });

  } catch (error) {
    logger.error('Keyword extraction error:', error);
    next(error);
  }
});

/**
 * POST /api/ai/analyze/entities
 * Extract named entities only
 */
router.post('/analyze/entities', async (req, res, next) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Content is required'
      });
    }

    const result = await analysisService.extractEntities(content);

    res.json({
      success: true,
      entities: result.entities,
      tokensUsed: result.tokensUsed
    });

  } catch (error) {
    logger.error('Entity extraction error:', error);
    next(error);
  }
});

/**
 * POST /api/ai/analyze/topics
 * Classify topics only
 */
router.post('/analyze/topics', async (req, res, next) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Content is required'
      });
    }

    const result = await analysisService.classifyTopics(content);

    res.json({
      success: true,
      topics: result.topics,
      tokensUsed: result.tokensUsed
    });

  } catch (error) {
    logger.error('Topic classification error:', error);
    next(error);
  }
});

/**
 * POST /api/ai/analyze/stats
 * Get reading statistics
 */
router.post('/analyze/stats', (req, res, next) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Content is required'
      });
    }

    const stats = analysisService.getReadingStats(content);

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    logger.error('Reading stats error:', error);
    next(error);
  }
});

module.exports = router;
