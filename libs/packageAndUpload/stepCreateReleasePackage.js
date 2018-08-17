const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const md5 = require('md5');

/**
 * Waterfall step function
 *
 * Create release .zip package
 *
 * @param {Object} data         Waterfall data object
 * @param {Function} callback   Waterfall callback
 */
module.exports = (data, callback) => {
  const returnData = data;
  const zip = new JSZip();
  data.source.files.forEach((filename) => {
    // Force file dates to keep modified headers from affecting package MD5 hashes
    zip.file(path.basename(filename), fs.readFileSync(filename, 'binary'), {
      binary: true,
      date: new Date('1970-01-01'),
    });
  });

  // Generate package data
  const packageChunks = [];
  zip.generateNodeStream({ compression: 'DEFLATE', streamFiles: true })
    .on('data', (chunkData) => { packageChunks.push(chunkData); })
    .on('error', err => callback(err))
    .on('end', () => {
      const content = Buffer.concat(packageChunks);
      returnData.source.package = {
        md5: md5(content), // Generate md5 hash for the package
        buffer: content,
      };
      callback(null, returnData);
    });
};
