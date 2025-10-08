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
  
  // Firecrawl config (placeholder cho tương lai)
  firecrawl: {
    enabled: false,
    apiKey: process.env.FIRECRAWL_API_KEY || ''
  }
};