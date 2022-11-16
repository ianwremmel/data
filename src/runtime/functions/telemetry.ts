import type {Context} from 'aws-lambda';

let cold = true;

/** Generates common OpenTelemetry attributes for AWS Lambda functions */
export function makeLambdaOTelAttributes(context: Context) {
  const wasCold = cold;
  cold = false;

  return {
    'aws.lambda.invoked_arn': context.invokedFunctionArn,
    'cloud.account.id': context.invokedFunctionArn.split(':')[5],
    'faas.coldstart': wasCold,
    'faas.execution': context.awsRequestId,
    'faas.id': `${context.invokedFunctionArn
      .split(':')
      .slice(0, 7)
      .join(':')}:${context.functionVersion}`,
  };
}
