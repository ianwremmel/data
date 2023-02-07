import type {DispatcherConfig, HandlerConfig} from './parser';

export const defaultDispatcherConfig: DispatcherConfig = {
  alarmActions: [],
  coldstartLatencyAlarm: 500,
  latencyP99Alarm: 1000,
  maxIteratorAgeAlarm: 30,
  memorySize: 384,
  memoryUtilizationAlarm: 80,
  okActions: [],
  timeout: 60,
};

export const defaultHandlerConfig: HandlerConfig = {
  alarmActions: [],
  coldstartLatencyAlarm: 500,
  latencyP99Alarm: 1000,
  memorySize: 256,
  memoryUtilizationAlarm: 80,
  okActions: [],
  timeout: 30,
};
