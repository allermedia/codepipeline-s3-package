#codepipeline-s3-package

Provides ability to do AWS S3 source updates for AWS Codepipeline


## Install

```sh
$ npm install codepipeline-s3-package --save
```


## Requirements

Currently the package requires `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` environment
variables that contain the AWS access and secret keys. This is because the package is
currently targeted for Docker deployments.


## Usage in package.json

```json
{
  "scripts": "codepipeline-s3-package --source=cloudformation/* --target-bucket=my-cloudformation-bucket --target-key=my-pipelines-source.zip"
}
```
