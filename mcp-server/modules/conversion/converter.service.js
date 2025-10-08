const { marked } = require('marked');
const puppeteer = require('puppeteer');
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');
const fs = require('fs');
const path = require('path');
const logger = require('../common/logger');
const config = require('../../config');

class ConverterService {
  constructor() {
    this.browser = null;
  }

  /**
   * Convert Markdown to HTML
   * @param {string} markdown - Markdown content
   * @param {object} options - Conversion options
   * @returns {string} - HTML content
   */
  async markdownToHTML(markdown, options = {}) {
    const {
      theme = 'default',
      includeCSS = true,
      sanitize = true
    } = options;

    try {
      logger.info('Converting Markdown to HTML', { length: markdown.length });

      // Configure marked options
      marked.setOptions({
        gfm: true,
        breaks: true,
        sanitize: sanitize
      });

      // Convert markdown to HTML
      const htmlContent = marked.parse(markdown);

      // Add CSS styling if requested
      let html = htmlContent;
      if (includeCSS) {
        const css = this._getThemeCSS(theme);
        html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
  <style>${css}</style>
</head>
<body>
  <div class="markdown-body">
    ${htmlContent}
  </div>
</body>
</html>`;
      }

      logger.info('Markdown to HTML conversion completed');
      return html;

    } catch (error) {
      logger.error('Markdown to HTML conversion failed', error);
      throw new Error(`HTML conversion failed: ${error.message}`);
    }
  }

  /**
   * Convert Markdown to PDF
   * @param {string} markdown - Markdown content
   * @param {string} outputPath - Output PDF path
   * @param {object} options - Conversion options
   * @returns {Promise<string>} - Output path
   */
  async markdownToPDF(markdown, outputPath, options = {}) {
    const {
      theme = 'default',
      format = 'A4',
      margin = { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' }
    } = options;

    try {
      logger.info('Converting Markdown to PDF', { outputPath });

      // First convert to HTML
      const html = await this.markdownToHTML(markdown, { theme, includeCSS: true });

      // Launch browser
      if (!this.browser) {
        this.browser = await puppeteer.launch({
          headless: 'new',
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
      }

      const page = await this.browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      // Generate PDF
      await page.pdf({
        path: outputPath,
        format,
        margin,
        printBackground: true
      });

      await page.close();

      logger.info('Markdown to PDF conversion completed', { outputPath });
      return outputPath;

    } catch (error) {
      logger.error('Markdown to PDF conversion failed', error);
      throw new Error(`PDF conversion failed: ${error.message}`);
    }
  }

  /**
   * Convert Markdown to DOCX
   * @param {string} markdown - Markdown content
   * @param {string} outputPath - Output DOCX path
   * @param {object} options - Conversion options
   * @returns {Promise<string>} - Output path
   */
  async markdownToDOCX(markdown, outputPath, options = {}) {
    try {
      logger.info('Converting Markdown to DOCX', { outputPath });

      // Parse markdown into sections
      const sections = this._parseMarkdownToSections(markdown);

      // Create document
      const doc = new Document({
        sections: [{
          properties: {},
          children: sections
        }]
      });

      // Generate DOCX
      const buffer = await Packer.toBuffer(doc);
      fs.writeFileSync(outputPath, buffer);

      logger.info('Markdown to DOCX conversion completed', { outputPath });
      return outputPath;

    } catch (error) {
      logger.error('Markdown to DOCX conversion failed', error);
      throw new Error(`DOCX conversion failed: ${error.message}`);
    }
  }

  /**
   * Parse markdown into DOCX sections
   * @private
   */
  _parseMarkdownToSections(markdown) {
    const lines = markdown.split('\n');
    const paragraphs = [];

    for (const line of lines) {
      // Handle headings
      if (line.startsWith('# ')) {
        paragraphs.push(new Paragraph({
          text: line.substring(2),
          heading: HeadingLevel.HEADING_1
        }));
      } else if (line.startsWith('## ')) {
        paragraphs.push(new Paragraph({
          text: line.substring(3),
          heading: HeadingLevel.HEADING_2
        }));
      } else if (line.startsWith('### ')) {
        paragraphs.push(new Paragraph({
          text: line.substring(4),
          heading: HeadingLevel.HEADING_3
        }));
      } else if (line.trim() === '') {
        // Empty line
        paragraphs.push(new Paragraph({ text: '' }));
      } else {
        // Regular text - handle bold and italic
        const children = this._parseInlineFormatting(line);
        paragraphs.push(new Paragraph({ children }));
      }
    }

    return paragraphs;
  }

  /**
   * Parse inline formatting (bold, italic)
   * @private
   */
  _parseInlineFormatting(text) {
    const children = [];

    // Simple bold and italic parsing
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);

    for (const part of parts) {
      if (part.startsWith('**') && part.endsWith('**')) {
        // Bold
        children.push(new TextRun({
          text: part.slice(2, -2),
          bold: true
        }));
      } else if (part.startsWith('*') && part.endsWith('*')) {
        // Italic
        children.push(new TextRun({
          text: part.slice(1, -1),
          italics: true
        }));
      } else if (part.startsWith('`') && part.endsWith('`')) {
        // Code
        children.push(new TextRun({
          text: part.slice(1, -1),
          font: 'Courier New'
        }));
      } else {
        // Regular text
        children.push(new TextRun({ text: part }));
      }
    }

    return children;
  }

  /**
   * Get theme CSS
   * @private
   */
  _getThemeCSS(theme) {
    const themes = {
      default: `
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
          line-height: 1.6;
          color: #24292e;
          max-width: 980px;
          margin: 0 auto;
          padding: 45px;
        }
        .markdown-body h1 { border-bottom: 2px solid #eaecef; padding-bottom: 0.3em; }
        .markdown-body h2 { border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
        .markdown-body code { background-color: rgba(27,31,35,0.05); padding: 0.2em 0.4em; border-radius: 3px; }
        .markdown-body pre { background-color: #f6f8fa; padding: 16px; overflow: auto; border-radius: 6px; }
        .markdown-body blockquote { border-left: 0.25em solid #dfe2e5; padding: 0 1em; color: #6a737d; }
        .markdown-body table { border-collapse: collapse; width: 100%; }
        .markdown-body table td, .markdown-body table th { border: 1px solid #dfe2e5; padding: 6px 13px; }
      `,
      dark: `
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
          line-height: 1.6;
          color: #c9d1d9;
          background-color: #0d1117;
          max-width: 980px;
          margin: 0 auto;
          padding: 45px;
        }
        .markdown-body h1, .markdown-body h2 { border-bottom-color: #21262d; }
        .markdown-body code { background-color: rgba(110,118,129,0.4); }
        .markdown-body pre { background-color: #161b22; }
      `,
      minimal: `
        body {
          font-family: 'Georgia', serif;
          line-height: 1.8;
          color: #333;
          max-width: 700px;
          margin: 0 auto;
          padding: 60px 20px;
        }
        .markdown-body h1, .markdown-body h2, .markdown-body h3 { font-weight: 600; }
      `
    };

    return themes[theme] || themes.default;
  }

  /**
   * Cleanup browser instance
   */
  async cleanup() {
    if (this.browser) {
      logger.info('Closing Puppeteer browser');
      await this.browser.close();
      this.browser = null;
    }
  }
}

module.exports = new ConverterService();
