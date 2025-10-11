const axios = require('axios');
const cheerio = require('cheerio');
const TurndownService = require('turndown');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const logger = require('../common/logger');
const fileHandler = require('../common/fileHandler');
const config = require('../../config');

class FirecrawlService {
  constructor() {
    this.jobs = new Map();
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      emDelimiter: '*',
      bulletListMarker: '-'
    });

    // Ensure output directory exists
    fileHandler.ensureDir(config.outputsDir);

    // Cleanup old jobs every 30 minutes
    setInterval(() => {
      this.clearOldJobs(60);
    }, 30 * 60 * 1000);
  }

  /**
   * Scrape a single URL and convert to Markdown
   * @param {string} url - URL to scrape
   * @param {object} options - Scraping options
   * @returns {Promise<object>} - Scraping result
   */
  async scrapeUrl(url, options = {}) {
    const jobId = uuidv4();
    const {
      selector = null,
      removeSelectors = ['script', 'style', 'nav', 'footer', 'iframe'],
      includeLinks = true,
      includeImages = true,
      timeout = 30000
    } = options;

    // Initialize job status
    this.jobs.set(jobId, {
      id: jobId,
      status: 'processing',
      url,
      startTime: new Date(),
      error: null
    });

    logger.info(`Starting scrape job: ${jobId}`, { url });

    try {
      // Fetch the webpage
      const response = await axios.get(url, {
        timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      // Parse HTML
      const $ = cheerio.load(response.data);

      // Remove unwanted elements
      removeSelectors.forEach(sel => $(sel).remove());

      // Extract content
      let content;
      if (selector) {
        content = $(selector).html();
        if (!content) {
          throw new Error(`Selector "${selector}" not found on page`);
        }
      } else {
        // Default to main content areas
        content = $('main').html() ||
                  $('article').html() ||
                  $('.content').html() ||
                  $('#content').html() ||
                  $('body').html();
      }

      // Convert to Markdown
      let markdown = this.turndownService.turndown(content);

      // Add metadata
      const title = $('title').text() || 'Untitled';
      const metaDescription = $('meta[name="description"]').attr('content') || '';

      markdown = `# ${title}\n\n` +
                 `**Source:** ${url}\n` +
                 `**Scraped:** ${new Date().toISOString()}\n\n` +
                 (metaDescription ? `**Description:** ${metaDescription}\n\n---\n\n` : '---\n\n') +
                 markdown;

      // Save to file
      const outputPath = path.join(config.outputsDir, `${jobId}.md`);
      fileHandler.writeFile(outputPath, markdown);

      // Update job status
      this.jobs.set(jobId, {
        ...this.jobs.get(jobId),
        status: 'completed',
        outputFile: path.basename(outputPath),
        endTime: new Date(),
        title,
        wordCount: markdown.split(/\s+/).length,
        markdown: markdown.substring(0, 500) + '...' // Preview
      });

      logger.info(`Scraping completed: ${jobId}`);

      return {
        jobId,
        status: 'completed',
        title,
        markdown,
        outputPath,
        wordCount: markdown.split(/\s+/).length
      };

    } catch (error) {
      logger.error(`Scraping failed: ${jobId}`, error);

      this.jobs.set(jobId, {
        ...this.jobs.get(jobId),
        status: 'failed',
        error: error.message,
        endTime: new Date()
      });

      throw error;
    }
  }

  /**
   * Crawl multiple pages from a website
   * @param {string} startUrl - Starting URL
   * @param {object} options - Crawling options
   * @returns {Promise<object>} - Crawling result
   */
  async crawlWebsite(startUrl, options = {}) {
    const jobId = uuidv4();
    const {
      maxPages = 10,
      maxDepth = 2,
      sameDomain = true,
      selector = null,
      removeSelectors = ['script', 'style', 'nav', 'footer', 'iframe']
    } = options;

    // Initialize job status
    this.jobs.set(jobId, {
      id: jobId,
      status: 'processing',
      type: 'crawl',
      startUrl,
      startTime: new Date(),
      pagesProcessed: 0,
      error: null
    });

    logger.info(`Starting crawl job: ${jobId}`, { startUrl, maxPages, maxDepth });

    try {
      const visited = new Set();
      const toVisit = [{ url: startUrl, depth: 0 }];
      const results = [];
      const startDomain = new URL(startUrl).hostname;

      while (toVisit.length > 0 && visited.size < maxPages) {
        const { url, depth } = toVisit.shift();

        if (visited.has(url) || depth > maxDepth) {
          continue;
        }

        visited.add(url);

        try {
          // Scrape the page
          const result = await this.scrapeUrl(url, {
            selector,
            removeSelectors,
            timeout: 30000
          });

          results.push({
            url,
            title: result.title,
            wordCount: result.wordCount,
            outputFile: result.outputPath
          });

          // Extract links if not at max depth
          if (depth < maxDepth) {
            const response = await axios.get(url, {
              timeout: 30000,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
              }
            });

            const $ = cheerio.load(response.data);

            $('a[href]').each((_, element) => {
              try {
                const href = $(element).attr('href');
                const absoluteUrl = new URL(href, url).href;
                const linkDomain = new URL(absoluteUrl).hostname;

                // Check if same domain if required
                if (!sameDomain || linkDomain === startDomain) {
                  if (!visited.has(absoluteUrl) &&
                      absoluteUrl.startsWith('http') &&
                      !absoluteUrl.match(/\.(pdf|jpg|png|gif|zip|exe)$/i)) {
                    toVisit.push({ url: absoluteUrl, depth: depth + 1 });
                  }
                }
              } catch (e) {
                // Invalid URL, skip
              }
            });
          }

          // Update job progress
          this.jobs.set(jobId, {
            ...this.jobs.get(jobId),
            pagesProcessed: visited.size
          });

        } catch (error) {
          logger.warn(`Failed to scrape ${url}:`, error.message);
          results.push({
            url,
            error: error.message
          });
        }

        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Create combined markdown file
      const combinedMarkdown = this._createCombinedMarkdown(results, startUrl);
      const outputPath = path.join(config.outputsDir, `${jobId}_crawl.md`);
      fileHandler.writeFile(outputPath, combinedMarkdown);

      // Update job status
      this.jobs.set(jobId, {
        ...this.jobs.get(jobId),
        status: 'completed',
        outputFile: path.basename(outputPath),
        endTime: new Date(),
        pagesProcessed: results.length,
        pagesSuccessful: results.filter(r => !r.error).length,
        pagesFailed: results.filter(r => r.error).length
      });

      logger.info(`Crawling completed: ${jobId}`, {
        pagesProcessed: results.length,
        pagesSuccessful: results.filter(r => !r.error).length
      });

      return {
        jobId,
        status: 'completed',
        pagesProcessed: results.length,
        pagesSuccessful: results.filter(r => !r.error).length,
        pagesFailed: results.filter(r => r.error).length,
        results,
        outputPath
      };

    } catch (error) {
      logger.error(`Crawling failed: ${jobId}`, error);

      this.jobs.set(jobId, {
        ...this.jobs.get(jobId),
        status: 'failed',
        error: error.message,
        endTime: new Date()
      });

      throw error;
    }
  }

  /**
   * Create combined markdown from crawl results
   * @private
   */
  _createCombinedMarkdown(results, startUrl) {
    let markdown = `# Website Crawl Results\n\n`;
    markdown += `**Start URL:** ${startUrl}\n`;
    markdown += `**Crawled:** ${new Date().toISOString()}\n`;
    markdown += `**Total Pages:** ${results.length}\n`;
    markdown += `**Successful:** ${results.filter(r => !r.error).length}\n`;
    markdown += `**Failed:** ${results.filter(r => r.error).length}\n\n`;
    markdown += `---\n\n`;

    markdown += `## Table of Contents\n\n`;
    results.forEach((result, index) => {
      if (!result.error) {
        markdown += `${index + 1}. [${result.title || result.url}](#page-${index + 1})\n`;
      }
    });
    markdown += `\n---\n\n`;

    results.forEach((result, index) => {
      if (!result.error) {
        markdown += `## Page ${index + 1}\n\n`;
        markdown += `**URL:** ${result.url}\n`;
        markdown += `**Title:** ${result.title}\n`;
        markdown += `**Word Count:** ${result.wordCount}\n\n`;

        // Read the scraped content
        try {
          const content = fileHandler.readFile(result.outputFile);
          markdown += content + '\n\n';
          markdown += `---\n\n`;
        } catch (error) {
          markdown += `*Error reading content: ${error.message}*\n\n`;
        }
      } else {
        markdown += `## Failed: ${result.url}\n\n`;
        markdown += `**Error:** ${result.error}\n\n`;
        markdown += `---\n\n`;
      }
    });

    return markdown;
  }

  /**
   * Get job status
   */
  getJobStatus(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }
    return job;
  }

  /**
   * Get all jobs
   */
  getAllJobs() {
    return Array.from(this.jobs.values());
  }

  /**
   * Clear old jobs from memory
   */
  clearOldJobs(maxAgeMinutes = 60) {
    const now = Date.now();
    for (const [jobId, job] of this.jobs.entries()) {
      const ageMinutes = (now - new Date(job.startTime).getTime()) / (1000 * 60);
      if (ageMinutes > maxAgeMinutes) {
        this.jobs.delete(jobId);
        logger.debug(`Cleared old job: ${jobId}`);
      }
    }
  }
}

module.exports = new FirecrawlService();
