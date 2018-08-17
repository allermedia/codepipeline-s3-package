const glob = require('glob');

/**
 * Waterfall step function
 *
 * Collect files
 *
 * @param {Object} data         Waterfall data object
 * @param {Function} callback   Waterfall callback
 */
module.exports = (data, callback) => {
  const returnData = data;
  glob(data.argv.sourceFiles, { nodir: true }, (err, files) => {
    if (err) { return callback(err); }

    // Do sanity checks
    if (files.length === 0) {
      return callback(new Error(`No source files found. ("${data.argv.sourceFiles}")`));
    }
    if (files.length > 50) {
      return callback(new Error(`Too many source files ("${files.length}"), probably errennous source pattern.`));
    }
    returnData.source.files = files;
    return callback(err, returnData);
  });
};
