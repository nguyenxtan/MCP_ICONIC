const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const markitdownService = require('../modules/markitdown');
const logger = require('../modules/common/logger');
const fileHandler = require('../modules/common/fileHandler');
const config = require('../config');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fileHandler.ensureDir(config.uploadsDir);
    cb(null, config.uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: config.upload.maxFileSize
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    if (config.upload.allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}`));
    }
  }
});

/**
 * POST /api/markitdown/convert
 * Upload và convert file sang Markdown
 */
router.post('/convert', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please upload a file'
      });
    }
    
    logger.info('File uploaded', {
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
    
    // Convert file
    const result = await markitdownService.convertFile(req.file.path);
    
    // Return result
    res.json({
      success: true,
      jobId: result.jobId,
      status: result.status,
      message: 'File converted successfully',
      data: {
        inputFile: req.file.originalname,
        outputFile: path.basename(result.outputPath),
        markdownPreview: result.markdown.substring(0, 500) + '...',
        fullMarkdown: result.markdown
      }
    });
    
    // Cleanup uploaded file
    setTimeout(() => {
      fileHandler.deleteFile(req.file.path);
    }, 5000);
    
  } catch (error) {
    logger.error('Conversion error', error);
    
    // Cleanup on error
    if (req.file) {
      fileHandler.deleteFile(req.file.path);
    }
    
    res.status(500).json({
      error: 'Conversion failed',
      message: error.message
    });
  }
});

/**
 * GET /api/markitdown/status/:jobId
 * Lấy trạng thái của một conversion job
 */
router.get('/status/:jobId', (req, res) => {
  try {
    const jobId = req.params.jobId;
    const job = markitdownService.getJobStatus(jobId);
    
    res.json({
      success: true,
      job
    });
    
  } catch (error) {
    logger.error('Get status error', error);
    res.status(404).json({
      error: 'Job not found',
      message: error.message
    });
  }
});

/**
 * GET /api/markitdown/jobs
 * Lấy danh sách tất cả jobs
 */
router.get('/jobs', (req, res) => {
  try {
    const jobs = markitdownService.getAllJobs();
    
    res.json({
      success: true,
      count: jobs.length,
      jobs
    });
    
  } catch (error) {
    logger.error('Get jobs error', error);
    res.status(500).json({
      error: 'Failed to get jobs',
      message: error.message
    });
  }
});

/**
 * GET /api/markitdown/download/:jobId
 * Download markdown file của một job
 */
router.get('/download/:jobId', (req, res) => {
  try {
    const jobId = req.params.jobId;
    const job = markitdownService.getJobStatus(jobId);
    
    if (job.status !== 'completed') {
      return res.status(400).json({
        error: 'Job not completed',
        message: 'Cannot download file for incomplete job'
      });
    }
    
    const filePath = path.join(config.outputsDir, job.outputFile);
    
    res.download(filePath, job.outputFile, (err) => {
      if (err) {
        logger.error('Download error', err);
        res.status(500).json({
          error: 'Download failed',
          message: err.message
        });
      }
    });
    
  } catch (error) {
    logger.error('Download error', error);
    res.status(404).json({
      error: 'File not found',
      message: error.message
    });
  }
});

module.exports = router;