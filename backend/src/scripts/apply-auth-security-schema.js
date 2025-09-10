/**
 * Script to apply authentication and security schema updates
 */
const path = require('path');
const fs = require('fs').promises;
const { pool } = require('../config/database');
const { logger } = require('../utils/logger');

async function runSqlFile(filePath) {
  try {
    // Read the SQL file
    const sql = await fs.readFile(filePath, 'utf8');
    
    // Split the SQL file by semicolon to get individual statements
    const statements = sql
      .split(';')
      .filter(statement => statement.trim() !== '');
    
    // Execute each statement
    for (const statement of statements) {
      try {
        await pool.query(statement);
        logger.info(`Executed SQL statement: ${statement.substring(0, 50)}...`);
      } catch (err) {
        logger.error(`Error executing SQL statement: ${statement.substring(0, 100)}...`, err);
        throw err;
      }
    }
    
    logger.info(`Successfully applied SQL file: ${path.basename(filePath)}`);
    return true;
  } catch (err) {
    logger.error(`Error applying SQL file ${path.basename(filePath)}:`, err);
    throw err;
  }
}

async function applySchemaUpdates() {
  try {
    logger.info('Starting authentication and security schema updates...');
    
    // Apply refresh tokens schema
    await runSqlFile(path.join(__dirname, '../config/refresh_tokens_schema.sql'));
    
    // Apply auth security schema
    await runSqlFile(path.join(__dirname, '../config/auth_security_schema.sql'));
    
    logger.info('Authentication and security schema updates completed successfully');
    process.exit(0);
  } catch (err) {
    logger.error('Error applying authentication and security schema updates:', err);
    process.exit(1);
  }
}

// Run the migration
applySchemaUpdates();
