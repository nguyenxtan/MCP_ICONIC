const axios = require('axios');
const logger = require('../common/logger');
const config = require('../../config');

class SummarizationService {
  constructor() {
    this.config = config.ai.summarization;
  }

  /**
   * Summarize text/markdown content
   * @param {string} content - Content to summarize
   * @param {object} options - Summarization options
   * @returns {Promise<object>} - Summarization result
   */
  async summarize(content, options = {}) {
    const {
      maxLength = 'short', // short, medium, long
      style = 'bullet_points', // bullet_points, paragraph, executive
      language = 'en'
    } = options;

    try {
      logger.info('Summarizing content', {
        contentLength: content.length,
        maxLength,
        style
      });

      if (!this.config.apiKey) {
        throw new Error('OpenAI API key not configured');
      }

      const prompt = this._buildSummarizationPrompt(content, maxLength, style, language);

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: this.config.model,
          messages: [
            {
              role: 'system',
              content: 'You are a professional content summarizer. Create clear, concise summaries while preserving key information.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const summary = response.data.choices[0].message.content;

      logger.info('Summarization completed', {
        originalLength: content.length,
        summaryLength: summary.length,
        tokensUsed: response.data.usage.total_tokens
      });

      return {
        summary,
        originalLength: content.length,
        summaryLength: summary.length,
        tokensUsed: response.data.usage.total_tokens,
        model: this.config.model
      };

    } catch (error) {
      logger.error('Summarization failed', error);
      throw new Error(`Summarization failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Build summarization prompt based on options
   * @private
   */
  _buildSummarizationPrompt(content, maxLength, style, language) {
    const lengthGuide = {
      short: '3-5 sentences or 3-5 bullet points',
      medium: '1-2 paragraphs or 5-10 bullet points',
      long: '2-3 paragraphs or 10-15 bullet points'
    };

    const styleGuide = {
      bullet_points: 'Format the summary as clear, concise bullet points.',
      paragraph: 'Format the summary as well-structured paragraphs.',
      executive: 'Format as an executive summary with key highlights, main points, and actionable insights.'
    };

    let prompt = `Please summarize the following content:\n\n`;
    prompt += `Length: ${lengthGuide[maxLength]}\n`;
    prompt += `Style: ${styleGuide[style]}\n`;

    if (language !== 'en') {
      prompt += `Output language: ${language}\n`;
    }

    prompt += `\n---\n\n${content}\n\n---\n\n`;
    prompt += `Summary:`;

    return prompt;
  }

  /**
   * Summarize by extracting key points
   * @param {string} content - Content to analyze
   * @returns {Promise<object>} - Key points extraction result
   */
  async extractKeyPoints(content) {
    try {
      logger.info('Extracting key points', { contentLength: content.length });

      if (!this.config.apiKey) {
        throw new Error('OpenAI API key not configured');
      }

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: this.config.model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert at identifying and extracting key points from content. Return only the most important points in a clear, structured format.'
            },
            {
              role: 'user',
              content: `Extract the key points from the following content. Format as a JSON array of strings, where each string is one key point:\n\n${content}`
            }
          ],
          max_tokens: this.config.maxTokens,
          temperature: 0.2,
          response_format: { type: "json_object" }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = JSON.parse(response.data.choices[0].message.content);

      logger.info('Key points extraction completed', {
        keyPoints: result.keyPoints?.length || 0
      });

      return {
        keyPoints: result.keyPoints || result.key_points || [],
        tokensUsed: response.data.usage.total_tokens
      };

    } catch (error) {
      logger.error('Key points extraction failed', error);
      throw new Error(`Key points extraction failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }
}

module.exports = new SummarizationService();
