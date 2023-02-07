import assert from 'assert';

import type {ConstArgumentNode} from 'graphql';
import type {ConstDirectiveNode} from 'graphql/index';

import {getOptionalArg} from '../helpers';
import type {DispatcherConfig, HandlerConfig, LambdaConfig} from '../types';

/** helper */
function getDefaultLambdaConfig<CONFIG extends LambdaConfig>(
  config: CONFIG
): LambdaConfig {
  return {
    alarmActions: config.alarmActions,
    coldstartLatencyAlarm: config.coldstartLatencyAlarm,
    latencyP99Alarm: config.latencyP99Alarm,
    memorySize: config.memorySize,
    memoryUtilizationAlarm: config.memoryUtilizationAlarm,
    okActions: config.okActions,
    timeout: config.timeout,
  };
}

/** Extracts common lambda config from a directive argument */
export function extractLambdaConfig<CONFIG extends LambdaConfig>(
  config: CONFIG,
  arg: ConstArgumentNode
): LambdaConfig {
  assert(arg.value.kind === 'ObjectValue');
  const field = arg.value.fields.find((f) => f.name.value === 'lambdaConfig');
  if (!field) {
    return getDefaultLambdaConfig(config);
  }

  assert(field.value.kind === 'ObjectValue');
  const values = field.value.fields
    .filter((f) => f.value.kind !== 'ObjectValue')
    .map((f) => {
      assert(f.value.kind !== 'ObjectValue');
      assert(f.value.kind === 'IntValue');
      return f.value.value;
    });

  return {
    ...getDefaultLambdaConfig(config),
    ...values,
  };
}

/** helper */
export function extractDispatcherConfig<
  CONFIG extends {defaultDispatcherConfig: DispatcherConfig}
>(config: CONFIG, directive: ConstDirectiveNode): DispatcherConfig {
  const arg = getOptionalArg('dispatcherConfig', directive);
  if (!arg) {
    return {
      ...getDefaultLambdaConfig(config.defaultDispatcherConfig),
      maxIteratorAgeAlarm: config.defaultDispatcherConfig.maxIteratorAgeAlarm,
    };
  }

  assert(arg.value.kind === 'ObjectValue');
  arg.value.fields.find((f) => f.name.value === 'lambdaConfig');
  return {
    ...extractLambdaConfig(config.defaultDispatcherConfig, arg),
    maxIteratorAgeAlarm: config.defaultDispatcherConfig.maxIteratorAgeAlarm,
  };
}

/** helper */
export function extractHandlerConfig<
  CONFIG extends {defaultHandlerConfig: HandlerConfig}
>(config: CONFIG, directive: ConstDirectiveNode): HandlerConfig {
  const arg = getOptionalArg('handlerConfig', directive);
  if (!arg) {
    return getDefaultLambdaConfig(config.defaultHandlerConfig);
  }

  assert(arg.value.kind === 'ObjectValue');
  return extractLambdaConfig(config.defaultHandlerConfig, arg);
}
