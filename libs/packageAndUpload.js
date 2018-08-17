const async = require('async');
const AWS = require('aws-sdk');

const stepCollectSourceFiles = require('./packageAndUpload/stepCollectSourceFiles');
const stepCreateReleasePackage = require('./packageAndUpload/stepCreateReleasePackage');
const stepS3GetFileChecksum = require('./packageAndUpload/stepS3GetFileChecksum');
const stepS3Upload = require('./packageAndUpload/stepS3Upload');

/*
Example waterfall data object:

let data = {
  source: {
    files: [],
    package: {
      buffer: '',
      md5: ''
    }
  },
  target: {
    package: {
      location: '',
      md5: ''
    }
  },
  status: {
    uploaded: false,
    message: 'matching checksum'
  },
  argv: {
    sourceFiles: ['./files/*', './custom_file.txt'],
    targetBucket: 'test-bucket',
    targetKey: 'packages/test-package.zip'
  }
};
*/
const packageAndUpload = function workFunction(argv, callback) {
  // Make things backwards compatible
  const argvParsed = argv;
  argvParsed.sourceFiles = argv.sourceFiles || argv.source; // "source" -> "sourceFiles"

  // Make sure we have everyything
  if (!argvParsed.sourceFiles) {
    return callback(new Error('--source-files is a required parameter'));
  }
  if (!argvParsed.targetBucket) {
    return callback(new Error('--target-bucket is a required parameter'));
  }
  if (!argvParsed.targetKey) {
    return callback(new Error('--target-key is a required parameter'));
  }


  // Configure AWS client (must be created with `new` to set the global config)
  // Key and secret can either be defined with args, env variables/aws-cli configure
  const awsConfig = new AWS.Config({ // eslint-disable-line no-unused-vars
    region: 'eu-west-1',
    accessKeyId: argvParsed.awsKey,
    secretAccessKey: argvParsed.awsSecret,
    apiVersion: '2017-01-01',
  });


  return async.waterfall([

    // Create waterfall data object
    (done) => {
      const returnData = {
        source: {},
        target: {},
        status: {},
        argv: argvParsed,
      };
      return done(null, returnData);
    },

    // Do all the things
    stepCollectSourceFiles,
    stepCreateReleasePackage,
    stepS3GetFileChecksum,
    stepS3Upload,

  ], callback);
};


module.exports = packageAndUpload;
