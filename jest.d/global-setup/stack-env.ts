import assert from 'assert';

import {
  CloudFormationClient,
  DescribeStacksCommand,
} from '@aws-sdk/client-cloudformation';
import type {Stack} from '@aws-sdk/client-cloudformation/dist-types/models/models_0';
import {glob} from 'glob';
import {camelCase, snakeCase, upperFirst} from 'lodash';

/* eslint-disable complexity */
/**
 * Loads stack outputs as environment variables
 */
export default async function loadAwsEnv() {
  if (process.env.TEST_MODE === 'localstack') {
    // Set fake credentials for localstack
    process.env.AWS_ACCESS_KEY_ID = 'test';
    process.env.AWS_SECRET_ACCESS_KEY = 'test';
    process.env.AWS_ENDPOINT = 'http://localhost:4566';
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

  const client = process.env.AWS_ENDPOINT
    ? new CloudFormationClient({
        endpoint: process.env.AWS_ENDPOINT,
      })
    : new CloudFormationClient({});

  console.log(`Fetching stack details from "${process.env.TEST_MODE}"`);
  const stackData = await client.send(new DescribeStacksCommand({}));
  console.log(`Fetched stack details from "${process.env.TEST_MODE}"`);

  assert(
    stackData.Stacks,
    `"${process.env.TEST_MODE}" should have returned an array of stacks`
  );

  let exampleStacks = glob
    .sync('*/', {cwd: './examples'})
    .map((dir) => upperFirst(camelCase(dir)));

  if (process.env.TEST_MODE === 'localstack') {
    exampleStacks = exampleStacks.filter(
      (stack) => stack !== 'ChangeDataCapture'
    );
  }

  for (const stackName of exampleStacks) {
    const stack: Stack | undefined = stackData.Stacks.find(
      (s) => s.StackName === stackName
    );
    assert(stack, `There should be a stack named ${stackName}`);
    assert(
      stack.Outputs,
      `"${process.env.TEST_MODE}" should have returned stack outputs`
    );

    for (const output of stack.Outputs) {
      const name = snakeCase(output.OutputKey).toUpperCase();
      assert(
        name,
        `"${process.env.TEST_MODE}" should have returned a parameter name`
      );
      const value = output.OutputValue;
      console.log(`Setting env ${name} to ${value} from stack`);
      process.env[name] = value;
    }
  }
}
/* eslint-enable complexity */
