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
  argv.sourceFiles = argv.sourceFiles || argv.source; // source became sourceFiles

  // Configure AWS client
  AWS.config = {
    region: 'eu-west-1',
    accessKeyId: argv.awsKey, // Either defined here, in env variables or by aws cli
    secretAccessKey: argv.awsSecret, // Either defined here, in env variables or by aws cli
    apiVersion: '2017-01-01'
  };
  var s3 = new AWS.S3();


  async.waterfall([

    // Make sure we have everything + set data object
    (done) => {
      if (!argv.sourceFiles) {
        return done(new Error('--source-files is a required parameter'));
      }
      if (!argv.targetBucket) {
        return done(new Error('--target-bucket is a required parameter'));
      }
      if (!argv.targetKey) {
        return done(new Error('--target-key is a required parameter'));
      }
      done(null, {
        source: {},
        target: {},
        status: {}
      }); 
    },

    // Get source files
    (data, done) => {
      glob(argv.sourceFiles, {nodir: true}, (err, files) => {
        if (err) { return done(err); }
        
        // Do sanity checks
        if (files.length === 0) {
          return done(new Error(`No source files found. ("argv.sourceFiles")`));
        }
        if (files.length > 50) {
          return done(
            new Error(`Too many source files ("${files.length}"), probably errennous source pattern.`)
          );
        }
        data.source.files = files;
        done(err, data);
      });
    },

    // Create release package
    (data, done) =>  {
      const package = new JSZip();
      data.source.files.forEach((filename) => {

        // Force file dates to keep modified headers from affecting package MD5 hashes
        package.file(path.basename(filename), fs.readFileSync(filename, 'binary'), {
          binary: true,
          date: new Date('1970-01-01')
        });
      });

      // Add package data
      var packageData = [];
      package.generateNodeStream({compression: 'DEFLATE', streamFiles: true})
        .on('data', (data) => { packageData.push(data); })
        .on('error', (err) => { return done(err); })
        .on('end', () => {
          var content = Buffer.concat(packageData);
          data.source.package = {
            md5: md5(content),
            buffer: content
          };
          done(null, data);
        });
    },

    // Get remote file checksum
    (data, done) => {
      let params = {
        Bucket: argv.targetBucket,
        Key: argv.targetKey
      };
      s3.getObject(params, (err, response) => {
        if (err && err.statusCode === 404) { err = null; } // We dont care about 404 errors
        data.target.package = {
          md5: response && response.ETag.replace(/"/g, '') // Remove extra quotes ('"abc123"')
        };
        done(err, data);
      });
    },

    // Upload to S3
    (data, done) => {
      if (data.source.package.md5 === data.target.package.md5) {
        data.status.uploaded = false;
        data.status.message = 'Matching package already exist.';
        return done(null, data);
      }

      // Source package differs from target package, upload it
      let params = {
        Bucket: argv.targetBucket,
        Key: argv.targetKey,
        Body: data.source.package.buffer
      };
      s3.upload(params, (err, response) => {
        if (err) { return done(err); }
        data.target.package.location = response.Location;
        data.status.uploaded = true;
        done(null, data);
      });
    }
  ], callback);
};


module.exports = packageAndUpload;
