const AWS = require('aws-sdk');

/**
 * Waterfall step function
 *
 * Get file checksum from S3
 *
 * @param {Object} data         Waterfall data object
 * @param {Function} callback   Waterfall callback
 */
module.exports = (data, callback) => {
  const s3 = new AWS.S3();

  const returnData = data;
  const params = {
    Bucket: data.argv.targetBucket,
    Key: data.argv.targetKey,
  };

  s3.getObject(params, (err, response) => {
    if (err && err.statusCode !== 404) { return callback(err); } // We dont care about 404 errors
    returnData.target.package = {
      md5: response && response.ETag.replace(/"/g, ''), // Remove extra quotes ('"abc123"')
    };
    return callback(null, returnData);
  });
};
