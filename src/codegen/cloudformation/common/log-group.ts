/** cloudformation generator */
import type {CloudFormationFragment} from '../types';

/** cloudformation generator */
export function makeLogGroup(functionName: string): CloudFormationFragment {
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
