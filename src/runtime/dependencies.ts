import type {EventBridgeClient} from '@aws-sdk/client-eventbridge';

export interface WithTableName {
  tableName: string;
}

export interface WithModelName {
  modelName: string;
}

export interface WithEventBridge {
  eventBridge: EventBridgeClient;
}

export interface WithTelemetry {
  captureException(error: unknown): void;
  captureAsyncFunction<R>(
    name: string,
    attributes: Record<string, boolean | number | string | undefined>,
    fn: () => Promise<R>
  ): Promise<R>;
}
