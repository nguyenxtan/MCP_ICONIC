const batchService = require('../modules/batch/batch.service');
const path = require('path');
const fs = require('fs');

describe('Batch Service', () => {
  const testOutputDir = path.join(__dirname, '../test-outputs');

  beforeAll(() => {
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clear all jobs after each test
    const jobs = batchService.getAllJobs();
    jobs.forEach(job => {
      try {
        batchService.deleteJob(job.id);
      } catch (e) {
        // Ignore
      }
    });
  });

  describe('Create Job', () => {
    test('should create a batch job', () => {
      const files = [
        { originalname: 'file1.md', path: '/tmp/file1.md' },
        { originalname: 'file2.md', path: '/tmp/file2.md' }
      ];

      const jobId = batchService.createJob(files, 'md-to-pdf', {
        theme: 'default'
      });

      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');

      const status = batchService.getJobStatus(jobId);
      expect(status.status).toBe('pending');
      expect(status.totalFiles).toBe(2);
      expect(status.processedFiles).toBe(0);
    });

    test('should store operation and options', () => {
      const files = [{ originalname: 'test.md', path: '/tmp/test.md' }];
      const options = { theme: 'dark', format: 'A4' };

      const jobId = batchService.createJob(files, 'md-to-pdf', options);

      const status = batchService.getJobStatus(jobId);
      expect(status.operation).toBe('md-to-pdf');
    });
  });

  describe('Process Job', () => {
    test('should process job with mock processor', async () => {
      const files = [
        { originalname: 'file1.txt', path: '/tmp/file1.txt' },
        { originalname: 'file2.txt', path: '/tmp/file2.txt' }
      ];

      const jobId = batchService.createJob(files, 'test-operation');

      // Mock processor function
      const mockProcessor = jest.fn().mockResolvedValue({
        outputPath: path.join(testOutputDir, 'output.txt'),
        metadata: { processed: true }
      });

      const result = await batchService.processJob(jobId, mockProcessor);

      expect(result.status).toBe('completed');
      expect(result.processedFiles).toBe(2);
      expect(result.successfulFiles).toBe(2);
      expect(result.failedFiles).toBe(0);
      expect(mockProcessor).toHaveBeenCalledTimes(2);
    });

    test('should handle processing errors gracefully', async () => {
      const files = [
        { originalname: 'file1.txt', path: '/tmp/file1.txt' },
        { originalname: 'file2.txt', path: '/tmp/file2.txt' }
      ];

      const jobId = batchService.createJob(files, 'test-operation');

      // Mock processor that fails on second file
      const mockProcessor = jest.fn()
        .mockResolvedValueOnce({
          outputPath: path.join(testOutputDir, 'output1.txt'),
          metadata: {}
        })
        .mockRejectedValueOnce(new Error('Processing failed'));

      const result = await batchService.processJob(jobId, mockProcessor);

      expect(result.status).toBe('completed');
      expect(result.processedFiles).toBe(2);
      expect(result.successfulFiles).toBe(1);
      expect(result.failedFiles).toBe(1);
      expect(result.results.length).toBe(2);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(false);
      expect(result.results[1].error).toContain('Processing failed');
    });

    test('should update job progress during processing', async () => {
      const files = [
        { originalname: 'file1.txt', path: '/tmp/file1.txt' },
        { originalname: 'file2.txt', path: '/tmp/file2.txt' },
        { originalname: 'file3.txt', path: '/tmp/file3.txt' }
      ];

      const jobId = batchService.createJob(files, 'test-operation');

      const mockProcessor = jest.fn().mockImplementation(async () => {
        const status = batchService.getJobStatus(jobId);
        expect(status.status).toBe('processing');
        return {
          outputPath: path.join(testOutputDir, 'output.txt'),
          metadata: {}
        };
      });

      await batchService.processJob(jobId, mockProcessor);

      const finalStatus = batchService.getJobStatus(jobId);
      expect(finalStatus.progress).toBe(100);
    });
  });

  describe('Get Job Status', () => {
    test('should get job status', () => {
      const files = [{ originalname: 'test.txt', path: '/tmp/test.txt' }];
      const jobId = batchService.createJob(files, 'test-op');

      const status = batchService.getJobStatus(jobId);

      expect(status).toHaveProperty('id');
      expect(status).toHaveProperty('operation');
      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('totalFiles');
      expect(status).toHaveProperty('processedFiles');
      expect(status).toHaveProperty('successfulFiles');
      expect(status).toHaveProperty('failedFiles');
      expect(status).toHaveProperty('progress');
      expect(status).toHaveProperty('createdAt');
    });

    test('should throw error for non-existent job', () => {
      expect(() => {
        batchService.getJobStatus('non-existent-job-id');
      }).toThrow('Job not found');
    });

    test('should calculate progress correctly', async () => {
      const files = [
        { originalname: 'file1.txt', path: '/tmp/file1.txt' },
        { originalname: 'file2.txt', path: '/tmp/file2.txt' },
        { originalname: 'file3.txt', path: '/tmp/file3.txt' },
        { originalname: 'file4.txt', path: '/tmp/file4.txt' }
      ];

      const jobId = batchService.createJob(files, 'test-operation');

      const mockProcessor = jest.fn().mockResolvedValue({
        outputPath: path.join(testOutputDir, 'output.txt'),
        metadata: {}
      });

      await batchService.processJob(jobId, mockProcessor);

      const status = batchService.getJobStatus(jobId);
      expect(status.progress).toBe(100);
    });
  });

  describe('Get All Jobs', () => {
    test('should list all jobs', () => {
      const files1 = [{ originalname: 'file1.txt', path: '/tmp/file1.txt' }];
      const files2 = [{ originalname: 'file2.txt', path: '/tmp/file2.txt' }];

      const jobId1 = batchService.createJob(files1, 'op1');
      const jobId2 = batchService.createJob(files2, 'op2');

      const jobs = batchService.getAllJobs();

      expect(jobs.length).toBeGreaterThanOrEqual(2);

      const jobIds = jobs.map(j => j.id);
      expect(jobIds).toContain(jobId1);
      expect(jobIds).toContain(jobId2);
    });

    test('should return empty array when no jobs', () => {
      const jobs = batchService.getAllJobs();
      expect(Array.isArray(jobs)).toBe(true);
    });
  });

  describe('Delete Job', () => {
    test('should delete job', () => {
      const files = [{ originalname: 'test.txt', path: '/tmp/test.txt' }];
      const jobId = batchService.createJob(files, 'test-op');

      batchService.deleteJob(jobId);

      expect(() => {
        batchService.getJobStatus(jobId);
      }).toThrow('Job not found');
    });

    test('should throw error when deleting non-existent job', () => {
      expect(() => {
        batchService.deleteJob('non-existent-job');
      }).toThrow('Job not found');
    });
  });

  describe('Create ZIP Archive', () => {
    test('should create ZIP from completed job', async () => {
      // Create test output files
      const outputFile1 = path.join(testOutputDir, 'output1.txt');
      const outputFile2 = path.join(testOutputDir, 'output2.txt');

      fs.writeFileSync(outputFile1, 'Test content 1');
      fs.writeFileSync(outputFile2, 'Test content 2');

      const files = [
        { originalname: 'file1.txt', path: '/tmp/file1.txt' },
        { originalname: 'file2.txt', path: '/tmp/file2.txt' }
      ];

      const jobId = batchService.createJob(files, 'test-op');

      // Process job
      const mockProcessor = jest.fn()
        .mockResolvedValueOnce({ outputPath: outputFile1, metadata: {} })
        .mockResolvedValueOnce({ outputPath: outputFile2, metadata: {} });

      await batchService.processJob(jobId, mockProcessor);

      // Create ZIP
      const zipPath = path.join(testOutputDir, 'test.zip');
      const result = await batchService.createZipArchive(jobId, zipPath);

      expect(result).toBe(zipPath);
      expect(fs.existsSync(zipPath)).toBe(true);

      const stats = fs.statSync(zipPath);
      expect(stats.size).toBeGreaterThan(0);
    });

    test('should throw error for non-completed job', async () => {
      const files = [{ originalname: 'test.txt', path: '/tmp/test.txt' }];
      const jobId = batchService.createJob(files, 'test-op');

      const zipPath = path.join(testOutputDir, 'test.zip');

      await expect(
        batchService.createZipArchive(jobId, zipPath)
      ).rejects.toThrow('not completed');
    });
  });

  describe('Clear Old Jobs', () => {
    test('should clear jobs older than specified age', () => {
      const files = [{ originalname: 'test.txt', path: '/tmp/test.txt' }];
      const jobId = batchService.createJob(files, 'test-op');

      // Manually set old creation time
      const job = batchService.jobs.get(jobId);
      job.createdAt = new Date(Date.now() - 3 * 60 * 60 * 1000); // 3 hours ago
      job.status = 'completed';

      batchService.clearOldJobs(120); // Clear jobs older than 2 hours

      expect(() => {
        batchService.getJobStatus(jobId);
      }).toThrow('Job not found');
    });

    test('should not clear recent jobs', () => {
      const files = [{ originalname: 'test.txt', path: '/tmp/test.txt' }];
      const jobId = batchService.createJob(files, 'test-op');

      const job = batchService.jobs.get(jobId);
      job.status = 'completed';

      batchService.clearOldJobs(120);

      // Should still exist
      const status = batchService.getJobStatus(jobId);
      expect(status.id).toBe(jobId);
    });

    test('should not clear jobs that are not completed', () => {
      const files = [{ originalname: 'test.txt', path: '/tmp/test.txt' }];
      const jobId = batchService.createJob(files, 'test-op');

      const job = batchService.jobs.get(jobId);
      job.createdAt = new Date(Date.now() - 3 * 60 * 60 * 1000);
      job.status = 'processing'; // Not completed

      batchService.clearOldJobs(120);

      // Should still exist because it's not completed
      const status = batchService.getJobStatus(jobId);
      expect(status.id).toBe(jobId);
    });
  });
});
