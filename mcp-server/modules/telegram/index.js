const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const logger = require('../common/logger');

class TelegramService {
  constructor(botToken) {
    this.botToken = botToken;
    this.apiUrl = `https://api.telegram.org/bot${botToken}`;
  }

  /**
   * Send text message to Telegram
   */
  async sendMessage(chatId, text, options = {}) {
    try {
      const response = await axios.post(`${this.apiUrl}/sendMessage`, {
        chat_id: chatId,
        text: text,
        parse_mode: options.parse_mode || 'Markdown',
        disable_web_page_preview: options.disable_preview || false,
        reply_to_message_id: options.reply_to
      });

      logger.info(`Message sent to Telegram chat ${chatId}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to send message to Telegram:`, error);
      throw error;
    }
  }

  /**
   * Send file to Telegram
   */
  async sendDocument(chatId, filePath, caption = '', options = {}) {
    try {
      const form = new FormData();
      form.append('chat_id', chatId);
      form.append('document', fs.createReadStream(filePath));
      if (caption) form.append('caption', caption);
      if (options.parse_mode) form.append('parse_mode', options.parse_mode);
      if (options.reply_to) form.append('reply_to_message_id', options.reply_to);

      const response = await axios.post(`${this.apiUrl}/sendDocument`, form, {
        headers: form.getHeaders()
      });

      logger.info(`Document sent to Telegram chat ${chatId}: ${path.basename(filePath)}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to send document to Telegram:`, error);
      throw error;
    }
  }

  /**
   * Download file from Telegram
   */
  async downloadFile(fileId, outputPath) {
    try {
      // Get file info
      const fileInfo = await axios.get(`${this.apiUrl}/getFile?file_id=${fileId}`);
      const filePath = fileInfo.data.result.file_path;

      // Download file
      const fileUrl = `https://api.telegram.org/file/bot${this.botToken}/${filePath}`;
      const response = await axios.get(fileUrl, { responseType: 'stream' });

      // Save to disk
      const writer = fs.createWriteStream(outputPath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          logger.info(`File downloaded from Telegram: ${outputPath}`);
          resolve(outputPath);
        });
        writer.on('error', reject);
      });
    } catch (error) {
      logger.error(`Failed to download file from Telegram:`, error);
      throw error;
    }
  }

  /**
   * Set webhook
   */
  async setWebhook(webhookUrl) {
    try {
      const response = await axios.post(`${this.apiUrl}/setWebhook`, {
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query']
      });

      logger.info(`Telegram webhook set to: ${webhookUrl}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to set webhook:`, error);
      throw error;
    }
  }

  /**
   * Delete webhook
   */
  async deleteWebhook() {
    try {
      const response = await axios.post(`${this.apiUrl}/deleteWebhook`);
      logger.info(`Telegram webhook deleted`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to delete webhook:`, error);
      throw error;
    }
  }

  /**
   * Get bot info
   */
  async getMe() {
    try {
      const response = await axios.get(`${this.apiUrl}/getMe`);
      return response.data.result;
    } catch (error) {
      logger.error(`Failed to get bot info:`, error);
      throw error;
    }
  }

  /**
   * Send typing action
   */
  async sendChatAction(chatId, action = 'typing') {
    try {
      await axios.post(`${this.apiUrl}/sendChatAction`, {
        chat_id: chatId,
        action: action // typing, upload_document, upload_photo, etc.
      });
    } catch (error) {
      logger.error(`Failed to send chat action:`, error);
    }
  }
}

module.exports = TelegramService;
