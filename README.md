# codepipeline-s3-package

Provides ability to do AWS S3 source package updates for AWS CodePipeline.

Whever triggered:
1. It creates new release package (.zip) from the source files
2. Checks if the package MD5 checksum differs from the target package
3. If checksum is different, it uploads new package
4. This will in turn trigger any AWS CodePipelines monitoring that target package


## Install

```sh
$ npm install codepipeline-s3-package --save
```


## Requirements

For accessing the S3 bucket, the package requires eitehr `aws-cli` installed and configured or
`AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` environment variables containing the AWS access and
secret keys.


## Usage in package.json

```json
{
  "scripts": "codepipeline-s3-package --source-files=cloudformation/* --target-bucket=my-cloudformation-bucket --target-key=my-pipelines-source.zip"
}
```

### Arguments

`--source-files` - glob pattern for source files

`--target-bucket` - AWS S3 bucket name

`--target-key` - AWS S3 file key for the target package
