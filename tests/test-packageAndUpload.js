const assert = require('assert');
const AWS = require('aws-sdk-mock');

const lib = require('../libs/packageAndUpload');


describe('main library', () => {
  before(() => {
    AWS.mock('S3', 'upload', (params, callback) => {
      callback(null, {
        Location: `http://s3.amazonaws.com/${params.Bucket}/${params.Key}`,
        Key: params.Key,
      });
    });
  });


  it('should throw error when called without "sourceFiles" option', (done) => {
    const opts = {};
    lib(opts, (err) => {
      assert(err);
      done();
    });
  });

  it('should throw error when called without "targetBucket" option', (done) => {
    const opts = {
      sourceFiles: 'non-existent-directory/',
    };
    lib(opts, (err) => {
      assert(err);
      done();
    });
  });

  it('should throw error when called without "targetKey" option', (done) => {
    const opts = {
      sourceFiles: 'non-existent-directory/',
      targetBucket: 'somethingsomething',
    };
    lib(opts, (err) => {
      assert(err);
      done();
    });
  });


  describe('package upload', () => {
    let md5checksum;

    afterEach(() => {
      AWS.restore('S3', 'getObject');
    });

    it('should upload new package when there is no pre-existing one', (done) => {
      AWS.mock('S3', 'getObject', (params, callback) => {
        callback(null, null);
      });

      const opts = {
        sourceFiles: `${__dirname}/files/static/**/*`,
        targetBucket: 'non-existing-bucket',
        targetKey: 'dummy-package.zip',
      };
      lib(opts, (err, data) => {
        assert(data);
        assert(data.status.uploaded);
        assert.equal(data.target.package.location, `http://s3.amazonaws.com/${opts.targetBucket}/${opts.targetKey}`);
        done();
      });
    });


    it('should upload new package when existing package has different checksum', (done) => {
      AWS.mock('S3', 'getObject', (params, callback) => {
        callback(null, {
          ETag: '"non-matching-md5-hash"', // S3 returns ETags with extra quotes
        });
      });

      const opts = {
        sourceFiles: `${__dirname}/files/static/**/*`,
        targetBucket: 'non-existing-bucket',
        targetKey: 'dummy-package.zip',
      };
      lib(opts, (err, data) => {
        assert(data);
        assert(data.status.uploaded);
        assert.equal(data.target.package.location, `http://s3.amazonaws.com/${opts.targetBucket}/${opts.targetKey}`);
        md5checksum = data.source.package.md5;
        done();
      });
    });


    it('should not upload the package when existing package has same checksum', (done) => {
      AWS.mock('S3', 'getObject', (params, callback) => {
        callback(null, {
          ETag: `"${md5checksum}"`, // S3 returns ETags with extra quotes
        });
      });

      const opts = {
        sourceFiles: `${__dirname}/files/static/**/*`,
        targetBucket: 'non-existing-bucket',
        targetKey: 'dummy-package.zip',
      };
      lib(opts, (err, data) => {
        assert(data);
        assert(!data.status.uploaded);
        done();
      });
    });
  });
});
