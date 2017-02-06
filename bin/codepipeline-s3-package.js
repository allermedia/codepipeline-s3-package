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
  .option('-S, --source <pattern>', 'pattern for source files')
  .option('-B, --target-bucket <S3 bucket name>', 'target S3 bucket name')
  .option('-K, --target-key <S3 file key>', 'target S3 file key')
  .parse(process.argv);


console.log('');
console.log('Creating release package...');

packageAndUpload(program, (err, data) => {
  if (err) { return console.log('ERROR: ', err.message); }

  // If we didn't upload, let them know why
  if (!data.status.uploaded) {
    return console.log(data.status.message);
  }

  // Show the contents and location of the package
  data.source.files.forEach((filename) => {
    console.log(`  added "${filename}"`);
  });
  console.log(`New package uploaded. (${data.target.package.location})`);
});
