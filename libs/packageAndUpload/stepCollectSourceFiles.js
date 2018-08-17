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
  let sourceFiles = [];

  data.argv.sourceFiles.forEach((globFilter) => {
    let files = [];

    try {
      files = glob.sync(globFilter, { nodir: true });
    } catch (err) {
      return callback(err);
    }

    sourceFiles = sourceFiles.concat(files);
    return sourceFiles;
  });

  // Do sanity checks
  if (sourceFiles.length === 0) {
    return callback(new Error(`No source files found. ("${data.argv.sourceFiles}")`));
  }

  returnData.source.files = sourceFiles;
  return callback(null, returnData);
};
