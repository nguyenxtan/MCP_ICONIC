const axios = require('axios');
const logger = require('../common/logger');
const config = require('../../config');

class AnalysisService {
  constructor() {
    this.config = config.ai.analysis;
  }

  /**
   * Perform comprehensive content analysis
   * @param {string} content - Content to analyze
   * @param {object} options - Analysis options
   * @returns {Promise<object>} - Analysis result
   */
  async analyze(content, options = {}) {
    const {
      features = this.config.features
    } = options;

    try {
      logger.info('Analyzing content', {
        contentLength: content.length,
        features
      });

      if (!this.config.apiKey) {
        throw new Error('OpenAI API key not configured');
      }

      const prompt = this._buildAnalysisPrompt(content, features);

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: this.config.model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert content analyst. Analyze the provided content and return structured JSON results.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          response_format: { type: "json_object" }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const analysis = JSON.parse(response.data.choices[0].message.content);

      logger.info('Content analysis completed', {
        tokensUsed: response.data.usage.total_tokens
      });

      return {
        ...analysis,
        tokensUsed: response.data.usage.total_tokens,
        model: this.config.model
      };

    } catch (error) {
      logger.error('Content analysis failed', error);
      throw new Error(`Content analysis failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Build analysis prompt based on requested features
   * @private
   */
  _buildAnalysisPrompt(content, features) {
    let prompt = `Analyze the following content and provide structured JSON output with these fields:\n\n`;

    const schema = {};

    if (features.sentiment) {
      prompt += `- sentiment: Overall sentiment (positive/negative/neutral/mixed) with confidence score (0-1)\n`;
      schema.sentiment = {
        label: 'string (positive/negative/neutral/mixed)',
        confidence: 'number (0-1)',
        explanation: 'string'
      };
    }

    if (features.keywords) {
      prompt += `- keywords: Array of 5-10 most important keywords/phrases with relevance scores\n`;
      schema.keywords = [{
        keyword: 'string',
        relevance: 'number (0-1)',
        count: 'number'
      }];
    }

    if (features.entities) {
      prompt += `- entities: Named entities (people, organizations, locations, dates, etc.)\n`;
      schema.entities = {
        people: ['array of names'],
        organizations: ['array of organization names'],
        locations: ['array of locations'],
        dates: ['array of dates/times'],
        other: ['array of other notable entities']
      };
    }

    if (features.topics) {
      prompt += `- topics: Main topics/themes with confidence scores\n`;
      schema.topics = [{
        topic: 'string',
        confidence: 'number (0-1)',
        description: 'string'
      }];
    }

    prompt += `\nExpected JSON schema:\n${JSON.stringify(schema, null, 2)}\n\n`;
    prompt += `Content to analyze:\n\n---\n\n${content}\n\n---\n\n`;
    prompt += `Return only valid JSON matching the schema above.`;

    return prompt;
  }

  /**
   * Analyze sentiment only
   * @param {string} content - Content to analyze
   * @returns {Promise<object>} - Sentiment analysis result
   */
  async analyzeSentiment(content) {
    return this.analyze(content, {
      features: {
        sentiment: true,
        keywords: false,
        entities: false,
        topics: false
      }
    });
  }

  /**
   * Extract keywords only
   * @param {string} content - Content to analyze
   * @param {number} limit - Maximum number of keywords
   * @returns {Promise<object>} - Keywords extraction result
   */
  async extractKeywords(content, limit = 10) {
    const result = await this.analyze(content, {
      features: {
        sentiment: false,
        keywords: true,
        entities: false,
        topics: false
      }
    });

    if (result.keywords) {
      result.keywords = result.keywords.slice(0, limit);
    }

    return result;
  }

  /**
   * Extract named entities only
   * @param {string} content - Content to analyze
   * @returns {Promise<object>} - Named entity recognition result
   */
  async extractEntities(content) {
    return this.analyze(content, {
      features: {
        sentiment: false,
        keywords: false,
        entities: true,
        topics: false
      }
    });
  }

  /**
   * Identify topics only
   * @param {string} content - Content to analyze
   * @returns {Promise<object>} - Topic classification result
   */
  async classifyTopics(content) {
    return this.analyze(content, {
      features: {
        sentiment: false,
        keywords: false,
        entities: false,
        topics: true
      }
    });
  }

  /**
   * Get reading statistics
   * @param {string} content - Content to analyze
   * @returns {object} - Reading statistics
   */
  getReadingStats(content) {
    const words = content.split(/\s+/).filter(w => w.length > 0);
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 0);

    // Average words per minute for reading
    const readingSpeed = 200;
    const readingTimeMinutes = Math.ceil(words.length / readingSpeed);

    return {
      characters: content.length,
      words: words.length,
      sentences: sentences.length,
      paragraphs: paragraphs.length,
      avgWordsPerSentence: Math.round(words.length / Math.max(sentences.length, 1)),
      avgSentencesPerParagraph: Math.round(sentences.length / Math.max(paragraphs.length, 1)),
      estimatedReadingTime: {
        minutes: readingTimeMinutes,
        formatted: readingTimeMinutes === 1 ? '1 minute' : `${readingTimeMinutes} minutes`
      }
    };
  }
}

module.exports = new AnalysisService();
