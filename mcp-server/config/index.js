// Configuration cho MCP Server
module.exports = {
  // Server config
  port: process.env.PORT || 3000,
  host: '0.0.0.0',
  
  // Paths
  uploadsDir: './uploads',
  outputsDir: './outputs',
  
  // MarkItDown config
  markitdown: {
    enabled: true,
    pythonCommand: 'python3',
    timeout: 60000, // 60 seconds
  },
  
  // File upload limits
  upload: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
      'image/jpeg',
      'image/png',
      'text/html',
      'text/csv'
    ]
  },
  
  // Firecrawl config
  firecrawl: {
    enabled: true,
    maxPages: 50,        // Maximum pages per crawl job
    maxDepth: 5,         // Maximum crawl depth
    timeout: 30000,      // Request timeout (30 seconds)
    userAgent: 'Mozilla/5.0 (compatible; MCPFirecrawl/1.0)',
    defaultRemoveSelectors: ['script', 'style', 'nav', 'footer', 'iframe']
  },

  // AI Content Processing config
  ai: {
    enabled: true,

    // OCR config
    ocr: {
      enabled: true,
      engine: 'tesseract',  // tesseract or google-vision
      languages: ['eng', 'vie'], // Supported languages
      timeout: 120000 // 2 minutes
    },

    // Summarization config
    summarization: {
      enabled: true,
      provider: 'openai', // openai, anthropic, or local
      apiKey: process.env.OPENAI_API_KEY || '',
      model: 'gpt-4o-mini',
      maxTokens: 500,
      temperature: 0.3
    },

    // Translation config
    translation: {
      enabled: true,
      provider: 'google', // google, deepl, or openai
      apiKey: process.env.GOOGLE_TRANSLATE_API_KEY || '',
      supportedLanguages: ['en', 'vi', 'zh', 'ja', 'ko', 'fr', 'es', 'de']
    },

    // Content Analysis config
    analysis: {
      enabled: true,
      features: {
        sentiment: true,
        keywords: true,
        entities: true,
        topics: true
      },
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY || '',
      model: 'gpt-4o-mini'
    }
  }
};