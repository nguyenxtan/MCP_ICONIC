const request = require('supertest');
const express = require('express');
const conversionRoutes = require('../routes/conversion.routes');
const bodyParser = require('body-parser');

// Create test app
const app = express();
app.use(bodyParser.json());
app.use('/api/conversion', conversionRoutes);
app.use('/api/templates', conversionRoutes);
app.use('/api/qrcode', conversionRoutes);

describe('API Endpoints', () => {
  describe('Conversion API', () => {
    describe('POST /api/conversion/md-to-html', () => {
      test('should convert markdown to HTML', async () => {
        const response = await request(app)
          .post('/api/conversion/md-to-html')
          .send({
            markdown: '# Hello World\n\nThis is a test.',
            theme: 'default',
            includeCSS: true
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.html).toContain('<h1>Hello World</h1>');
      });

      test('should return 400 when markdown is missing', async () => {
        const response = await request(app)
          .post('/api/conversion/md-to-html')
          .send({});

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Bad Request');
      });
    });

    describe('POST /api/conversion/md-to-pdf', () => {
      test('should convert markdown to PDF', async () => {
        const response = await request(app)
          .post('/api/conversion/md-to-pdf')
          .send({
            markdown: '# PDF Test\n\nThis is a PDF test.',
            theme: 'default',
            format: 'A4'
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.filename).toBeDefined();
        expect(response.body.filename).toMatch(/\.pdf$/);
      }, 30000);

      test('should return 400 when markdown is missing', async () => {
        const response = await request(app)
          .post('/api/conversion/md-to-pdf')
          .send({});

        expect(response.status).toBe(400);
      });
    });

    describe('POST /api/conversion/md-to-docx', () => {
      test('should convert markdown to DOCX', async () => {
        const response = await request(app)
          .post('/api/conversion/md-to-docx')
          .send({
            markdown: '# DOCX Test\n\nThis is a DOCX test.'
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.filename).toBeDefined();
        expect(response.body.filename).toMatch(/\.docx$/);
      });
    });
  });

  describe('Template API', () => {
    describe('GET /api/templates', () => {
      test('should list all templates', async () => {
        const response = await request(app)
          .get('/api/templates');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.templates)).toBe(true);
        expect(response.body.templates.length).toBeGreaterThan(0);
      });
    });

    describe('GET /api/templates/:name', () => {
      test('should get template by name', async () => {
        const response = await request(app)
          .get('/api/templates/weekly-report');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.content).toContain('Weekly Report');
      });

      test('should return 404 for non-existent template', async () => {
        const response = await request(app)
          .get('/api/templates/non-existent');

        expect(response.status).toBe(404);
      });
    });

    describe('POST /api/templates/render', () => {
      test('should render template with data', async () => {
        const response = await request(app)
          .post('/api/templates/render')
          .send({
            templateName: 'weekly-report',
            data: {
              weekStart: '2024-01-01',
              weekEnd: '2024-01-07',
              author: 'Test User',
              summary: 'Test summary',
              accomplishments: ['Task 1', 'Task 2'],
              metrics: [],
              challenges: [],
              nextWeekPlans: []
            }
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.rendered).toContain('Weekly Report');
        expect(response.body.rendered).toContain('Test User');
      });

      test('should return 400 when templateName or data is missing', async () => {
        const response = await request(app)
          .post('/api/templates/render')
          .send({ templateName: 'weekly-report' });

        expect(response.status).toBe(400);
      });
    });
  });

  describe('QR Code API', () => {
    describe('POST /api/qrcode/generate', () => {
      test('should generate QR code as image', async () => {
        const response = await request(app)
          .post('/api/qrcode/generate')
          .send({
            data: 'https://example.com',
            format: 'image',
            width: 300
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.filename).toBeDefined();
      });

      test('should generate QR code as data URL', async () => {
        const response = await request(app)
          .post('/api/qrcode/generate')
          .send({
            data: 'https://example.com',
            format: 'dataurl'
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.dataURL).toBeDefined();
        expect(response.body.dataURL).toMatch(/^data:image\/png;base64,/);
      });

      test('should generate QR code as SVG', async () => {
        const response = await request(app)
          .post('/api/qrcode/generate')
          .send({
            data: 'https://example.com',
            format: 'svg'
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.svg).toBeDefined();
        expect(response.body.svg).toContain('<svg');
      });

      test('should return 400 when data is missing', async () => {
        const response = await request(app)
          .post('/api/qrcode/generate')
          .send({});

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Bad Request');
      });

      test('should return 400 for data that is too long', async () => {
        const longData = 'x'.repeat(5000); // Exceeds max length

        const response = await request(app)
          .post('/api/qrcode/generate')
          .send({ data: longData });

        expect(response.status).toBe(400);
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle internal server errors gracefully', async () => {
      // Send invalid JSON to trigger error
      const response = await request(app)
        .post('/api/conversion/md-to-html')
        .send({
          markdown: null // Will cause error
        });

      // Should either return 400 or 500, but not crash
      expect([400, 500]).toContain(response.status);
    });
  });
});
