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
        Default: 3,
        Description: 'Log retention in days',
        Type: 'Number',
      },
    },
    resources: {
      [`${functionName}LogGroup`]: {
        Properties: {
          LogGroupName: {'Fn::Sub': `/aws/lambda/\${${functionName}}`},
          RetentionInDays: {Ref: 'LogRetentionInDays'},
        },
        Type: 'AWS::Logs::LogGroup',
      },
    },
  };
}
