import type {DispatcherConfig, HandlerConfig} from './parser';

export const defaultDispatcherConfig: DispatcherConfig = {
  memorySize: 384,
  timeout: 60,
};

export const defaultHandlerConfig: HandlerConfig = {
  memorySize: 256,
  timeout: 30,
};
