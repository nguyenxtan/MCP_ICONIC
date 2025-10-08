const fs = require('fs');
const path = require('path');
const logger = require('./logger');

class FileHandler {
  // Đảm bảo thư mục tồn tại
  ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      logger.info(`Created directory: ${dirPath}`);
    }
  }
  
  // Xóa file
  deleteFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info(`Deleted file: ${filePath}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`Error deleting file: ${filePath}`, error);
      return false;
    }
  }
  
  // Đọc file
  readFile(filePath) {
    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
      logger.error(`Error reading file: ${filePath}`, error);
      throw error;
    }
  }
  
  // Ghi file
  writeFile(filePath, content) {
    try {
      fs.writeFileSync(filePath, content, 'utf8');
      logger.info(`Written file: ${filePath}`);
      return true;
    } catch (error) {
      logger.error(`Error writing file: ${filePath}`, error);
      throw error;
    }
  }
  
  // Lấy extension của file
  getFileExtension(filename) {
    return path.extname(filename).toLowerCase();
  }
  
  // Cleanup old files (older than X minutes)
  cleanupOldFiles(directory, maxAgeMinutes = 60) {
    try {
      const now = Date.now();
      const files = fs.readdirSync(directory);
      
      files.forEach(file => {
        const filePath = path.join(directory, file);
        const stats = fs.statSync(filePath);
        const ageMinutes = (now - stats.mtimeMs) / (1000 * 60);
        
        if (ageMinutes > maxAgeMinutes) {
          this.deleteFile(filePath);
        }
      });
      
      logger.info(`Cleaned up old files in ${directory}`);
    } catch (error) {
      logger.error(`Error cleaning up directory: ${directory}`, error);
    }
  }
}

module.exports = new FileHandler();