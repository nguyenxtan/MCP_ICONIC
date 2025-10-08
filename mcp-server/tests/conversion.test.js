const converterService = require('../modules/conversion/converter.service');
const fs = require('fs');
const path = require('path');

describe('Converter Service', () => {
  const testOutputDir = path.join(__dirname, '../test-outputs');

  beforeAll(() => {
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }
  });

  afterAll(async () => {
    // Cleanup
    await converterService.cleanup();
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  describe('Markdown to HTML', () => {
    test('should convert basic markdown to HTML', async () => {
      const markdown = '# Hello World\n\nThis is a test.';
      const html = await converterService.markdownToHTML(markdown, {
        includeCSS: false
      });

      expect(html).toContain('<h1>Hello World</h1>');
      expect(html).toContain('<p>This is a test.</p>');
    });

    test('should include CSS when requested', async () => {
      const markdown = '# Test';
      const html = await converterService.markdownToHTML(markdown, {
        includeCSS: true,
        theme: 'default'
      });

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<style>');
      expect(html).toContain('font-family');
    });

    test('should apply different themes', async () => {
      const markdown = '# Test';

      const defaultHtml = await converterService.markdownToHTML(markdown, {
        includeCSS: true,
        theme: 'default'
      });

      const darkHtml = await converterService.markdownToHTML(markdown, {
        includeCSS: true,
        theme: 'dark'
      });

      expect(defaultHtml).toContain('font-family');
      expect(darkHtml).toContain('background-color');
    });

    test('should handle code blocks', async () => {
      const markdown = '```javascript\nconst x = 1;\n```';
      const html = await converterService.markdownToHTML(markdown, {
        includeCSS: false
      });

      expect(html).toContain('<pre>');
      expect(html).toContain('<code');
      expect(html).toContain('const x = 1;');
    });

    test('should handle links and bold text', async () => {
      const markdown = '**Bold** and [link](https://example.com)';
      const html = await converterService.markdownToHTML(markdown, {
        includeCSS: false
      });

      expect(html).toContain('<strong>Bold</strong>');
      expect(html).toContain('<a href="https://example.com">link</a>');
    });
  });

  describe('Markdown to PDF', () => {
    test('should convert markdown to PDF file', async () => {
      const markdown = '# PDF Test\n\nThis is a PDF test.';
      const outputPath = path.join(testOutputDir, 'test.pdf');

      const result = await converterService.markdownToPDF(markdown, outputPath, {
        theme: 'default',
        format: 'A4'
      });

      expect(result).toBe(outputPath);
      expect(fs.existsSync(outputPath)).toBe(true);

      const stats = fs.statSync(outputPath);
      expect(stats.size).toBeGreaterThan(0);
    }, 30000);

    test('should handle custom margins', async () => {
      const markdown = '# Margin Test';
      const outputPath = path.join(testOutputDir, 'test-margin.pdf');

      await converterService.markdownToPDF(markdown, outputPath, {
        format: 'A4',
        margin: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm'
        }
      });

      expect(fs.existsSync(outputPath)).toBe(true);
    }, 30000);
  });

  describe('Markdown to DOCX', () => {
    test('should convert markdown to DOCX file', async () => {
      const markdown = '# DOCX Test\n\nThis is a DOCX test with **bold** and *italic*.';
      const outputPath = path.join(testOutputDir, 'test.docx');

      const result = await converterService.markdownToDOCX(markdown, outputPath);

      expect(result).toBe(outputPath);
      expect(fs.existsSync(outputPath)).toBe(true);

      const stats = fs.statSync(outputPath);
      expect(stats.size).toBeGreaterThan(0);
    });

    test('should handle headings properly', async () => {
      const markdown = '# Heading 1\n## Heading 2\n### Heading 3\n\nRegular text.';
      const outputPath = path.join(testOutputDir, 'test-headings.docx');

      await converterService.markdownToDOCX(markdown, outputPath);

      expect(fs.existsSync(outputPath)).toBe(true);
    });

    test('should handle code blocks in DOCX', async () => {
      const markdown = 'Text with `inline code` here.';
      const outputPath = path.join(testOutputDir, 'test-code.docx');

      await converterService.markdownToDOCX(markdown, outputPath);

      expect(fs.existsSync(outputPath)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should throw error for empty markdown', async () => {
      await expect(
        converterService.markdownToHTML('')
      ).rejects.toThrow();
    });

    test('should throw error for invalid output path', async () => {
      const markdown = '# Test';
      const invalidPath = '/invalid/path/test.pdf';

      await expect(
        converterService.markdownToPDF(markdown, invalidPath)
      ).rejects.toThrow();
    });
  });
});
