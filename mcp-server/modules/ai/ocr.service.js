const { createWorker } = require('tesseract.js');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('../common/logger');
const config = require('../../config');

class OCRService {
  constructor() {
    this.worker = null;
  }

  /**
   * Initialize Tesseract worker
   * @private
   */
  async _initWorker() {
    if (!this.worker) {
      logger.info('Initializing Tesseract OCR worker');
      this.worker = await createWorker(config.ai.ocr.languages);
    }
    return this.worker;
  }

  /**
   * Perform OCR on image file
   * @param {string} imagePath - Path to image file
   * @param {object} options - OCR options
   * @returns {Promise<object>} - OCR result
   */
  async extractTextFromImage(imagePath, options = {}) {
    const { language = 'eng' } = options;

    try {
      logger.info('Performing OCR on image', { imagePath, language });

      const worker = await this._initWorker();
      const { data } = await worker.recognize(imagePath, {
        language
      });

      logger.info('OCR completed', {
        confidence: data.confidence,
        textLength: data.text.length
      });

      return {
        text: data.text,
        confidence: data.confidence,
        words: data.words?.length || 0,
        lines: data.lines?.length || 0
      };

    } catch (error) {
      logger.error('OCR failed', error);
      throw new Error(`OCR extraction failed: ${error.message}`);
    }
  }

  /**
   * Perform OCR on PDF (scanned)
   * Uses pdf-to-image conversion then OCR
   * @param {string} pdfPath - Path to PDF file
   * @param {object} options - OCR options
   * @returns {Promise<object>} - OCR result
   */
  async extractTextFromPDF(pdfPath, options = {}) {
    const { language = 'eng', outputFormat = 'markdown' } = options;

    try {
      logger.info('Performing OCR on PDF', { pdfPath, language });

      // Convert PDF to images using pdftoppm (from poppler-utils)
      const imageDir = path.join(path.dirname(pdfPath), 'temp_images');
      if (!fs.existsSync(imageDir)) {
        fs.mkdirSync(imageDir, { recursive: true });
      }

      const imagePrefix = path.join(imageDir, 'page');

      // Execute pdftoppm to convert PDF to images
      await this._convertPDFToImages(pdfPath, imagePrefix);

      // Get all generated images
      const imageFiles = fs.readdirSync(imageDir)
        .filter(f => f.startsWith('page'))
        .sort()
        .map(f => path.join(imageDir, f));

      logger.info(`PDF converted to ${imageFiles.length} images`);

      // Perform OCR on each page
      const worker = await this._initWorker();
      const results = [];

      for (let i = 0; i < imageFiles.length; i++) {
        logger.info(`Processing page ${i + 1}/${imageFiles.length}`);

        const { data } = await worker.recognize(imageFiles[i], {
          language
        });

        results.push({
          page: i + 1,
          text: data.text,
          confidence: data.confidence,
          words: data.words?.length || 0
        });
      }

      // Cleanup temp images
      fs.rmSync(imageDir, { recursive: true, force: true });

      // Combine results
      const combinedText = results
        .map(r => `\n\n--- Page ${r.page} ---\n\n${r.text}`)
        .join('');

      const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;

      logger.info('PDF OCR completed', {
        pages: results.length,
        avgConfidence,
        totalWords: results.reduce((sum, r) => sum + r.words, 0)
      });

      return {
        text: combinedText.trim(),
        pages: results.length,
        confidence: avgConfidence,
        pageResults: results
      };

    } catch (error) {
      logger.error('PDF OCR failed', error);
      throw new Error(`PDF OCR extraction failed: ${error.message}`);
    }
  }

  /**
   * Convert PDF to images using pdftoppm
   * @private
   */
  _convertPDFToImages(pdfPath, outputPrefix) {
    return new Promise((resolve, reject) => {
      // pdftoppm -png input.pdf output_prefix
      const process = spawn('pdftoppm', [
        '-png',
        pdfPath,
        outputPrefix
      ]);

      let stderr = '';

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`pdftoppm failed: ${stderr}`));
          return;
        }
        resolve();
      });

      process.on('error', (error) => {
        reject(new Error(`Failed to execute pdftoppm: ${error.message}. Make sure poppler-utils is installed.`));
      });

      setTimeout(() => {
        process.kill();
        reject(new Error('PDF to image conversion timeout'));
      }, config.ai.ocr.timeout);
    });
  }

  /**
   * Cleanup Tesseract worker
   */
  async cleanup() {
    if (this.worker) {
      logger.info('Terminating Tesseract worker');
      await this.worker.terminate();
      this.worker = null;
    }
  }
}

module.exports = new OCRService();
