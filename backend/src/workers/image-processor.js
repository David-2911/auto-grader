const { parentPort, workerData } = require('worker_threads');
const fs = require('fs');
const tesseract = require('tesseract.js');
const sharp = require('sharp');

async function processImage() {
  const { filePath, preferredEngines } = workerData;
  const startTime = Date.now();

  try {
    // Get file size
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;

    // Read and optimize image
    const imageBuffer = fs.readFileSync(filePath);
    
    // Apply image preprocessing for better OCR
    const optimizedBuffer = await sharp(imageBuffer)
      .resize({ width: 1200, height: 1600, fit: 'inside', withoutEnlargement: true })
      .sharpen({ sigma: 1, flat: 1, jagged: 2 })
      .normalize()
      .greyscale()
      .linear(1.2, -(128 * 1.2) + 128) // Increase contrast
      .jpeg({ quality: 95 })
      .toBuffer();

    let ocrResult;
    
    // Try different OCR engines in order of preference
    for (const engine of preferredEngines) {
      try {
        if (engine === 'tesseract') {
          const { data } = await tesseract.recognize(optimizedBuffer, 'eng', {
            logger: m => {}, // Suppress logs
            tessedit_pageseg_mode: tesseract.PSM.AUTO,
            tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz .,;:!?()-+=[]{}"|\'`~@#$%^&*<>/',
            preserve_interword_spaces: '1'
          });
          
          ocrResult = {
            text: data.text,
            confidence: data.confidence / 100, // Normalize to 0-1
            engine: 'tesseract'
          };
          break;
        }
        // Add other engines here (Google Vision, AWS Textract)
      } catch (engineError) {
        console.warn(`Engine ${engine} failed:`, engineError.message);
      }
    }

    if (!ocrResult) {
      throw new Error('All OCR engines failed');
    }

    const processingTime = Date.now() - startTime;

    const result = {
      text: ocrResult.text.trim(),
      confidence: ocrResult.confidence,
      engine: ocrResult.engine,
      processingTime,
      fileSize
    };

    parentPort.postMessage(result);
  } catch (error) {
    parentPort.postMessage({
      error: error.message,
      processingTime: Date.now() - startTime
    });
  }
}

processImage().catch(error => {
  parentPort.postMessage({
    error: error.message,
    processingTime: 0
  });
});
