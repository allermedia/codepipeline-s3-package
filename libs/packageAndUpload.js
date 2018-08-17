/**
 * The actual package and upload
 */
const fs = require('fs');
const path = require('path');
const async = require('async');
const glob = require('glob');
const AWS = require('aws-sdk');
const JSZip = require('jszip');
const md5 = require('md5');


/*
Example data:

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
  }
};
*/
const packageAndUpload = function workFunction(argv, callback) {
  // Make things backwards compatible
  const argvParsed = argv;
  argvParsed.sourceFiles = argv.sourceFiles || argv.source; // source became sourceFiles

  // Configure AWS client
  AWS.config = {
    region: 'eu-west-1',
    accessKeyId: argvParsed.awsKey, // Either defined here, in env variables or by aws cli
    secretAccessKey: argvParsed.awsSecret, // Either defined here, in env variables or by aws cli
    apiVersion: '2017-01-01',
  };
  const s3 = new AWS.S3();


  async.waterfall([

    // Make sure we have everything + set data object
    (done) => {
      const returnData = { // Setup data object
        source: {},
        target: {},
        status: {},
      };
      if (!argvParsed.sourceFiles) {
        return done(new Error('--source-files is a required parameter'));
      }
      if (!argvParsed.targetBucket) {
        return done(new Error('--target-bucket is a required parameter'));
      }
      if (!argvParsed.targetKey) {
        return done(new Error('--target-key is a required parameter'));
      }
      return done(null, returnData);
    },

    // Get source files
    (data, done) => {
      const returnData = data;
      glob(argvParsed.sourceFiles, { nodir: true }, (err, files) => {
        if (err) { return done(err); }

        // Do sanity checks
        if (files.length === 0) {
          return done(new Error(`No source files found. ("${argvParsed.sourceFiles}")`));
        }
        if (files.length > 50) {
          return done(new Error(`Too many source files ("${files.length}"), probably errennous source pattern.`));
        }
        returnData.source.files = files;
        return done(err, returnData);
      });
    },

    // Create release package
    (data, done) => {
      const returnData = data;
      const zip = new JSZip();
      data.source.files.forEach((filename) => {
        // Force file dates to keep modified headers from affecting package MD5 hashes
        zip.file(path.basename(filename), fs.readFileSync(filename, 'binary'), {
          binary: true,
          date: new Date('1970-01-01'),
        });
      });

      // Add package data
      const packageData = [];
      zip.generateNodeStream({ compression: 'DEFLATE', streamFiles: true })
        .on('data', (chunkData) => { packageData.push(chunkData); })
        .on('error', err => done(err))
        .on('end', () => {
          const content = Buffer.concat(packageData);
          returnData.source.package = {
            md5: md5(content),
            buffer: content,
          };
          done(null, returnData);
        });
    },

    // Get remote file checksum
    (data, done) => {
      const returnData = data;
      const params = {
        Bucket: argvParsed.targetBucket,
        Key: argvParsed.targetKey,
      };
      s3.getObject(params, (err, response) => {
        if (err && err.statusCode !== 404) { return done(err); } // We dont care about 404 errors
        returnData.target.package = {
          md5: response && response.ETag.replace(/"/g, ''), // Remove extra quotes ('"abc123"')
        };
        return done(null, returnData);
      });
    },

    // Upload to S3
    (data, done) => {
      const returnData = data;
      if (data.source.package.md5 === data.target.package.md5) {
        returnData.status.uploaded = false;
        returnData.status.message = 'Matching package already exist.';
        return done(null, returnData);
      }

      // Source package differs from target package, upload it
      const params = {
        Bucket: argvParsed.targetBucket,
        Key: argvParsed.targetKey,
        Body: data.source.package.buffer,
      };
      return s3.upload(params, (err, response) => {
        if (err) { return done(err); }
        returnData.target.package.location = response.Location;
        returnData.status.uploaded = true;
        return done(null, returnData);
      });
    },
  ], callback);
};


module.exports = packageAndUpload;
