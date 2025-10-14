/**
 * Docling Module
 * IBM's AI-powered document conversion tool
 * Converts PDF, DOCX, PPTX to Markdown with advanced layout understanding
 */

const { spawn } = require('child_process');
const logger = require('../common/logger');
const fs = require('fs').promises;
const path = require('path');

class DoclingService {
  constructor() {
    this.isAvailable = false;
    this.checkAvailability();
  }

  async checkAvailability() {
    try {
      // Check if docling module can be imported
      const { spawn } = require('child_process');
      const result = await new Promise((resolve, reject) => {
        const proc = spawn('python3', ['-c', 'from docling.document_converter import DocumentConverter; print("OK")']);
        let stdout = '';
        let stderr = '';
        proc.stdout.on('data', (data) => { stdout += data.toString(); });
        proc.stderr.on('data', (data) => { stderr += data.toString(); });
        proc.on('close', (code) => {
          if (code === 0) resolve(stdout);
          else reject(new Error(stderr));
        });
      });
      this.isAvailable = true;
      logger.info('Docling is available and ready');
    } catch (error) {
      this.isAvailable = false;
      logger.warn('Docling is not available. Install with: pip install docling');
    }
  }

  /**
   * Run Python command
   */
  runPythonCommand(args) {
    return new Promise((resolve, reject) => {
      const command = args[0];
      const commandArgs = args.slice(1);
      const process = spawn(command, commandArgs);
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(stderr || `Process exited with code ${code}`));
        }
      });
    });
  }

  /**
   * Convert document to Markdown using Docling
   * @param {string} source - URL or file path
   * @param {object} options - Conversion options
   */
  async convertToMarkdown(source, options = {}) {
    if (!this.isAvailable) {
      throw new Error('Docling is not installed. Please install with: pip install docling');
    }

    const startTime = Date.now();
    logger.info('Starting Docling conversion via Python API', { source, options });

    try {
      const result = await this.convertWithPythonAPI(source, options);

      const duration = Date.now() - startTime;
      logger.info('Docling conversion completed', {
        source,
        duration: `${duration}ms`,
        outputSize: result.markdown.length
      });

      return result;

    } catch (error) {
      logger.error('Docling conversion failed', {
        source,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Convert document using Python API (alternative method)
   */
  async convertWithPythonAPI(source, options = {}) {
    if (!this.isAvailable) {
      throw new Error('Docling is not installed');
    }

    const lang = options.language || 'en';

    const pythonScript = `
import sys
import json
from docling.document_converter import DocumentConverter
from docling.pipelines.ocr_pipeline import OcrOptions

try:
    source = """${source.replace(/\\/g, '\\\\')}"""
    converter = DocumentConverter()
    
    # Set OCR options with language
    ocr_options = OcrOptions(languages=["${lang}"])
    
    result = converter.convert(source, ocr_options=ocr_options)
    markdown = result.document.export_to_markdown()

    output = {
        "success": True,
        "markdown": markdown,
        "metadata": {
            "source": source,
            "engine": "docling-python-api",
            "language": "${lang}"
        }
    }
    print(json.dumps(output))
except Exception as e:
    print(json.dumps({"success": False, "error": str(e)}), file=sys.stderr)
    sys.exit(1)
`;

    try {
      const result = await this.runPythonCommand(['python3', '-c', pythonScript]);
      return JSON.parse(result);
    } catch (error) {
      logger.error('Docling Python API conversion failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Transcribe audio file using Docling ASR
   * @param {string} source - Audio file URL or path (WAV, MP3, etc.)
   * @param {object} options - Transcription options
   */
  async transcribeAudio(source, options = {}) {
    if (!this.isAvailable) {
      throw new Error('Docling is not installed');
    }

    const startTime = Date.now();
    logger.info('Starting Docling audio transcription', { source, options });

    try {
      // Docling supports audio files directly
      const result = await this.convertWithPythonAPI(source, {
        ...options,
      });

      const duration = Date.now() - startTime;
      logger.info('Audio transcription completed', {
        source,
        duration: `${duration}ms`
      });

      return {
        success: true,
        transcript: result.markdown, // The result from audio is the transcript
        metadata: {
          source,
          duration,
          engine: 'docling-asr',
          language: options.language || 'en'
        }
      };

    } catch (error) {
      logger.error('Audio transcription failed', {
        source,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Extract images from PDF document
   * @param {string} source - PDF URL or file path
   * @param {object} options - Extraction options
   */
  async extractImages(source, options = {}) {
    if (!this.isAvailable) {
      throw new Error('Docling is not installed');
    }

    const startTime = Date.now();
    logger.info('Starting image extraction from PDF', { source });

    try {
      // Create temp directory for output
      const tempDir = path.join(__dirname, '../../outputs', `images_${Date.now()}`);
      await fs.mkdir(tempDir, { recursive: true });

      // Python script to extract images
      const pythonScript = `
import sys
import json
import os
from docling.document_converter import DocumentConverter

try:
    source = "${source}"
    output_dir = "${tempDir}"

    converter = DocumentConverter()
    result = converter.convert(source)

    # Extract images
    images = []
    doc = result.document

    # Iterate through all elements to find images
    for page_num, page in enumerate(doc.pages):
        for element in page.elements:
            if hasattr(element, 'image') and element.image:
                img_path = os.path.join(output_dir, f"page_{page_num}_{len(images)}.png")
                element.image.save(img_path)
                images.append({
                    "path": img_path,
                    "page": page_num,
                    "index": len(images)
                })

    output = {
        "success": True,
        "image_count": len(images),
        "images": images,
        "output_dir": output_dir
    }
    print(json.dumps(output))

except Exception as e:
    print(json.dumps({"success": False, "error": str(e)}), file=sys.stderr)
    sys.exit(1)
`;

      const result = await this.runPythonCommand(['-c', pythonScript]);
      const data = JSON.parse(result);

      const duration = Date.now() - startTime;
      logger.info('Image extraction completed', {
        source,
        imageCount: data.image_count,
        duration: `${duration}ms`
      });

      return {
        success: true,
        images: data.images,
        imageCount: data.image_count,
        outputDir: tempDir,
        metadata: {
          source,
          duration,
          engine: 'docling-image-extraction'
        }
      };

    } catch (error) {
      logger.error('Image extraction failed', {
        source,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Convert file (alias for convertToMarkdown for compatibility)
   */
  async convertFile(inputPath, options = {}) {
    return await this.convertToMarkdown(inputPath, options);
  }
}

module.exports = new DoclingService();
