const axios = require('axios');
const logger = require('../common/logger');

class TelegramAIHandler {
  constructor(config) {
    this.config = config;
    this.conversations = new Map(); // Store conversation history per chat
    this.maxHistoryLength = 10; // Keep last 10 messages
  }

  /**
   * Get conversation history for a chat
   */
  getHistory(chatId) {
    if (!this.conversations.has(chatId)) {
      this.conversations.set(chatId, []);
    }
    return this.conversations.get(chatId);
  }

  /**
   * Add message to conversation history
   */
  addToHistory(chatId, role, content) {
    const history = this.getHistory(chatId);
    history.push({ role, content, timestamp: Date.now() });

    // Keep only recent messages
    if (history.length > this.maxHistoryLength) {
      history.shift();
    }
  }

  /**
   * Clear conversation history
   */
  clearHistory(chatId) {
    this.conversations.delete(chatId);
  }

  /**
   * Generate AI response using OpenAI-compatible API
   */
  async generateResponse(chatId, userMessage, context = null) {
    try {
      const history = this.getHistory(chatId);

      // Build messages array
      const messages = [
        {
          role: 'system',
          content: this.getSystemPrompt()
        }
      ];

      // Add context if provided (e.g., scraped content)
      if (context) {
        messages.push({
          role: 'system',
          content: `Context information:\n${context}`
        });
      }

      // Add conversation history
      history.forEach(msg => {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      });

      // Add current user message
      messages.push({
        role: 'user',
        content: userMessage
      });

      // Call LLM API
      const response = await this.callLLM(messages);

      // Add to history
      this.addToHistory(chatId, 'user', userMessage);
      this.addToHistory(chatId, 'assistant', response);

      return response;

    } catch (error) {
      logger.error('AI generation error:', error);
      throw error;
    }
  }

  /**
   * Summarize content using AI
   */
  async summarizeContent(content, maxLength = 500) {
    try {
      const messages = [
        {
          role: 'system',
          content: 'You are a helpful assistant that summarizes content concisely in Vietnamese.'
        },
        {
          role: 'user',
          content: `Hãy tóm tắt nội dung sau trong khoảng ${maxLength} từ bằng tiếng Việt:\n\n${content}`
        }
      ];

      const summary = await this.callLLM(messages);
      return summary;

    } catch (error) {
      logger.error('Summarization error:', error);
      throw error;
    }
  }

  /**
   * Answer questions about document content
   */
  async answerQuestion(question, documentContent) {
    try {
      const messages = [
        {
          role: 'system',
          content: 'You are a helpful assistant that answers questions based on provided document content. Answer in Vietnamese.'
        },
        {
          role: 'user',
          content: `Document content:\n${documentContent}\n\nQuestion: ${question}`
        }
      ];

      const answer = await this.callLLM(messages);
      return answer;

    } catch (error) {
      logger.error('Question answering error:', error);
      throw error;
    }
  }

  /**
   * Extract key points from content
   */
  async extractKeyPoints(content) {
    try {
      const messages = [
        {
          role: 'system',
          content: 'You are a helpful assistant that extracts key points from content. Respond in Vietnamese with bullet points.'
        },
        {
          role: 'user',
          content: `Hãy trích xuất các điểm chính từ nội dung sau:\n\n${content}`
        }
      ];

      const keyPoints = await this.callLLM(messages);
      return keyPoints;

    } catch (error) {
      logger.error('Key points extraction error:', error);
      throw error;
    }
  }

  /**
   * Call LLM API (OpenAI-compatible)
   */
  async callLLM(messages) {
    const provider = this.config.provider || 'openai';

    try {
      let response;

      if (provider === 'openai') {
        response = await this.callOpenAI(messages);
      } else if (provider === 'openrouter') {
        response = await this.callOpenRouter(messages);
      } else if (provider === 'google') {
        response = await this.callGoogleAI(messages);
      } else {
        throw new Error(`Unsupported AI provider: ${provider}`);
      }

      return response;

    } catch (error) {
      logger.error(`LLM API call failed (${provider}):`, error);
      throw error;
    }
  }

  /**
   * Call OpenAI API
   */
  async callOpenAI(messages) {
    const apiKey = this.config.apiKey;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: this.config.model || 'gpt-4o-mini',
        messages: messages,
        temperature: this.config.temperature || 0.7,
        max_tokens: this.config.maxTokens || 1000
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0].message.content;
  }

  /**
   * Call OpenRouter API
   */
  async callOpenRouter(messages) {
    const apiKey = this.config.apiKey;
    if (!apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: this.config.model || 'anthropic/claude-3-haiku',
        messages: messages,
        temperature: this.config.temperature || 0.7,
        max_tokens: this.config.maxTokens || 1000
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://mcp-protocol.iconiclogs.com',
          'X-Title': 'MCP Telegram Bot'
        }
      }
    );

    return response.data.choices[0].message.content;
  }

  /**
   * Call Google AI (Gemini)
   */
  async callGoogleAI(messages) {
    const apiKey = this.config.apiKey;
    if (!apiKey) {
      throw new Error('Google API key not configured');
    }

    // Convert OpenAI format to Gemini format
    const geminiMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

    const systemInstruction = messages.find(m => m.role === 'system')?.content || '';

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model || 'gemini-1.5-flash'}:generateContent?key=${apiKey}`,
      {
        system_instruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
        contents: geminiMessages,
        generationConfig: {
          temperature: this.config.temperature || 0.7,
          maxOutputTokens: this.config.maxTokens || 1000
        }
      }
    );

    return response.data.candidates[0].content.parts[0].text;
  }

  /**
   * Get system prompt for the bot
   */
  getSystemPrompt() {
    return `Bạn là một trợ lý AI thông minh có khả năng:
- Trả lời câu hỏi bằng tiếng Việt
- Tóm tắt và phân tích nội dung
- Giải thích tài liệu
- Chat tự nhiên với người dùng

Hãy trả lời ngắn gọn, súc tích và hữu ích. Sử dụng emoji khi phù hợp để làm cho cuộc trò chuyện thân thiện hơn.

Khi người dùng gửi URL hoặc file, bạn sẽ giúp họ xử lý và tóm tắt nội dung.`;
  }

  /**
   * Check if AI is enabled
   */
  isEnabled() {
    return this.config.enabled && this.config.apiKey;
  }
}

module.exports = TelegramAIHandler;
