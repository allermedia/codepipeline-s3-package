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

packageAndUpload(program);
