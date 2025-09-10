const { parentPort, workerData } = require('worker_threads');
const fs = require('fs');
const pdf2pic = require('pdf2pic');
const tesseract = require('tesseract.js');
const sharp = require('sharp');

async function processPDF() {
  const { filePath, preferredEngines } = workerData;
  const startTime = Date.now();

  try {
    // Get file size
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;

    // Convert PDF to images with optimization
    const convertOptions = {
      density: 200,
      saveFilename: 'page',
      savePath: './temp',
      format: 'jpeg',
      width: 2000,
      height: 2000
    };

    const convert = pdf2pic.fromPath(filePath, convertOptions);
    const pages = await convert.bulk(-1, { responseType: 'buffer' });

    let allText = '';
    let totalConfidence = 0;
    let pageCount = 0;

    // Process each page
    for (const page of pages) {
      try {
        // Optimize image for OCR
        const optimizedBuffer = await sharp(page.buffer)
          .resize({ width: 1200, height: 1600, fit: 'inside' })
          .sharpen()
          .normalize()
          .greyscale()
          .jpeg({ quality: 90 })
          .toBuffer();

        // Perform OCR
        let ocrResult;
        for (const engine of preferredEngines) {
          try {
            if (engine === 'tesseract') {
              const { data } = await tesseract.recognize(optimizedBuffer, 'eng', {
                logger: m => {} // Suppress logs
              });
              ocrResult = {
                text: data.text,
                confidence: data.confidence
              };
              break;
            }
            // Add other engines here (Google Vision, AWS Textract)
          } catch (engineError) {
            console.warn(`Engine ${engine} failed:`, engineError.message);
          }
        }

        if (ocrResult) {
          allText += ocrResult.text + '\n';
          totalConfidence += ocrResult.confidence;
          pageCount++;
        }
      } catch (pageError) {
        console.warn(`Failed to process page ${page.name}:`, pageError.message);
      }
    }

    const processingTime = Date.now() - startTime;
    const averageConfidence = pageCount > 0 ? totalConfidence / pageCount : 0;

    const result = {
      text: allText.trim(),
      confidence: averageConfidence / 100, // Normalize to 0-1
      engine: 'tesseract',
      processingTime,
      fileSize,
      pagesProcessed: pageCount
    };

    parentPort.postMessage(result);
  } catch (error) {
    parentPort.postMessage({
      error: error.message,
      processingTime: Date.now() - startTime
    });
  }
}

processPDF().catch(error => {
  parentPort.postMessage({
    error: error.message,
    processingTime: 0
  });
});
