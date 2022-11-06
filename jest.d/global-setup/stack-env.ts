import assert from 'assert';

import {
  CloudFormationClient,
  DescribeStacksCommand,
} from '@aws-sdk/client-cloudformation';
import {snakeCase} from 'lodash';

/**
 * Loads stack outputs as environment variables
 */
export default async function loadAwsEnv() {
  // Set fake credentials for localstack
  process.env.AWS_ACCESS_KEY_ID = 'test';
  process.env.AWS_SECRET_ACCESS_KEY = 'test';

  const stackName = 'UserSession';

  // console.log('Fetching stack details from AWS');
  // const out = execSync('awslocal cloudformation describe-stacks').toString();
  // const stackData = JSON.parse(out);
  // console.log('Fetched stack details from AWS');
  // assert(stackData.Stacks, 'AWS should have returned an array of stacks');
  // assert(stackData.Stacks.length > 0, 'There should be more than zero stacks');
  // const stack = stackData.Stacks.find((s) => s.StackName === stackName);
  // assert(stack.Outputs, 'AWS should have returned stack outputs');
  // for (const output of stack.Outputs) {
  //   const name = snakeCase(output.OutputKey).toUpperCase();
  //   assert(name, 'AWS should have returned a parameter name');
  //   const value = output.OutputValue;
  //   console.log(`Setting env ${name} to ${value} from stack`);
  //   process.env[name] = value;
  // }

  const client = new CloudFormationClient({
    endpoint: process.env.ENDPOINT,
    region: process.env.REGION,
  });
  console.log('Fetching stack details from AWS');
  const stackData = await client.send(
    new DescribeStacksCommand({StackName: stackName})
  );
  console.log('Fetched stack details from AWS');
  assert(stackData.Stacks, 'AWS should have returned an array of stacks');
  assert(
    stackData.Stacks.length > 0,
    'There should be more than zero stacks named $stackName'
  );
  assert(
    stackData.Stacks.length < 2,
    'There should be less than two stacks named $stackName'
  );
  const [stack] = stackData.Stacks;
  assert(stack.Outputs, 'AWS should have returned stack outputs');
  for (const output of stack.Outputs) {
    const name = snakeCase(output.OutputKey).toUpperCase();
    assert(name, 'AWS should have returned a parameter name');
    const value = output.OutputValue;
    console.log(`Setting env ${name} to ${value} from stack`);
    process.env[name] = value;
  }
}
