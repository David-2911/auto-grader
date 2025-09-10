// Global teardown for test environment
const path = require('path');
const fs = require('fs');

module.exports = async () => {
  console.log('Running global test teardown...');
  
  try {
    // Close database connections
    if (global.testDbConnection) {
      await global.testDbConnection.close();
    }
    
    // Close Redis connections
    if (global.testRedisConnection) {
      await global.testRedisConnection.quit();
    }
    
    // Clean up test files and directories
    const tempDir = path.join(__dirname, 'temp');
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    
    // Clean up logs
    const logFile = path.join(__dirname, 'temp', 'test.log');
    if (fs.existsSync(logFile)) {
      fs.unlinkSync(logFile);
    }
    
    // Stop any background services
    if (global.testBackgroundServices) {
      for (const service of global.testBackgroundServices) {
        try {
          await service.stop();
        } catch (error) {
          console.warn(`Failed to stop background service:`, error.message);
        }
      }
    }
    
    console.log('Global test teardown completed');
  } catch (error) {
    console.error('Error during global teardown:', error);
  }
};
