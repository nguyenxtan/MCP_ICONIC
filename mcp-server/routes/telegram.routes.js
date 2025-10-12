const express = require('express');
const router = express.Router();
const TelegramService = require('../modules/telegram');
const TelegramAIHandler = require('../modules/telegram/ai-handler');
const markitdownService = require('../modules/markitdown');
const firecrawlService = require('../modules/firecrawl');
const doclingService = require('../modules/docling');
const logger = require('../modules/common/logger');
const config = require('../config');
const path = require('path');
const fs = require('fs');

// Initialize Telegram service
const telegram = new TelegramService(config.telegram.botToken);

// Initialize AI handler
const aiHandler = new TelegramAIHandler({
  enabled: config.telegram.aiEnabled !== false,
  provider: config.telegram.aiProvider || 'openai',
  apiKey: config.telegram.aiApiKey || process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY,
  model: config.telegram.aiModel || 'gpt-4o-mini',
  temperature: 0.7,
  maxTokens: 1000
});

/**
 * Webhook endpoint for Telegram bot
 */
router.post('/webhook', async (req, res) => {
  try {
    const update = req.body;
    logger.info('Telegram webhook received', { update });

    // Respond quickly to Telegram
    res.status(200).json({ ok: true });

    // Process update asynchronously
    processUpdate(update).catch(err => {
      logger.error('Error processing Telegram update:', err);
    });
  } catch (error) {
    logger.error('Telegram webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Process Telegram update
 */
async function processUpdate(update) {
  const message = update.message || update.edited_message;
  if (!message) return;

  const chatId = message.chat.id;
  const userId = message.from.id;
  const userName = message.from.first_name || message.from.username || 'User';

  logger.info(`Processing message from ${userName} (${userId}) in chat ${chatId}`);

  try {
    // Send typing indicator
    await telegram.sendChatAction(chatId, 'typing');

    // Handle commands
    if (message.text && message.text.startsWith('/')) {
      await handleCommand(chatId, message);
      return;
    }

    // Handle text message
    if (message.text) {
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urls = message.text.match(urlRegex);

      if (urls && urls.length > 0) {
        // Handle URL scraping
        await handleUrlScraping(chatId, urls[0], message.message_id);
      } else {
        // Use AI to respond if enabled
        if (aiHandler.isEnabled()) {
          try {
            await telegram.sendChatAction(chatId, 'typing');
            const aiResponse = await aiHandler.generateResponse(chatId, message.text);
            await telegram.sendMessage(chatId, aiResponse, { reply_to: message.message_id });
          } catch (error) {
            logger.error('AI response error:', error);
            await telegram.sendMessage(chatId,
              '📝 *Gửi cho tôi:*\n' +
              '• URL để scrape\n' +
              '• PDF/DOCX/PPTX để convert sang Markdown\n' +
              '• Audio để transcribe\n' +
              '• /help để xem hướng dẫn',
              { reply_to: message.message_id }
            );
          }
        } else {
          // Fallback if AI not enabled
          await telegram.sendMessage(chatId,
            '📝 *Gửi cho tôi:*\n' +
            '• URL để scrape\n' +
            '• PDF/DOCX/PPTX để convert sang Markdown\n' +
            '• Audio để transcribe\n' +
            '• /help để xem hướng dẫn',
            { reply_to: message.message_id }
          );
        }
      }
      return;
    }

    // Handle document
    if (message.document) {
      await handleDocument(chatId, message);
      return;
    }

    // Handle photo
    if (message.photo) {
      await telegram.sendMessage(chatId,
        '📷 Tôi đã nhận ảnh. Tuy nhiên hiện tại tôi chưa hỗ trợ xử lý ảnh trực tiếp.\n' +
        'Bạn có thể gửi file PDF chứa ảnh để tôi extract.',
        { reply_to: message.message_id }
      );
      return;
    }

    // Handle voice/audio
    if (message.voice || message.audio) {
      await handleAudio(chatId, message);
      return;
    }

  } catch (error) {
    logger.error('Error processing message:', error);
    await telegram.sendMessage(chatId,
      `❌ Lỗi xử lý: ${error.message}`,
      { reply_to: message.message_id }
    );
  }
}

/**
 * Handle commands
 */
async function handleCommand(chatId, message) {
  const command = message.text.split(' ')[0].toLowerCase();

  switch (command) {
    case '/start':
      await telegram.sendMessage(chatId,
        '👋 Xin chào! Tôi là MCP Bot.\n\n' +
        '🔧 *Tôi có thể:*\n' +
        '• Scrape nội dung website → Markdown\n' +
        '• Convert PDF/DOCX/PPTX → Markdown\n' +
        '• Convert document bằng AI (Docling)\n' +
        '• Transcribe audio → text\n' +
        '• Extract ảnh từ PDF\n\n' +
        'Gửi URL hoặc file cho tôi để bắt đầu!\n' +
        'Dùng /help để xem chi tiết.'
      );
      break;

    case '/help':
      await telegram.sendMessage(chatId,
        '📖 *Hướng dẫn sử dụng:*\n\n' +
        '*1. Scrape website:*\n' +
        'Gửi URL trực tiếp, ví dụ:\n' +
        '`https://vnexpress.net/article-123`\n\n' +
        '*2. Convert document:*\n' +
        'Gửi file PDF, DOCX, PPTX\n' +
        'Tôi sẽ convert sang Markdown\n\n' +
        '*3. Transcribe audio:*\n' +
        'Gửi file audio (MP3, WAV)\n' +
        'Tôi sẽ chuyển thành text\n\n' +
        '*4. Commands:*\n' +
        '/start - Bắt đầu\n' +
        '/help - Hướng dẫn\n' +
        '/status - Trạng thái bot\n' +
        '/model - Xem/đổi AI model\n' +
        '/clear - Xóa lịch sử chat'
      );
      break;

    case '/status':
      const botInfo = await telegram.getMe();
      const aiStatus = aiHandler.isEnabled() ? '✅ Enabled' : '❌ Disabled';
      const aiProvider = aiHandler.config.provider || 'N/A';
      const aiModel = aiHandler.config.model || 'N/A';

      await telegram.sendMessage(chatId,
        `🤖 *Bot Status*\n\n` +
        `Name: ${botInfo.first_name}\n` +
        `Username: @${botInfo.username}\n` +
        `Status: ✅ Online\n` +
        `Version: 2.0.0\n\n` +
        `🧠 *AI Status*\n` +
        `AI: ${aiStatus}\n` +
        `Provider: ${aiProvider}\n` +
        `Model: ${aiModel}`
      );
      break;

    case '/model':
      if (!aiHandler.isEnabled()) {
        await telegram.sendMessage(chatId, '❌ AI không được kích hoạt. Cần config API key.');
        break;
      }

      const args = message.text.split(' ');
      if (args.length < 2) {
        await telegram.sendMessage(chatId,
          '🤖 *Model hiện tại:* ' + aiHandler.config.model + '\n\n' +
          '*Đổi model:*\n' +
          '`/model <model_name>`\n\n' +
          '*📱 Models OpenAI (direct):*\n' +
          '• o1 (reasoning, mới nhất)\n' +
          '• o1-mini (reasoning, nhanh)\n' +
          '• gpt-4o-mini (rẻ, nhanh)\n' +
          '• gpt-4o (đắt, thông minh)\n' +
          '• gpt-4-turbo-preview\n' +
          '• gpt-4\n' +
          '• gpt-3.5-turbo (cũ, rẻ)\n\n' +
          '*🌐 OpenRouter - OpenAI models:*\n' +
          '• openai/o1 (reasoning)\n' +
          '• openai/o1-mini (reasoning, nhanh)\n' +
          '• openai/gpt-4o-mini\n' +
          '• openai/gpt-4o\n' +
          '• openai/gpt-4-turbo\n' +
          '• openai/gpt-4\n' +
          '• openai/gpt-3.5-turbo\n\n' +
          '*🌐 OpenRouter - Google Gemini:*\n' +
          '• google/gemini-2.5-pro-exp (free, mới nhất)\n' +
          '• google/gemini-2.0-flash-exp (free)\n' +
          '• google/gemini-pro-1.5 (free)\n' +
          '• google/gemini-flash-1.5 (free, nhanh)\n' +
          '• google/gemini-pro (free)\n\n' +
          '*🌐 OpenRouter - Claude:*\n' +
          '• anthropic/claude-3.5-sonnet (thông minh nhất)\n' +
          '• anthropic/claude-3-opus\n' +
          '• anthropic/claude-3-sonnet\n' +
          '• anthropic/claude-3-haiku (nhanh)\n\n' +
          '*🌐 OpenRouter - Meta Llama:*\n' +
          '• meta-llama/llama-3.3-70b-instruct (free)\n' +
          '• meta-llama/llama-3.1-405b-instruct\n' +
          '• meta-llama/llama-3.1-70b-instruct\n' +
          '• meta-llama/llama-3.1-8b-instruct (free)\n\n' +
          '*🌐 OpenRouter - Khác:*\n' +
          '• mistralai/mistral-large\n' +
          '• mistralai/mixtral-8x7b-instruct (free)\n' +
          '• qwen/qwen-2-72b-instruct (free)\n' +
          '• deepseek/deepseek-chat (free)\n\n' +
          '*🔷 Google AI (direct):*\n' +
          '• gemini-2.5-pro-exp (mới nhất)\n' +
          '• gemini-2.0-flash-exp\n' +
          '• gemini-1.5-pro\n' +
          '• gemini-1.5-flash (nhanh)\n' +
          '• gemini-pro',
          { parse_mode: 'Markdown' }
        );
      } else {
        const newModel = args.slice(1).join(' ');
        aiHandler.config.model = newModel;
        await telegram.sendMessage(chatId, `✅ Đã đổi model sang: *${newModel}*`);
      }
      break;

    case '/clear':
      aiHandler.clearHistory(chatId);
      await telegram.sendMessage(chatId, '🗑️ Đã xóa lịch sử chat!');
      break;

    default:
      await telegram.sendMessage(chatId,
        '❓ Không hiểu lệnh. Dùng /help để xem hướng dẫn.'
      );
  }
}

/**
 * Handle URL scraping
 */
async function handleUrlScraping(chatId, url, replyTo) {
  try {
    await telegram.sendMessage(chatId,
      `🔍 Đang scrape: ${url}\nVui lòng chờ...`,
      { reply_to: replyTo }
    );

    await telegram.sendChatAction(chatId, 'typing');

    // Scrape URL
    const result = await firecrawlService.scrapeUrl(url);

    // Send markdown result
    if (result.markdown) {
      // Use AI to summarize if enabled
      let summary = null;
      if (aiHandler.isEnabled() && result.wordCount > 200) {
        try {
          await telegram.sendMessage(chatId, '🤖 Đang tóm tắt nội dung bằng AI...');
          summary = await aiHandler.summarizeContent(result.markdown, 300);
        } catch (error) {
          logger.error('AI summarization error:', error);
        }
      }

      // Send AI summary first if available
      if (summary) {
        await telegram.sendMessage(chatId,
          `📝 *Tóm tắt AI:*\n\n${summary}\n\n---\n_Xem full content bên dưới_`,
          { parse_mode: 'Markdown' }
        );
      }

      // Split into chunks if too long (Telegram limit: 4096 chars)
      const chunks = splitText(result.markdown, 4000);

      // Send first chunk always, rest only if no summary or short
      const chunksToSend = summary ? Math.min(chunks.length, 1) : chunks.length;

      for (let i = 0; i < chunksToSend; i++) {
        await telegram.sendMessage(chatId, chunks[i], {
          parse_mode: 'Markdown',
          disable_preview: true
        });

        // Small delay between messages
        if (i < chunksToSend - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Send as file if too long
      if (chunks.length > 1) {
        const filePath = result.outputPath;
        await telegram.sendDocument(chatId, filePath,
          `📄 Full content (${result.wordCount} words)`
        );
      }

      await telegram.sendMessage(chatId,
        `✅ *Scrape hoàn tất*\n` +
        `📊 Words: ${result.wordCount}\n` +
        `⚡ Method: ${result.scrapeMethod || 'axios'}` +
        (summary ? '\n🤖 AI Summary: ✅' : '')
      );
    }
  } catch (error) {
    logger.error('URL scraping error:', error);
    await telegram.sendMessage(chatId,
      `❌ Lỗi scrape URL:\n${error.message}`
    );
  }
}

/**
 * Handle document upload
 */
async function handleDocument(chatId, message) {
  const document = message.document;
  const fileName = document.file_name;
  const fileExt = path.extname(fileName).toLowerCase();

  try {
    await telegram.sendMessage(chatId,
      `📥 Đang download: ${fileName}\nVui lòng chờ...`,
      { reply_to: message.message_id }
    );

    await telegram.sendChatAction(chatId, 'upload_document');

    // Download file
    const uploadPath = path.join(config.uploadsDir, `${Date.now()}_${fileName}`);
    await telegram.downloadFile(document.file_id, uploadPath);

    // Process based on file type
    if (['.pdf', '.docx', '.pptx', '.xlsx'].includes(fileExt)) {
      await telegram.sendMessage(chatId, '🔄 Đang convert sang Markdown...');

      // Use MarkItDown for fast conversion
      const result = await markitdownService.convertToMarkdown(uploadPath);

      if (result.markdown) {
        // Send markdown result
        const chunks = splitText(result.markdown, 4000);

        for (let i = 0; i < chunks.length; i++) {
          await telegram.sendMessage(chatId, chunks[i], {
            parse_mode: 'Markdown'
          });

          if (i < chunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        // Send as file
        const outputPath = result.outputPath;
        await telegram.sendDocument(chatId, outputPath,
          `✅ ${fileName} → Markdown\n📊 ${result.wordCount} words`
        );
      }

      // Cleanup
      fs.unlinkSync(uploadPath);

    } else {
      await telegram.sendMessage(chatId,
        `⚠️ File type không được hỗ trợ: ${fileExt}\n` +
        `Hỗ trợ: PDF, DOCX, PPTX, XLSX`
      );
      fs.unlinkSync(uploadPath);
    }

  } catch (error) {
    logger.error('Document processing error:', error);
    await telegram.sendMessage(chatId,
      `❌ Lỗi xử lý file:\n${error.message}`
    );
  }
}

/**
 * Handle audio files
 */
async function handleAudio(chatId, message) {
  const audio = message.voice || message.audio;

  try {
    await telegram.sendMessage(chatId,
      `🎤 Đang download audio...\nVui lòng chờ...`,
      { reply_to: message.message_id }
    );

    // Download audio
    const audioPath = path.join(config.uploadsDir, `${Date.now()}_audio.ogg`);
    await telegram.downloadFile(audio.file_id, audioPath);

    await telegram.sendMessage(chatId, '🔄 Đang transcribe...');

    // Transcribe using Docling
    const result = await doclingService.transcribeAudio(audioPath);

    if (result.text) {
      await telegram.sendMessage(chatId,
        `📝 *Transcription:*\n\n${result.text}`
      );
    }

    // Cleanup
    fs.unlinkSync(audioPath);

  } catch (error) {
    logger.error('Audio transcription error:', error);
    await telegram.sendMessage(chatId,
      `❌ Lỗi transcribe audio:\n${error.message}`
    );
  }
}

/**
 * Split long text into chunks
 */
function splitText(text, maxLength = 4000) {
  const chunks = [];
  let currentChunk = '';

  const lines = text.split('\n');

  for (const line of lines) {
    if (currentChunk.length + line.length + 1 > maxLength) {
      chunks.push(currentChunk);
      currentChunk = line;
    } else {
      currentChunk += (currentChunk ? '\n' : '') + line;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * Setup webhook
 */
router.post('/setup-webhook', async (req, res) => {
  try {
    const { webhook_url } = req.body;

    if (!webhook_url) {
      return res.status(400).json({ error: 'webhook_url is required' });
    }

    const result = await telegram.setWebhook(webhook_url);

    res.json({
      success: true,
      message: 'Webhook configured',
      result
    });
  } catch (error) {
    logger.error('Setup webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete webhook
 */
router.post('/delete-webhook', async (req, res) => {
  try {
    const result = await telegram.deleteWebhook();

    res.json({
      success: true,
      message: 'Webhook deleted',
      result
    });
  } catch (error) {
    logger.error('Delete webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get bot info
 */
router.get('/bot-info', async (req, res) => {
  try {
    const botInfo = await telegram.getMe();

    res.json({
      success: true,
      bot: botInfo
    });
  } catch (error) {
    logger.error('Get bot info error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
