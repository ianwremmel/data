import assert from 'assert';
import path from 'path';

import {
  CloudFormationClient,
  DescribeStacksCommand,
} from '@aws-sdk/client-cloudformation';
import {camelCase, snakeCase, upperFirst} from 'lodash';

/** Gets the stack name for the current test based on its filename. */
function getCurrentStackName(): string {
  const {testPath} = expect.getState();
  assert(testPath, 'testPath should be defined');
  const segments = testPath.split(path.sep);
  const example =
    segments[segments.findIndex((segment) => segment === 'examples') + 1];
  return upperFirst(camelCase(example));
}
/**
 * Fetches the stack outputs and sets them as environment variables for the
 * current test's stack.
 */
async function loadEnvForStack(): Promise<void> {
  const stackName = getCurrentStackName();

  const client = process.env.AWS_ENDPOINT
    ? new CloudFormationClient({
        endpoint: process.env.AWS_ENDPOINT,
      })
    : new CloudFormationClient({});

  const stackData = await client.send(
    new DescribeStacksCommand({
      StackName: stackName,
    })
  );

  const stack = stackData.Stacks?.find((s) => s.StackName === stackName);
  assert(
    stack,
    `"${process.env.TEST_MODE}" should have returned a stack named "${stackName}"`
  );
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
    // assert(!(name in process.env), `Env ${name} already set`);
    process.env[name] = value;
  }
}

beforeAll(() => loadEnvForStack());
