import assert from 'assert';

/** Jest Global Setup Function */
export default function credentials() {
  process.env.TEST_MODE = process.env.TEST_MODE ?? 'localstack';
  if (process.env.TEST_MODE === 'localstack') {
    // Set fake credentials for localstack
    process.env.AWS_ACCESS_KEY_ID = 'test';
    process.env.AWS_SECRET_ACCESS_KEY = 'test';
    process.env.AWS_ENDPOINT = 'http://127.0.0.1:4566';
    process.env.AWS_REGION = 'us-east-1';
  } else if (process.env.TEST_MODE === 'aws') {
    if (process.env.CI) {
      assert.fail('Testing on AWS in CI is not yet supported');
    } else {
      process.env.AWS_REGION = process.env.AWS_REGION ?? 'us-east-1';
      process.env.AWS_PROFILE =
        process.env.AWS_PROFILE ?? 'webstorm_playground';
      process.env.AWS_SDK_LOAD_CONFIG = process.env.AWS_SDK_LOAD_CONFIG ?? '1';
    }
  } else {
    assert.fail('TEST_MODE must be set to either "localstack" or "aws"');
  }
}
