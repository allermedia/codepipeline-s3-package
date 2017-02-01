/**
 * The actual package and upload 
 */
const fs = require('fs');
const path = require('path');
const async = require('async');
const glob = require('glob');
const AWS = require('aws-sdk');
const jszip = require('jszip');
const md5file = require('md5-file');


const packageAndUpload = function workFunction(argv) {

  // Configure AWS client (before message handler is loaded)
  AWS.config = {
    region: 'eu-west-1',
    //accessKeyId: '',
    //secretAccessKey: '',
    apiVersion: '2017-01-01'
  };
  var s3 = new AWS.S3();


  async.waterfall([

    // Make sure we have everything
    (done) => {
      console.log(''); // Add empty row to make results cleaner
      if(!argv.source) { return done(new Error('--source is a required parameter')); }
      if(!argv.targetBucket) { return done(new Error('--target-bucket is a required parameter')); }
      if(!argv.targetKey) { return done(new Error('--target-key is a required parameter')); }
      done(null, {}); // Add data object to waterfall
    },

    // Get source files
    (data, done) => {
      glob(argv.source, (err, files) => {
        
        // Do sanity check so that we dont accidentally gather everything
        if(files.length > 50) {
          return done(new Error(`Too many source files (${files.length}), probably errennous source pattern.`));
        }
        data.files = files;
        done(err, data);
      });
    },

    // Create release package
    (data, done) =>  {
      const package = new jszip();
      console.log('Creating release package...');
      data.files.forEach((filename) => {
        console.log(`  adding "${filename}"`);

        // Set file dates to something else to keep date affecting MD5 hashes
        package.file(path.basename(filename), fs.readFileSync(filename, 'binary'), {binary: true, date: new Date('1970-01-01')});
      });

      // Create the zip file
      var packageData = [];
      package.generateNodeStream({compression: 'DEFLATE', streamFiles: true})
        .on('data', (data) => { packageData.push(data); })
        .on('error', (err) => { return done(err); })
        .on('end', () => {
          var content = Buffer.concat(packageData);
          data.localFilename = './source.zip';
          fs.writeFileSync(data.localFilename, content);
          done(null, data);
        });
    },

    // Get local file hash
    (data, done) =>  {
      md5file(data.localFilename, (err, hash) => {
        data.localHash = hash;
        done(err, data);
      });
    },

    // Get remote file hash
    (data, done) => {
      let params = {
        Bucket: argv.targetBucket,
        Key: argv.targetKey
      };
      s3.getObject(params, (err, response) => {
        if(err && err.statusCode === 404) { err = null; } // We dont care about 404 errors
        data.remoteHash = response && response.ETag.replace(/"/g, ''); // Remove extra quotes ('"asdasdasd"')
        done(err, data);
      });
    },

    // Upload to S3
    (data, done) => {
      if(data.localHash === data.remoteHash) {
        console.log('Matching package already exists.')
        return done(null, data);
      }

      // File differs from remote, upload new
      let params = {
        Bucket: argv.targetBucket,
        Key: argv.targetKey,
        Body: fs.readFileSync(data.localFilename)
      };
      s3.upload(params, (err, response) => {
        if(err) { return done(err); }
        console.log(`New package uploaded. (${data.localFilename} -> ${response.Location})`);
        done(null, data);
      });
    }
  ], (err, data) => {
    if(err) { console.log('ERROR:', err.message); }

    console.log(''); // Add empty row to make results cleaner 
  });
};


module.exports = packageAndUpload;
