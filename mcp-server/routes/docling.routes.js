/**
 * Docling API Routes
 * Endpoints for IBM Docling document conversion
 */

const express = require('express');
const router = express.Router();
const docling = require('../modules/docling');
const logger = require('../modules/common/logger');

/**
 * POST /api/docling/convert
 * Convert document to Markdown using Docling
 */
router.post('/convert', async (req, res) => {
  const startTime = Date.now();
  const { url, useVLM, vlmModel, ocr } = req.body;

  // Input validation
  if (!url) {
    return res.status(400).json({
      error: 'Missing required parameter: url',
      usage: {
        url: 'Document URL or file path (required)',
        useVLM: 'Use Visual Language Model for better accuracy (optional, boolean)',
        vlmModel: 'VLM model name (optional, default: granite_docling)',
        ocr: 'Enable OCR for images (optional, default: true)'
      }
    });
  }

  logger.info('POST /api/docling/convert', {
    ip: req.ip,
    userAgent: req.get('user-agent'),
    url,
    useVLM,
    vlmModel
  });

  try {
    const result = await docling.convertToMarkdown(url, {
      useVLM,
      vlmModel,
      ocr
    });

    const duration = Date.now() - startTime;

    res.json({
      success: true,
      markdown: result.markdown,
      metadata: {
        ...result.metadata,
        totalDuration: duration
      }
    });

  } catch (error) {
    logger.error('Docling conversion error', {
      url,
      error: error.message
    });

    res.status(500).json({
      error: 'Docling conversion failed',
      message: error.message,
      details: error.toString()
    });
  }
});

/**
 * POST /api/docling/convert-api
 * Convert using Python API (alternative method)
 */
router.post('/convert-api', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({
      error: 'Missing required parameter: url'
    });
  }

  logger.info('POST /api/docling/convert-api', {
    ip: req.ip,
    url
  });

  try {
    const result = await docling.convertWithPythonAPI(url);
    res.json(result);
  } catch (error) {
    logger.error('Docling Python API error', { error: error.message });
    res.status(500).json({
      error: 'Conversion failed',
      message: error.message
    });
  }
});

/**
 * POST /api/docling/transcribe
 * Transcribe audio file to text using ASR
 */
router.post('/transcribe', async (req, res) => {
  const startTime = Date.now();
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({
      error: 'Missing required parameter: url',
      usage: {
        url: 'Audio file URL or path (WAV, MP3, etc.)'
      }
    });
  }

  logger.info('POST /api/docling/transcribe', {
    ip: req.ip,
    url
  });

  try {
    const result = await docling.transcribeAudio(url);

    const duration = Date.now() - startTime;

    res.json({
      success: true,
      transcript: result.transcript,
      metadata: {
        ...result.metadata,
        totalDuration: duration
      }
    });

  } catch (error) {
    logger.error('Audio transcription error', {
      url,
      error: error.message
    });

    res.status(500).json({
      error: 'Audio transcription failed',
      message: error.message
    });
  }
});

/**
 * POST /api/docling/extract-images
 * Extract images from PDF document
 */
router.post('/extract-images', async (req, res) => {
  const startTime = Date.now();
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({
      error: 'Missing required parameter: url',
      usage: {
        url: 'PDF document URL or file path'
      }
    });
  }

  logger.info('POST /api/docling/extract-images', {
    ip: req.ip,
    url
  });

  try {
    const result = await docling.extractImages(url);

    const duration = Date.now() - startTime;

    res.json({
      success: true,
      images: result.images,
      imageCount: result.imageCount,
      outputDir: result.outputDir,
      metadata: {
        ...result.metadata,
        totalDuration: duration
      }
    });

  } catch (error) {
    logger.error('Image extraction error', {
      url,
      error: error.message
    });

    res.status(500).json({
      error: 'Image extraction failed',
      message: error.message
    });
  }
});

/**
 * GET /api/docling/status
 * Check Docling availability
 */
router.get('/status', async (req, res) => {
  logger.info('GET /api/docling/status', {
    ip: req.ip
  });

  res.json({
    available: docling.isAvailable,
    engine: 'IBM Docling',
    version: 'latest',
    capabilities: {
      formats: ['PDF', 'DOCX', 'PPTX', 'XLSX', 'HTML', 'Images', 'Audio (WAV, MP3)'],
      features: [
        'Advanced layout understanding',
        'Table extraction',
        'Formula recognition',
        'Code block detection',
        'Visual Language Model support',
        'OCR capabilities',
        'Audio transcription (ASR)',
        'Image extraction from PDFs'
      ]
    },
    endpoints: {
      convert: 'POST /api/docling/convert - Convert documents to Markdown',
      transcribe: 'POST /api/docling/transcribe - Transcribe audio to text',
      extractImages: 'POST /api/docling/extract-images - Extract images from PDF',
      status: 'GET /api/docling/status - Check service status'
    }
  });
});

module.exports = router;
