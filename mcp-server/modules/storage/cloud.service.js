const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const logger = require('../common/logger');
const config = require('../../config');

class CloudStorageService {
  constructor() {
    this.s3Client = null;
    this.driveClient = null;
    this._initClients();
  }

  /**
   * Initialize cloud storage clients
   * @private
   */
  _initClients() {
    // Initialize S3 client
    if (config.storage.s3.enabled && config.storage.s3.accessKeyId) {
      this.s3Client = new S3Client({
        region: config.storage.s3.region,
        credentials: {
          accessKeyId: config.storage.s3.accessKeyId,
          secretAccessKey: config.storage.s3.secretAccessKey
        }
      });
      logger.info('S3 client initialized');
    }

    // Initialize Google Drive client
    if (config.storage.googleDrive.enabled && config.storage.googleDrive.credentials) {
      try {
        const auth = new google.auth.GoogleAuth({
          credentials: JSON.parse(config.storage.googleDrive.credentials),
          scopes: ['https://www.googleapis.com/auth/drive.file']
        });

        this.driveClient = google.drive({ version: 'v3', auth });
        logger.info('Google Drive client initialized');
      } catch (error) {
        logger.error('Failed to initialize Google Drive client', error);
      }
    }
  }

  /**
   * Upload file to S3
   * @param {string} filePath - Local file path
   * @param {string} s3Key - S3 object key
   * @param {object} options - Upload options
   * @returns {Promise<object>} - Upload result
   */
  async uploadToS3(filePath, s3Key, options = {}) {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized. Check your configuration.');
    }

    const {
      bucket = config.storage.s3.bucket,
      contentType = 'application/octet-stream',
      makePublic = false
    } = options;

    try {
      logger.info('Uploading to S3', { filePath, s3Key, bucket });

      const fileContent = fs.readFileSync(filePath);

      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: s3Key,
        Body: fileContent,
        ContentType: contentType,
        ACL: makePublic ? 'public-read' : 'private'
      });

      await this.s3Client.send(command);

      const url = makePublic
        ? `https://${bucket}.s3.${config.storage.s3.region}.amazonaws.com/${s3Key}`
        : null;

      logger.info('S3 upload completed', { s3Key, url });

      return {
        success: true,
        provider: 's3',
        bucket,
        key: s3Key,
        url,
        region: config.storage.s3.region
      };

    } catch (error) {
      logger.error('S3 upload failed', error);
      throw new Error(`S3 upload failed: ${error.message}`);
    }
  }

  /**
   * Upload file to Google Drive
   * @param {string} filePath - Local file path
   * @param {string} fileName - File name in Drive
   * @param {object} options - Upload options
   * @returns {Promise<object>} - Upload result
   */
  async uploadToGoogleDrive(filePath, fileName, options = {}) {
    if (!this.driveClient) {
      throw new Error('Google Drive client not initialized. Check your configuration.');
    }

    const {
      folderId = config.storage.googleDrive.folderId,
      mimeType = 'application/octet-stream',
      makePublic = false
    } = options;

    try {
      logger.info('Uploading to Google Drive', { filePath, fileName });

      const fileMetadata = {
        name: fileName,
        parents: folderId ? [folderId] : []
      };

      const media = {
        mimeType,
        body: fs.createReadStream(filePath)
      };

      const response = await this.driveClient.files.create({
        requestBody: fileMetadata,
        media,
        fields: 'id, name, webViewLink, webContentLink'
      });

      const file = response.data;

      // Make file public if requested
      if (makePublic) {
        await this.driveClient.permissions.create({
          fileId: file.id,
          requestBody: {
            role: 'reader',
            type: 'anyone'
          }
        });
      }

      logger.info('Google Drive upload completed', {
        fileId: file.id,
        fileName: file.name
      });

      return {
        success: true,
        provider: 'google-drive',
        fileId: file.id,
        fileName: file.name,
        webViewLink: file.webViewLink,
        webContentLink: file.webContentLink
      };

    } catch (error) {
      logger.error('Google Drive upload failed', error);
      throw new Error(`Google Drive upload failed: ${error.message}`);
    }
  }

  /**
   * Upload file to cloud storage (auto-select provider)
   * @param {string} filePath - Local file path
   * @param {string} filename - File name
   * @param {object} options - Upload options
   * @returns {Promise<object>} - Upload result
   */
  async upload(filePath, filename, options = {}) {
    const { provider = 'auto' } = options;

    // Auto-select provider
    let selectedProvider = provider;
    if (provider === 'auto') {
      if (this.s3Client && config.storage.s3.enabled) {
        selectedProvider = 's3';
      } else if (this.driveClient && config.storage.googleDrive.enabled) {
        selectedProvider = 'google-drive';
      } else {
        throw new Error('No cloud storage provider configured');
      }
    }

    // Upload based on provider
    switch (selectedProvider) {
      case 's3':
        return this.uploadToS3(filePath, filename, options);

      case 'google-drive':
        return this.uploadToGoogleDrive(filePath, filename, options);

      default:
        throw new Error(`Unsupported storage provider: ${selectedProvider}`);
    }
  }

  /**
   * Delete file from S3
   * @param {string} s3Key - S3 object key
   * @param {string} bucket - S3 bucket
   * @returns {Promise<object>} - Delete result
   */
  async deleteFromS3(s3Key, bucket = config.storage.s3.bucket) {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized');
    }

    try {
      logger.info('Deleting from S3', { s3Key, bucket });

      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: s3Key
      });

      await this.s3Client.send(command);

      logger.info('S3 delete completed', { s3Key });

      return { success: true, provider: 's3', key: s3Key };

    } catch (error) {
      logger.error('S3 delete failed', error);
      throw new Error(`S3 delete failed: ${error.message}`);
    }
  }

  /**
   * Delete file from Google Drive
   * @param {string} fileId - Google Drive file ID
   * @returns {Promise<object>} - Delete result
   */
  async deleteFromGoogleDrive(fileId) {
    if (!this.driveClient) {
      throw new Error('Google Drive client not initialized');
    }

    try {
      logger.info('Deleting from Google Drive', { fileId });

      await this.driveClient.files.delete({
        fileId
      });

      logger.info('Google Drive delete completed', { fileId });

      return { success: true, provider: 'google-drive', fileId };

    } catch (error) {
      logger.error('Google Drive delete failed', error);
      throw new Error(`Google Drive delete failed: ${error.message}`);
    }
  }

  /**
   * Get list of configured storage providers
   * @returns {Array} - List of providers
   */
  getAvailableProviders() {
    const providers = [];

    if (this.s3Client && config.storage.s3.enabled) {
      providers.push({
        name: 's3',
        displayName: 'Amazon S3',
        configured: true,
        bucket: config.storage.s3.bucket,
        region: config.storage.s3.region
      });
    }

    if (this.driveClient && config.storage.googleDrive.enabled) {
      providers.push({
        name: 'google-drive',
        displayName: 'Google Drive',
        configured: true,
        folderId: config.storage.googleDrive.folderId
      });
    }

    return providers;
  }
}

module.exports = new CloudStorageService();
