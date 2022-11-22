/** cloudformation generator */
import type {CloudFormationFragment} from '../types';

export interface LogGroupInput {
  functionName: string;
}

/** cloudformation generator */
export function makeLogGroup({
  functionName,
}: LogGroupInput): CloudFormationFragment {
  return {
    parameters: {
      LogRetentionInDays: {
        Type: 'Number',
        // eslint-disable-next-line sort-keys
        Description: 'Log retention in days',
        // eslint-disable-next-line sort-keys
        Default: 3,
      },
    },
    resources: {
      [`${functionName}LogGroup`]: {
        Type: 'AWS::Logs::LogGroup',
        // eslint-disable-next-line sort-keys
        Properties: {
          LogGroupName: {'Fn::Sub': `/aws/lambda/\${${functionName}}`},
          RetentionInDays: {Ref: 'LogRetentionInDays'},
        },
      },
    },
  };
}
