const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const logger = require('../common/logger');
const config = require('../../config');

class BatchService {
  constructor() {
    this.jobs = new Map();

    // Cleanup old jobs every hour
    setInterval(() => {
      this.clearOldJobs(120); // 2 hours
    }, 60 * 60 * 1000);
  }

  /**
   * Create a batch job
   * @param {Array} files - Files to process
   * @param {string} operation - Operation type
   * @param {object} options - Processing options
   * @returns {string} - Job ID
   */
  createJob(files, operation, options = {}) {
    const jobId = uuidv4();

    this.jobs.set(jobId, {
      id: jobId,
      operation,
      status: 'pending',
      totalFiles: files.length,
      processedFiles: 0,
      successfulFiles: 0,
      failedFiles: 0,
      files: files.map(f => ({
        originalName: f.originalname || f.name,
        path: f.path,
        status: 'pending',
        error: null,
        outputPath: null
      })),
      options,
      createdAt: new Date(),
      startedAt: null,
      completedAt: null,
      results: []
    });

    logger.info(`Created batch job: ${jobId}`, {
      operation,
      totalFiles: files.length
    });

    return jobId;
  }

  /**
   * Process batch job
   * @param {string} jobId - Job ID
   * @param {Function} processFn - Processing function
   * @returns {Promise<object>} - Job result
   */
  async processJob(jobId, processFn) {
    const job = this.jobs.get(jobId);

    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    try {
      // Update job status
      job.status = 'processing';
      job.startedAt = new Date();

      logger.info(`Starting batch job processing: ${jobId}`);

      // Process each file
      for (let i = 0; i < job.files.length; i++) {
        const file = job.files[i];

        try {
          logger.info(`Processing file ${i + 1}/${job.files.length}`, {
            filename: file.originalName
          });

          // Update file status
          file.status = 'processing';

          // Process file
          const result = await processFn(file, job.options);

          // Update file status
          file.status = 'completed';
          file.outputPath = result.outputPath;
          job.successfulFiles++;

          job.results.push({
            success: true,
            originalFile: file.originalName,
            outputPath: result.outputPath,
            metadata: result.metadata || {}
          });

        } catch (error) {
          logger.error(`Failed to process file: ${file.originalName}`, error);

          file.status = 'failed';
          file.error = error.message;
          job.failedFiles++;

          job.results.push({
            success: false,
            originalFile: file.originalName,
            error: error.message
          });
        }

        job.processedFiles++;
      }

      // Update job status
      job.status = 'completed';
      job.completedAt = new Date();

      logger.info(`Batch job completed: ${jobId}`, {
        successful: job.successfulFiles,
        failed: job.failedFiles
      });

      return this.getJobStatus(jobId);

    } catch (error) {
      logger.error(`Batch job failed: ${jobId}`, error);

      job.status = 'failed';
      job.completedAt = new Date();
      job.error = error.message;

      throw error;
    }
  }

  /**
   * Get job status
   * @param {string} jobId - Job ID
   * @returns {object} - Job status
   */
  getJobStatus(jobId) {
    const job = this.jobs.get(jobId);

    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    return {
      id: job.id,
      operation: job.operation,
      status: job.status,
      totalFiles: job.totalFiles,
      processedFiles: job.processedFiles,
      successfulFiles: job.successfulFiles,
      failedFiles: job.failedFiles,
      progress: job.totalFiles > 0 ? Math.round((job.processedFiles / job.totalFiles) * 100) : 0,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      duration: job.completedAt && job.startedAt
        ? job.completedAt - job.startedAt
        : null,
      error: job.error,
      results: job.results
    };
  }

  /**
   * Create ZIP archive from batch results
   * @param {string} jobId - Job ID
   * @param {string} outputPath - Output ZIP path
   * @returns {Promise<string>} - ZIP file path
   */
  async createZipArchive(jobId, outputPath) {
    const job = this.jobs.get(jobId);

    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    if (job.status !== 'completed') {
      throw new Error(`Job is not completed yet: ${job.status}`);
    }

    try {
      logger.info(`Creating ZIP archive for job: ${jobId}`, { outputPath });

      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });

      return new Promise((resolve, reject) => {
        output.on('close', () => {
          logger.info(`ZIP archive created: ${outputPath}`, {
            size: archive.pointer()
          });
          resolve(outputPath);
        });

        archive.on('error', (error) => {
          logger.error('ZIP archive creation failed', error);
          reject(error);
        });

        archive.pipe(output);

        // Add successful files to archive
        for (const result of job.results) {
          if (result.success && result.outputPath && fs.existsSync(result.outputPath)) {
            const filename = path.basename(result.outputPath);
            archive.file(result.outputPath, { name: filename });
          }
        }

        // Add manifest
        const manifest = {
          jobId: job.id,
          operation: job.operation,
          totalFiles: job.totalFiles,
          successfulFiles: job.successfulFiles,
          failedFiles: job.failedFiles,
          createdAt: job.createdAt,
          results: job.results
        };

        archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });

        archive.finalize();
      });

    } catch (error) {
      logger.error('Failed to create ZIP archive', error);
      throw new Error(`ZIP archive creation failed: ${error.message}`);
    }
  }

  /**
   * Get all jobs
   * @returns {Array} - All jobs
   */
  getAllJobs() {
    return Array.from(this.jobs.values()).map(job => ({
      id: job.id,
      operation: job.operation,
      status: job.status,
      totalFiles: job.totalFiles,
      processedFiles: job.processedFiles,
      successfulFiles: job.successfulFiles,
      failedFiles: job.failedFiles,
      createdAt: job.createdAt,
      completedAt: job.completedAt
    }));
  }

  /**
   * Clear old jobs from memory
   * @param {number} maxAgeMinutes - Maximum age in minutes
   */
  clearOldJobs(maxAgeMinutes = 120) {
    const now = Date.now();
    let cleared = 0;

    for (const [jobId, job] of this.jobs.entries()) {
      const age = (now - new Date(job.createdAt).getTime()) / (1000 * 60);

      if (age > maxAgeMinutes && job.status === 'completed') {
        this.jobs.delete(jobId);
        cleared++;
        logger.debug(`Cleared old job: ${jobId}`);
      }
    }

    if (cleared > 0) {
      logger.info(`Cleared ${cleared} old jobs`);
    }
  }

  /**
   * Delete job
   * @param {string} jobId - Job ID
   */
  deleteJob(jobId) {
    const job = this.jobs.get(jobId);

    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    this.jobs.delete(jobId);
    logger.info(`Deleted job: ${jobId}`);
  }
}

module.exports = new BatchService();
