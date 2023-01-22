import type {EventBridgeClient} from '@aws-sdk/client-eventbridge';
import type {SpanKind} from '@opentelemetry/api';

export interface WithTableName {
  tableName: string;
}

export interface WithEventBridge {
  eventBridge: EventBridgeClient;
}

export interface WithTelemetry {
  captureException(error: unknown): void;
  captureAsyncFunction<R>(
    name: string,
    attributes: Record<string, boolean | number | string | undefined>,
    kind: SpanKind,
    fn: () => Promise<R>
  ): Promise<R>;
}
