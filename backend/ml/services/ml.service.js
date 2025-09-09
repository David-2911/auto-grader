const path = require('path');
const { spawn } = require('child_process');
const { logger } = require('../../src/utils/logger');

/**
 * Service for handling machine learning operations
 */
class MLService {
  /**
   * Extract text from a PDF file using OCR
   * @param {string} pdfPath - Path to the PDF file
   * @returns {Promise<string>} - Extracted text
   */
  static async extractTextFromPDF(pdfPath) {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(__dirname, '../utils/extract_text.py');
      
      const process = spawn('python3', [pythonScript, pdfPath]);
      
      let result = '';
      let error = '';
      
      process.stdout.on('data', (data) => {
        result += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      process.on('close', (code) => {
        if (code !== 0) {
          logger.error(`OCR process exited with code ${code}: ${error}`);
          reject(new Error(`OCR process failed: ${error}`));
        } else {
          resolve(result.trim());
        }
      });
    });
  }
  
  /**
   * Grade a submission using the ML model
   * @param {string} submissionText - The text of the submission
   * @param {string} expectedAnswer - The expected answer
   * @returns {Promise<Object>} - Grading result with score and feedback
   */
  static async gradeSubmission(submissionText, expectedAnswer) {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(__dirname, '../utils/grade_submission.py');
      
      const process = spawn('python3', [
        pythonScript,
        '--submission', submissionText,
        '--expected', expectedAnswer
      ]);
      
      let result = '';
      let error = '';
      
      process.stdout.on('data', (data) => {
        result += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      process.on('close', (code) => {
        if (code !== 0) {
          logger.error(`Grading process exited with code ${code}: ${error}`);
          reject(new Error(`Grading process failed: ${error}`));
        } else {
          try {
            const gradingResult = JSON.parse(result.trim());
            resolve(gradingResult);
          } catch (err) {
            reject(new Error(`Failed to parse grading result: ${err.message}`));
          }
        }
      });
    });
  }
  
  /**
   * Analyze code submission
   * @param {string} codeText - The submitted code
   * @param {string} language - The programming language
   * @returns {Promise<Object>} - Code analysis result
   */
  static async analyzeCode(codeText, language) {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(__dirname, '../utils/analyze_code.py');
      
      const process = spawn('python3', [
        pythonScript,
        '--code', codeText,
        '--language', language
      ]);
      
      let result = '';
      let error = '';
      
      process.stdout.on('data', (data) => {
        result += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      process.on('close', (code) => {
        if (code !== 0) {
          logger.error(`Code analysis process exited with code ${code}: ${error}`);
          reject(new Error(`Code analysis failed: ${error}`));
        } else {
          try {
            const analysisResult = JSON.parse(result.trim());
            resolve(analysisResult);
          } catch (err) {
            reject(new Error(`Failed to parse code analysis result: ${err.message}`));
          }
        }
      });
    });
  }
}

module.exports = MLService;
