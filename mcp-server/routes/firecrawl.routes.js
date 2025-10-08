const express = require('express');
const router = express.Router();
const firecrawlService = require('../modules/firecrawl');
const logger = require('../modules/common/logger');

/**
 * POST /api/firecrawl/scrape
 * Scrape a single URL and convert to Markdown
 */
router.post('/scrape', async (req, res, next) => {
  try {
    const { url, selector, removeSelectors, includeLinks, includeImages, timeout } = req.body;

    if (!url) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'URL is required'
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (error) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid URL format'
      });
    }

    logger.info('Scraping URL', { url, selector });

    const result = await firecrawlService.scrapeUrl(url, {
      selector,
      removeSelectors,
      includeLinks,
      includeImages,
      timeout
    });

    res.json({
      success: true,
      jobId: result.jobId,
      title: result.title,
      wordCount: result.wordCount,
      markdown: result.markdown,
      message: 'URL scraped successfully'
    });

  } catch (error) {
    logger.error('Scraping error:', error);
    next(error);
  }
});

/**
 * POST /api/firecrawl/crawl
 * Crawl a website starting from a URL
 */
router.post('/crawl', async (req, res, next) => {
  try {
    const {
      url,
      maxPages,
      maxDepth,
      sameDomain,
      selector,
      removeSelectors
    } = req.body;

    if (!url) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'URL is required'
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (error) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid URL format'
      });
    }

    // Validate limits
    const validatedMaxPages = Math.min(maxPages || 10, 50); // Max 50 pages
    const validatedMaxDepth = Math.min(maxDepth || 2, 5);   // Max depth 5

    logger.info('Crawling website', {
      url,
      maxPages: validatedMaxPages,
      maxDepth: validatedMaxDepth
    });

    const result = await firecrawlService.crawlWebsite(url, {
      maxPages: validatedMaxPages,
      maxDepth: validatedMaxDepth,
      sameDomain,
      selector,
      removeSelectors
    });

    res.json({
      success: true,
      jobId: result.jobId,
      pagesProcessed: result.pagesProcessed,
      pagesSuccessful: result.pagesSuccessful,
      pagesFailed: result.pagesFailed,
      results: result.results,
      message: 'Website crawled successfully'
    });

  } catch (error) {
    logger.error('Crawling error:', error);
    next(error);
  }
});

/**
 * GET /api/firecrawl/status/:jobId
 * Get job status
 */
router.get('/status/:jobId', (req, res, next) => {
  try {
    const { jobId } = req.params;
    const status = firecrawlService.getJobStatus(jobId);

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
 * GET /api/firecrawl/jobs
 * Get all jobs
 */
router.get('/jobs', (req, res) => {
  const jobs = firecrawlService.getAllJobs();

  res.json({
    success: true,
    count: jobs.length,
    jobs
  });
});

/**
 * GET /api/firecrawl/download/:jobId
 * Download the scraped markdown file
 */
router.get('/download/:jobId', (req, res, next) => {
  try {
    const { jobId } = req.params;
    const job = firecrawlService.getJobStatus(jobId);

    if (job.status !== 'completed') {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Job status is ${job.status}. Can only download completed jobs.`
      });
    }

    const outputPath = require('path').join(
      require('../../config').outputsDir,
      job.outputFile
    );

    res.download(outputPath, job.outputFile, (error) => {
      if (error) {
        logger.error('Download error:', error);
        if (!res.headersSent) {
          next(error);
        }
      }
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

module.exports = router;
