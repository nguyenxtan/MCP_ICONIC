const axios = require('axios');
const logger = require('../common/logger');
const config = require('../../config');

class TranslationService {
  constructor() {
    this.config = config.ai.translation;
  }

  /**
   * Translate text to target language
   * @param {string} text - Text to translate
   * @param {string} targetLang - Target language code
   * @param {object} options - Translation options
   * @returns {Promise<object>} - Translation result
   */
  async translate(text, targetLang, options = {}) {
    const {
      sourceLang = 'auto',
      preserveFormatting = true,
      provider = this.config.provider
    } = options;

    try {
      logger.info('Translating text', {
        textLength: text.length,
        sourceLang,
        targetLang,
        provider
      });

      // Validate target language
      if (!this.config.supportedLanguages.includes(targetLang)) {
        throw new Error(`Unsupported target language: ${targetLang}. Supported: ${this.config.supportedLanguages.join(', ')}`);
      }

      let result;

      switch (provider) {
        case 'google':
          result = await this._translateWithGoogle(text, targetLang, sourceLang);
          break;
        case 'openai':
          result = await this._translateWithOpenAI(text, targetLang, sourceLang, preserveFormatting);
          break;
        default:
          throw new Error(`Unsupported translation provider: ${provider}`);
      }

      logger.info('Translation completed', {
        translatedLength: result.translatedText.length,
        detectedLang: result.detectedSourceLang
      });

      return result;

    } catch (error) {
      logger.error('Translation failed', error);
      throw new Error(`Translation failed: ${error.message}`);
    }
  }

  /**
   * Translate using Google Translate API
   * @private
   */
  async _translateWithGoogle(text, targetLang, sourceLang) {
    try {
      if (!this.config.apiKey) {
        throw new Error('Google Translate API key not configured');
      }

      const response = await axios.post(
        'https://translation.googleapis.com/language/translate/v2',
        null,
        {
          params: {
            q: text,
            target: targetLang,
            source: sourceLang === 'auto' ? undefined : sourceLang,
            key: this.config.apiKey,
            format: 'text'
          }
        }
      );

      const translation = response.data.data.translations[0];

      return {
        translatedText: translation.translatedText,
        detectedSourceLang: translation.detectedSourceLanguage || sourceLang,
        provider: 'google'
      };

    } catch (error) {
      throw new Error(`Google Translate error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Translate using OpenAI (better for preserving markdown formatting)
   * @private
   */
  async _translateWithOpenAI(text, targetLang, sourceLang, preserveFormatting) {
    try {
      const apiKey = config.ai.summarization.apiKey; // Reuse OpenAI key from summarization

      if (!apiKey) {
        throw new Error('OpenAI API key not configured');
      }

      const languageNames = {
        en: 'English',
        vi: 'Vietnamese',
        zh: 'Chinese',
        ja: 'Japanese',
        ko: 'Korean',
        fr: 'French',
        es: 'Spanish',
        de: 'German'
      };

      const targetLanguageName = languageNames[targetLang] || targetLang;
      const sourceLanguageName = sourceLang === 'auto' ? 'the source language' : (languageNames[sourceLang] || sourceLang);

      let systemPrompt = `You are a professional translator. Translate the text to ${targetLanguageName}.`;

      if (preserveFormatting) {
        systemPrompt += ' IMPORTANT: Preserve all markdown formatting, code blocks, links, and structure exactly as they appear. Only translate the actual text content.';
      }

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: config.ai.summarization.model,
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: text
            }
          ],
          temperature: 0.3
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const translatedText = response.data.choices[0].message.content;

      return {
        translatedText,
        detectedSourceLang: sourceLang,
        provider: 'openai',
        tokensUsed: response.data.usage.total_tokens
      };

    } catch (error) {
      throw new Error(`OpenAI translation error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Batch translate multiple texts
   * @param {Array<string>} texts - Array of texts to translate
   * @param {string} targetLang - Target language code
   * @param {object} options - Translation options
   * @returns {Promise<Array>} - Array of translation results
   */
  async batchTranslate(texts, targetLang, options = {}) {
    logger.info('Batch translating', { count: texts.length, targetLang });

    const results = [];

    for (const text of texts) {
      try {
        const result = await this.translate(text, targetLang, options);
        results.push({
          success: true,
          original: text,
          translated: result.translatedText,
          detectedLang: result.detectedSourceLang
        });
      } catch (error) {
        results.push({
          success: false,
          original: text,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Get list of supported languages
   * @returns {Array} - Supported language codes
   */
  getSupportedLanguages() {
    return this.config.supportedLanguages;
  }
}

module.exports = new TranslationService();
