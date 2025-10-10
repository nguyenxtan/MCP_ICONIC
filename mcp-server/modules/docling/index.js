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
      const result = await this.runPythonCommand(['docling', '--version']);
      this.isAvailable = true;
      logger.info('Docling is available', { version: result.trim() });
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
      const process = spawn('python3', ['-m', ...args]);
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
    logger.info('Starting Docling conversion', { source, options });

    try {
      // Create temp directory for output
      const tempDir = path.join(__dirname, '../../outputs', `docling_${Date.now()}`);
      await fs.mkdir(tempDir, { recursive: true });

      // Build command args
      const args = ['docling'];

      // Add pipeline option (default or vlm)
      if (options.useVLM) {
        args.push('--pipeline', 'vlm');
        args.push('--vlm-model', options.vlmModel || 'granite_docling');
      }

      // Add OCR options
      if (options.ocr !== false) {
        args.push('--ocr');
      }

      // Output format
      args.push('--format', 'md');
      args.push('--output', tempDir);

      // Source document
      args.push(source);

      // Run conversion
      const output = await this.runPythonCommand(args);

      // Read converted markdown file
      const files = await fs.readdir(tempDir);
      const mdFile = files.find(f => f.endsWith('.md'));

      if (!mdFile) {
        throw new Error('Conversion completed but no markdown file was generated');
      }

      const markdown = await fs.readFile(path.join(tempDir, mdFile), 'utf-8');

      // Cleanup temp directory
      await fs.rm(tempDir, { recursive: true, force: true });

      const duration = Date.now() - startTime;
      logger.info('Docling conversion completed', {
        source,
        duration: `${duration}ms`,
        outputSize: markdown.length
      });

      return {
        success: true,
        markdown,
        metadata: {
          source,
          duration,
          size: markdown.length,
          engine: 'docling',
          pipeline: options.useVLM ? 'vlm' : 'default'
        }
      };

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

    const pythonScript = `
import sys
import json
from docling.document_converter import DocumentConverter

try:
    source = "${source}"
    converter = DocumentConverter()
    result = converter.convert(source)
    markdown = result.document.export_to_markdown()

    output = {
        "success": True,
        "markdown": markdown,
        "metadata": {
            "source": source,
            "engine": "docling-python-api"
        }
    }
    print(json.dumps(output))
except Exception as e:
    print(json.dumps({"success": False, "error": str(e)}), file=sys.stderr)
    sys.exit(1)
`;

    try {
      const result = await this.runPythonCommand(['-c', pythonScript]);
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
      const result = await this.convertToMarkdown(source, {
        ...options,
        format: 'audio'
      });

      const duration = Date.now() - startTime;
      logger.info('Audio transcription completed', {
        source,
        duration: `${duration}ms`
      });

      return {
        success: true,
        transcript: result.markdown,
        metadata: {
          source,
          duration,
          engine: 'docling-asr'
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
}

module.exports = new DoclingService();
