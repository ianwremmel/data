/** cloudformation generator */
export function makeLogGroup(functionName: string) {
  return {
    [`${functionName}LogGroup`]: {
      Type: 'AWS::Logs::LogGroup',
      // eslint-disable-next-line sort-keys
      Properties: {
        LogGroupName: {'Fn::Sub': `/aws/lambda/\${${functionName}}`},
        RetentionInDays: {Ref: 'LogRetentionInDays'},
      },
    },
  };
}
