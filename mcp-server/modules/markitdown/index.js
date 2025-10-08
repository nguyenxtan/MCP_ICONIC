const { spawn } = require('child_process');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const logger = require('../common/logger');
const fileHandler = require('../common/fileHandler');
const config = require('../../config');

class MarkItDownService {
  constructor() {
    this.jobs = new Map(); // Lưu trạng thái các job conversion
    
    // Ensure directories exist
    fileHandler.ensureDir(config.uploadsDir);
    fileHandler.ensureDir(config.outputsDir);
    
    // Cleanup old files every 30 minutes
    setInterval(() => {
      fileHandler.cleanupOldFiles(config.uploadsDir, 60);
      fileHandler.cleanupOldFiles(config.outputsDir, 60);
    }, 30 * 60 * 1000);
  }
  
  /**
   * Convert file to Markdown using MarkItDown
   * @param {string} inputPath - Path to input file
   * @param {object} options - Conversion options
   * @returns {Promise<object>} - Conversion result
   */
  async convertFile(inputPath, options = {}) {
    const jobId = uuidv4();
    const outputPath = path.join(config.outputsDir, `${jobId}.md`);
    
    // Initialize job status
    this.jobs.set(jobId, {
      id: jobId,
      status: 'processing',
      inputFile: path.basename(inputPath),
      startTime: new Date(),
      error: null
    });
    
    logger.info(`Starting conversion job: ${jobId}`, { inputPath });
    
    try {
      // Execute MarkItDown via Python
      const markdown = await this._executeMarkItDown(inputPath, outputPath, options);
      
      // Save markdown to file
      fileHandler.writeFile(outputPath, markdown);
      
      // Update job status
      this.jobs.set(jobId, {
        ...this.jobs.get(jobId),
        status: 'completed',
        outputFile: path.basename(outputPath),
        endTime: new Date(),
        markdown: markdown.substring(0, 500) + '...' // Preview
      });
      
      logger.info(`Conversion completed: ${jobId}`);
      
      return {
        jobId,
        status: 'completed',
        markdown,
        outputPath
      };
      
    } catch (error) {
      logger.error(`Conversion failed: ${jobId}`, error);
      
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
   * Execute MarkItDown Python command
   * @private
   */
  _executeMarkItDown(inputPath, outputPath, options) {
    return new Promise((resolve, reject) => {
      // MarkItDown command: markitdown input.pdf -o output.md
      const args = ['-m', 'markitdown', inputPath, '-o', outputPath];
      
      logger.debug('Executing MarkItDown', { 
        command: config.markitdown.pythonCommand,
        args 
      });
      
      const process = spawn(config.markitdown.pythonCommand, args);
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        if (code !== 0) {
          logger.error('MarkItDown process failed', { code, stderr });
          reject(new Error(`MarkItDown failed with code ${code}: ${stderr}`));
          return;
        }
        
        // Read the generated markdown file
        try {
          const markdown = fileHandler.readFile(outputPath);
          resolve(markdown);
        } catch (error) {
          reject(new Error(`Failed to read output file: ${error.message}`));
        }
      });
      
      process.on('error', (error) => {
        logger.error('Failed to start MarkItDown process', error);
        reject(new Error(`Failed to execute MarkItDown: ${error.message}`));
      });
      
      // Timeout handling
      setTimeout(() => {
        process.kill();
        reject(new Error('MarkItDown conversion timeout'));
      }, config.markitdown.timeout);
    });
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

module.exports = new MarkItDownService();