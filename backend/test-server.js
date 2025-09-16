const express = require('express');
const { testConnection } = require('./src/config/database.optimized');
const cacheManager = require('./src/services/cache.service');

const app = express();
const PORT = 5000;

app.get('/test', (req, res) => {
  res.json({ message: 'Server is running!' });
});

async function startSimpleServer() {
  console.log('Starting simple test server...');
  
  // Test database
  const dbOk = await testConnection();
  console.log('Database connected:', dbOk);
  
  // Test cache
  const cacheOk = await cacheManager.connect();
  console.log('Cache connected:', cacheOk);
  
  // Start server
  const server = app.listen(PORT, () => {
    console.log(`Simple server running on port ${PORT}`);
  });
  
  return server;
}

startSimpleServer().catch(console.error);