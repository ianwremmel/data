import type {DispatcherConfig, HandlerConfig} from '../parser';

import type {CloudFormationFragment} from './types';

// I'm going to be lazy about this and hardcode it for now. If anyone else uses
// the library, I can think about making all these configurable if they ask for
// it. Alarms probably need to be rethought in a major version bump anyway.
const alarmDefaults = {
  ActionsEnabled: true,
  DatapointsToAlarm: 3,
  EvaluationPeriods: 5,
  Period: 60,
};

/** Generates a CloudWatch Alarm resources */
export function makeColdstartAlarm(
  functionName: string,
  threshold: number,
  alarmActions: readonly string[],
  okActions: readonly string[]
) {
  return {
    [`${functionName}ColdstartLatencyAlarm`]: {
      Condition: 'CreateChangeDataCaptureAlarmsCondition',
      Properties: {
        ...alarmDefaults,
        AlarmActions: alarmActions.map((action) => ({Ref: action})),
        AlarmDescription: `${functionName} Coldstart Latency > ${threshold}ms`,
        AlarmName: `${functionName} Coldstart Latency`,
        ComparisonOperator: 'GreaterThanThreshold',
        Dimensions: [
          {
            Name: 'function_name',
            Value: {Ref: functionName},
          },
        ],
        MetricName: 'init_duration',
        Namespace: 'LambdaInsights',
        OKActions: okActions.map((action) => ({Ref: action})),
        Statistic: 'Maximum',
        Threshold: threshold,
        TreatMissingData: 'notBreaching',
      },
      Type: 'AWS::CloudWatch::Alarm',
    },
  };
}

/** Generates a CloudWatch Alarm resources */
export function makeLatencyP99Alarm(
  functionName: string,
  threshold: number,
  alarmActions: readonly string[],
  okActions: readonly string[]
) {
  return {
    [`${functionName}LambdaP99Alarm`]: {
      Condition: 'CreateChangeDataCaptureAlarmsCondition',
      Properties: {
        ...alarmDefaults,
        AlarmActions: alarmActions.map((action) => ({Ref: action})),
        AlarmDescription: `${functionName} P99 Latency > ${threshold}ms`,
        AlarmName: `${functionName} Lambda Latency (P99)`,
        ComparisonOperator: 'GreaterThanThreshold',
        Dimensions: [
          {
            Name: 'FunctionName',
            Value: {Ref: functionName},
          },
        ],
        ExtendedStatistic: 'p99',
        MetricName: 'Duration',
        Namespace: 'AWS/Lambda',
        OKActions: okActions.map((action) => ({Ref: action})),
        Threshold: threshold,
        TreatMissingData: 'notBreaching',
        Unit: 'Milliseconds',
      },
      Type: 'AWS::CloudWatch::Alarm',
    },
  };
}

/** Generates a CloudWatch Alarm resources */
export function makeMaxIteratorAgeAlarm(
  functionName: string,
  threshold: number,
  alarmActions: readonly string[],
  okActions: readonly string[]
) {
  return {
    [`${functionName}MaxIteratorAgeAlarm`]: {
      Condition: 'CreateChangeDataCaptureAlarmsCondition',
      Properties: {
        ...alarmDefaults,
        AlarmActions: alarmActions.map((action) => ({Ref: action})),
        AlarmDescription: `${functionName} Max Iterator Age > ${threshold}ms`,
        AlarmName: `${functionName} Max Iterator Age`,
        ComparisonOperator: 'GreaterThanThreshold',
        Dimensions: [
          {
            Name: 'FunctionName',
            Value: {Ref: functionName},
          },
        ],
        MetricName: 'IteratorAge',
        Namespace: 'AWS/Lambda',
        OKActions: okActions.map((action) => ({Ref: action})),
        Statistic: 'Average',
        Threshold: threshold,
        TreatMissingData: 'notBreaching',
        Unit: 'Seconds',
      },
      Type: 'AWS::CloudWatch::Alarm',
    },
  };
}

/** Generates a CloudWatch Alarm resources */
export function makeDLQAlarm(
  queueName: string,
  alarmActions: readonly string[],
  okActions: readonly string[]
) {
  return {
    [`${queueName}DLQAlarm`]: {
      Condition: 'CreateChangeDataCaptureAlarmsCondition',
      Properties: {
        ...alarmDefaults,
        AlarmActions: alarmActions.map((action) => ({Ref: action})),
        AlarmDescription: `${queueName} DLQ has messages`,
        AlarmName: `${queueName} DLQ`,
        ComparisonOperator: 'GreaterThanThreshold',
        DatapointsToAlarm: 1,
        Dimensions: [
          {
            Name: 'QueueName',
            Value: {'Fn::GetAtt': [queueName, 'QueueName']},
          },
        ],
        EvaluationPeriods: 1,
        MetricName: 'ApproximateNumberOfMessagesVisible',
        Namespace: 'AWS/SQS',
        OKActions: okActions.map((action) => ({Ref: action})),
        Period: 60,
        Statistic: 'Sum',
        Threshold: 0,
        TreatMissingData: 'notBreaching',
      },
      Type: 'AWS::CloudWatch::Alarm',
    },
  };
}

/** Generates a CloudWatch Alarm resources */
export function makeMemoryUtilizationAlarm(
  functionName: string,
  threshold: number,
  alarmActions: readonly string[],
  okActions: readonly string[]
) {
  return {
    [`${functionName}MemoryUsageAlarm`]: {
      Condition: 'CreateChangeDataCaptureAlarmsCondition',
      Properties: {
        ...alarmDefaults,
        AlarmActions: alarmActions.map((action) => ({Ref: action})),
        AlarmDescription: `${functionName} Memory Usage > ${threshold}%`,
        AlarmName: `${functionName} Memory Usage`,
        ComparisonOperator: 'GreaterThanThreshold',
        Dimensions: [
          {
            Name: 'function_name',
            Value: {Ref: functionName},
          },
        ],
        MetricName: 'memory_utilization',
        Namespace: 'LambdaInsights',
        OKActions: okActions.map((action) => ({Ref: action})),
        Statistic: 'Maximum',
        Threshold: threshold,
        TreatMissingData: 'notBreaching',
      },
      Type: 'AWS::CloudWatch::Alarm',
    },
  };
}

const fragment = {
  conditions: {
    CreateChangeDataCaptureAlarmsCondition: {
      'Fn::Equals': [{Ref: 'CreateChangeDataCaptureAlarms'}, 'true'],
    },
  },
  parameters: {
    CreateChangeDataCaptureAlarms: {
      AllowedValues: ['true', 'false'],
      Default: 'true',
      Description: 'Controls whether or not CloudWatch alarms are deployed',
      Type: 'String',
    },
  },
};

/** Generates CloudWatch Alarm resources for a table dispatcher */
export function makeDispatcherAlarms(
  functionName: string,
  config: DispatcherConfig
): CloudFormationFragment {
  return {
    ...fragment,
    resources: {
      ...makeColdstartAlarm(
        functionName,
        config.coldstartLatencyAlarm,
        config.alarmActions,
        config.okActions
      ),
      ...makeLatencyP99Alarm(
        functionName,
        config.latencyP99Alarm,
        config.alarmActions,
        config.okActions
      ),
      ...makeMaxIteratorAgeAlarm(
        functionName,
        config.maxIteratorAgeAlarm,
        config.alarmActions,
        config.okActions
      ),
      ...makeMemoryUtilizationAlarm(
        functionName,
        config.memoryUtilizationAlarm,
        config.alarmActions,
        config.okActions
      ),
    },
  };
}

/** Generates CloudWatch Alarm resources for a model handler */
export function makeHandlerAlarms(
  functionName: string,
  config: HandlerConfig
): CloudFormationFragment {
  return {
    ...fragment,
    resources: {
      ...makeColdstartAlarm(
        functionName,
        config.coldstartLatencyAlarm,
        config.alarmActions,
        config.okActions
      ),
      ...makeDLQAlarm(
        `${functionName}DLQ`,
        config.alarmActions,
        config.okActions
      ),
      ...makeDLQAlarm(
        `${functionName}EventBridgeDLQ`,
        config.alarmActions,
        config.okActions
      ),
      ...makeLatencyP99Alarm(
        functionName,
        config.latencyP99Alarm,
        config.alarmActions,
        config.okActions
      ),
      ...makeMemoryUtilizationAlarm(
        functionName,
        config.memoryUtilizationAlarm,
        config.alarmActions,
        config.okActions
      ),
    },
  };
}
