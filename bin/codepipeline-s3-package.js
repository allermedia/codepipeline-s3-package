#!/usr/bin/env node
/**
 * Commandline accesspoint for the module
 *
 */
const program = require('commander');
const pckg = require('../package.json');
const packageAndUpload = require('../libs/packageAndUpload');

program
  .version(pckg.version)
  .description('Generate and upload S3 source package for AWS CodePipeline')
  .option('-S, --source-files <pattern>', 'pattern for source files')
  .option('-B, --target-bucket <S3 bucket name>', 'target S3 bucket name')
  .option('-K, --target-key <S3 file key>', 'target S3 file key')
  .option('-F, --flatten', 'flatten package directory structure')
  .parse(process.argv);


packageAndUpload(program, (err, data) => {
  if (err) {
    console.log('ERROR: ', err.message);
    process.exit(1);
    return;
  }

  // If we didn't upload, let them know why
  if (!data.status.uploaded) {
    console.log(data.status.message);
    return;
  }

  // Show the contents and location of the package
  data.source.files.forEach((filename) => {
    console.log(`  added "${filename}"`);
  });
  console.log(`New package uploaded. (${data.target.package.location})`);
});
