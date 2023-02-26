import type {DispatcherConfig, HandlerConfig} from './parser';

export const defaultDispatcherConfig: DispatcherConfig = {
  memorySize: 384,
  timeout: 60,
};

export const defaultHandlerConfig: HandlerConfig = {
  memorySize: 256,
  /**
   * Needs to be large to 1. account for retries with exponential backoff and
   * 2. to because a single lambda invocation will handle multiple updates.
   */
  timeout: 90,
};
