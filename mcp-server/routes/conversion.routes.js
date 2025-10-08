const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const converterService = require('../modules/conversion/converter.service');
const templateService = require('../modules/templates/template.service');
const batchService = require('../modules/batch/batch.service');
const cloudService = require('../modules/storage/cloud.service');
const qrcodeService = require('../modules/utils/qrcode.service');
const logger = require('../modules/common/logger');
const config = require('../config');

// Configure multer
const upload = multer({
  dest: config.uploadsDir,
  limits: { fileSize: config.upload.maxFileSize }
});

/**
 * POST /api/conversion/md-to-html
 * Convert Markdown to HTML
 */
router.post('/md-to-html', async (req, res, next) => {
  try {
    const { markdown, theme, includeCSS, sanitize } = req.body;

    if (!markdown) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Markdown content is required'
      });
    }

    const html = await converterService.markdownToHTML(markdown, {
      theme,
      includeCSS,
      sanitize
    });

    res.json({
      success: true,
      html,
      length: html.length
    });

  } catch (error) {
    logger.error('MD to HTML conversion error:', error);
    next(error);
  }
});

/**
 * POST /api/conversion/md-to-pdf
 * Convert Markdown to PDF
 */
router.post('/md-to-pdf', async (req, res, next) => {
  try {
    const { markdown, theme, format, margin, uploadToCloud, cloudProvider } = req.body;

    if (!markdown) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Markdown content is required'
      });
    }

    const filename = `${uuidv4()}.pdf`;
    const outputPath = path.join(config.outputsDir, filename);

    await converterService.markdownToPDF(markdown, outputPath, {
      theme,
      format,
      margin
    });

    // Upload to cloud if requested
    let cloudResult = null;
    if (uploadToCloud) {
      cloudResult = await cloudService.upload(outputPath, filename, {
        provider: cloudProvider || 'auto'
      });
    }

    res.json({
      success: true,
      filename,
      outputPath,
      cloud: cloudResult,
      message: 'PDF generated successfully'
    });

  } catch (error) {
    logger.error('MD to PDF conversion error:', error);
    next(error);
  }
});

/**
 * POST /api/conversion/md-to-docx
 * Convert Markdown to DOCX
 */
router.post('/md-to-docx', async (req, res, next) => {
  try {
    const { markdown, uploadToCloud, cloudProvider } = req.body;

    if (!markdown) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Markdown content is required'
      });
    }

    const filename = `${uuidv4()}.docx`;
    const outputPath = path.join(config.outputsDir, filename);

    await converterService.markdownToDOCX(markdown, outputPath);

    // Upload to cloud if requested
    let cloudResult = null;
    if (uploadToCloud) {
      cloudResult = await cloudService.upload(outputPath, filename, {
        provider: cloudProvider || 'auto'
      });
    }

    res.json({
      success: true,
      filename,
      outputPath,
      cloud: cloudResult,
      message: 'DOCX generated successfully'
    });

  } catch (error) {
    logger.error('MD to DOCX conversion error:', error);
    next(error);
  }
});

/**
 * GET /api/conversion/download/:filename
 * Download converted file
 */
router.get('/download/:filename', (req, res, next) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(config.outputsDir, filename);

    res.download(filePath, filename, (error) => {
      if (error && !res.headersSent) {
        next(error);
      }
    });

  } catch (error) {
    logger.error('Download error:', error);
    next(error);
  }
});

/**
 * GET /api/templates
 * List available templates
 */
router.get('/templates', (req, res) => {
  const templates = templateService.listTemplates();

  res.json({
    success: true,
    count: templates.length,
    templates
  });
});

/**
 * GET /api/templates/:name
 * Get template content
 */
router.get('/templates/:name', (req, res, next) => {
  try {
    const { name } = req.params;
    const content = templateService.getTemplate(name);

    res.json({
      success: true,
      name,
      content
    });

  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Not Found',
        message: error.message
      });
    }
    next(error);
  }
});

/**
 * POST /api/templates/render
 * Render template with data
 */
router.post('/templates/render', async (req, res, next) => {
  try {
    const { templateName, data } = req.body;

    if (!templateName || !data) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Template name and data are required'
      });
    }

    const rendered = templateService.render(templateName, data);

    res.json({
      success: true,
      templateName,
      rendered,
      length: rendered.length
    });

  } catch (error) {
    logger.error('Template rendering error:', error);
    next(error);
  }
});

/**
 * POST /api/templates
 * Create custom template
 */
router.post('/templates', async (req, res, next) => {
  try {
    const { name, content } = req.body;

    if (!name || !content) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Template name and content are required'
      });
    }

    const result = templateService.createTemplate(name, content);

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    logger.error('Template creation error:', error);
    next(error);
  }
});

/**
 * DELETE /api/templates/:name
 * Delete template
 */
router.delete('/templates/:name', (req, res, next) => {
  try {
    const { name } = req.params;
    const result = templateService.deleteTemplate(name);

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    logger.error('Template deletion error:', error);
    next(error);
  }
});

/**
 * POST /api/batch/convert
 * Batch convert files
 */
router.post('/batch/convert', upload.array('files', 100), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No files uploaded'
      });
    }

    const { operation, format, theme } = req.body;

    if (!operation) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Operation type is required (e.g., md-to-pdf, md-to-docx)'
      });
    }

    const jobId = batchService.createJob(req.files, operation, {
      format,
      theme
    });

    // Process in background
    batchService.processJob(jobId, async (file, options) => {
      // Read file content
      const fs = require('fs');
      const markdown = fs.readFileSync(file.path, 'utf-8');

      const filename = `${uuidv4()}.${operation === 'md-to-pdf' ? 'pdf' : 'docx'}`;
      const outputPath = path.join(config.outputsDir, filename);

      if (operation === 'md-to-pdf') {
        await converterService.markdownToPDF(markdown, outputPath, options);
      } else if (operation === 'md-to-docx') {
        await converterService.markdownToDOCX(markdown, outputPath, options);
      } else {
        throw new Error(`Unsupported operation: ${operation}`);
      }

      return { outputPath, metadata: { operation, filename } };
    }).catch(error => {
      logger.error('Batch job processing error:', error);
    });

    res.json({
      success: true,
      jobId,
      message: 'Batch job created and processing started',
      totalFiles: req.files.length
    });

  } catch (error) {
    logger.error('Batch convert error:', error);
    next(error);
  }
});

/**
 * GET /api/batch/status/:jobId
 * Get batch job status
 */
router.get('/batch/status/:jobId', (req, res, next) => {
  try {
    const { jobId } = req.params;
    const status = batchService.getJobStatus(jobId);

    res.json({
      success: true,
      job: status
    });

  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Not Found',
        message: error.message
      });
    }
    next(error);
  }
});

/**
 * GET /api/batch/download/:jobId
 * Download batch results as ZIP
 */
router.get('/batch/download/:jobId', async (req, res, next) => {
  try {
    const { jobId } = req.params;

    const zipFilename = `${jobId}.zip`;
    const zipPath = path.join(config.outputsDir, zipFilename);

    await batchService.createZipArchive(jobId, zipPath);

    res.download(zipPath, zipFilename, (error) => {
      if (error && !res.headersSent) {
        next(error);
      }
    });

  } catch (error) {
    logger.error('Batch download error:', error);
    next(error);
  }
});

/**
 * GET /api/batch/jobs
 * List all batch jobs
 */
router.get('/batch/jobs', (req, res) => {
  const jobs = batchService.getAllJobs();

  res.json({
    success: true,
    count: jobs.length,
    jobs
  });
});

/**
 * POST /api/qrcode/generate
 * Generate QR code
 */
router.post('/qrcode/generate', async (req, res, next) => {
  try {
    const { data, format, width, errorCorrectionLevel, color } = req.body;

    if (!data) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Data is required'
      });
    }

    // Validate data
    const validation = qrcodeService.validateData(data);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Bad Request',
        message: validation.error
      });
    }

    let result;

    if (format === 'dataurl') {
      const dataURL = await qrcodeService.generateDataURL(data, {
        width,
        errorCorrectionLevel,
        color
      });
      result = { dataURL };

    } else if (format === 'svg') {
      const svg = await qrcodeService.generateSVG(data, {
        width,
        errorCorrectionLevel,
        color
      });
      result = { svg };

    } else {
      const filename = `${uuidv4()}.png`;
      const outputPath = path.join(config.outputsDir, filename);

      await qrcodeService.generateImage(data, outputPath, {
        type: 'png',
        width,
        errorCorrectionLevel,
        color
      });

      result = { filename, outputPath };
    }

    res.json({
      success: true,
      format: format || 'image',
      ...result
    });

  } catch (error) {
    logger.error('QR code generation error:', error);
    next(error);
  }
});

/**
 * GET /api/cloud/providers
 * Get available cloud storage providers
 */
router.get('/cloud/providers', (req, res) => {
  const providers = cloudService.getAvailableProviders();

  res.json({
    success: true,
    count: providers.length,
    providers
  });
});

module.exports = router;
