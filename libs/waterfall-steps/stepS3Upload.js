const AWS = require('aws-sdk');

/**
 * Waterfall step function
 *
 * Upload files to S3
 *
 * @param {Object} data         Waterfall data object
 * @param {Function} callback   Waterfall callback
 */
module.exports = (data, callback) => {
  const s3 = new AWS.S3();

  const returnData = data;
  if (data.source.package.md5 === data.target.package.md5) {
    returnData.status.uploaded = false;
    returnData.status.message = 'Matching package already exist.';
    return callback(null, returnData);
  }

  // Source package differs from target package, upload it
  const params = {
    Bucket: data.argv.targetBucket,
    Key: data.argv.targetKey,
    Body: data.source.package.buffer,
  };
  return s3.upload(params, (err, response) => {
    if (err) { return callback(err); }
    returnData.target.package.location = response.Location;
    returnData.status.uploaded = true;
    return callback(null, returnData);
  });
};
