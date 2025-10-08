const QRCode = require('qrcode');
const path = require('path');
const logger = require('../common/logger');
const config = require('../../config');

class QRCodeService {
  /**
   * Generate QR code as image file
   * @param {string} data - Data to encode
   * @param {string} outputPath - Output file path
   * @param {object} options - QR code options
   * @returns {Promise<object>} - Generation result
   */
  async generateImage(data, outputPath, options = {}) {
    const {
      errorCorrectionLevel = 'M', // L, M, Q, H
      type = 'png', // png or svg
      width = 300,
      margin = 4,
      color = {
        dark: '#000000',
        light: '#FFFFFF'
      }
    } = options;

    try {
      logger.info('Generating QR code image', {
        dataLength: data.length,
        outputPath,
        type
      });

      const qrOptions = {
        errorCorrectionLevel,
        type: type === 'svg' ? 'svg' : 'png',
        width,
        margin,
        color
      };

      await QRCode.toFile(outputPath, data, qrOptions);

      logger.info('QR code image generated successfully', { outputPath });

      return {
        success: true,
        outputPath,
        type,
        width,
        data: data.substring(0, 100) + (data.length > 100 ? '...' : '')
      };

    } catch (error) {
      logger.error('QR code generation failed', error);
      throw new Error(`QR code generation failed: ${error.message}`);
    }
  }

  /**
   * Generate QR code as data URL (base64)
   * @param {string} data - Data to encode
   * @param {object} options - QR code options
   * @returns {Promise<string>} - Data URL
   */
  async generateDataURL(data, options = {}) {
    const {
      errorCorrectionLevel = 'M',
      width = 300,
      margin = 4,
      color = {
        dark: '#000000',
        light: '#FFFFFF'
      }
    } = options;

    try {
      logger.info('Generating QR code data URL', { dataLength: data.length });

      const qrOptions = {
        errorCorrectionLevel,
        width,
        margin,
        color
      };

      const dataURL = await QRCode.toDataURL(data, qrOptions);

      logger.info('QR code data URL generated successfully');

      return dataURL;

    } catch (error) {
      logger.error('QR code data URL generation failed', error);
      throw new Error(`QR code data URL generation failed: ${error.message}`);
    }
  }

  /**
   * Generate QR code as SVG string
   * @param {string} data - Data to encode
   * @param {object} options - QR code options
   * @returns {Promise<string>} - SVG string
   */
  async generateSVG(data, options = {}) {
    const {
      errorCorrectionLevel = 'M',
      width = 300,
      margin = 4,
      color = {
        dark: '#000000',
        light: '#FFFFFF'
      }
    } = options;

    try {
      logger.info('Generating QR code SVG', { dataLength: data.length });

      const qrOptions = {
        errorCorrectionLevel,
        type: 'svg',
        width,
        margin,
        color
      };

      const svg = await QRCode.toString(data, qrOptions);

      logger.info('QR code SVG generated successfully');

      return svg;

    } catch (error) {
      logger.error('QR code SVG generation failed', error);
      throw new Error(`QR code SVG generation failed: ${error.message}`);
    }
  }

  /**
   * Generate QR code with logo overlay
   * @param {string} data - Data to encode
   * @param {string} outputPath - Output file path
   * @param {string} logoPath - Logo image path
   * @param {object} options - QR code options
   * @returns {Promise<object>} - Generation result
   */
  async generateWithLogo(data, outputPath, logoPath, options = {}) {
    const {
      errorCorrectionLevel = 'H', // Use high error correction for logo
      width = 300,
      logoSize = 60 // Logo size in pixels
    } = options;

    try {
      logger.info('Generating QR code with logo', {
        dataLength: data.length,
        outputPath,
        logoPath
      });

      // For now, generate basic QR code
      // Full implementation would use sharp or jimp to overlay logo
      await this.generateImage(data, outputPath, {
        errorCorrectionLevel,
        width,
        ...options
      });

      logger.info('QR code with logo generated (note: logo overlay not yet implemented)');

      return {
        success: true,
        outputPath,
        note: 'Logo overlay feature coming soon'
      };

    } catch (error) {
      logger.error('QR code with logo generation failed', error);
      throw new Error(`QR code with logo generation failed: ${error.message}`);
    }
  }

  /**
   * Generate batch QR codes
   * @param {Array<object>} items - Items with data and filename
   * @param {string} outputDir - Output directory
   * @param {object} options - QR code options
   * @returns {Promise<Array>} - Generation results
   */
  async generateBatch(items, outputDir, options = {}) {
    logger.info('Generating batch QR codes', {
      count: items.length,
      outputDir
    });

    const results = [];

    for (const item of items) {
      try {
        const outputPath = path.join(outputDir, item.filename);
        const result = await this.generateImage(item.data, outputPath, options);

        results.push({
          success: true,
          filename: item.filename,
          outputPath,
          data: item.data.substring(0, 50) + '...'
        });

      } catch (error) {
        logger.error(`Failed to generate QR code for ${item.filename}`, error);

        results.push({
          success: false,
          filename: item.filename,
          error: error.message
        });
      }
    }

    logger.info('Batch QR code generation completed', {
      total: items.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });

    return results;
  }

  /**
   * Validate data for QR code
   * @param {string} data - Data to validate
   * @returns {object} - Validation result
   */
  validateData(data) {
    const maxLength = 4296; // Maximum bytes for QR code

    if (!data || data.length === 0) {
      return {
        valid: false,
        error: 'Data is empty'
      };
    }

    if (data.length > maxLength) {
      return {
        valid: false,
        error: `Data too long (${data.length} bytes). Maximum is ${maxLength} bytes.`,
        maxLength
      };
    }

    return {
      valid: true,
      length: data.length,
      maxLength
    };
  }
}

module.exports = new QRCodeService();
