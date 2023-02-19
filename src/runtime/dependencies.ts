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

  /**
   * Wraps the function in a Span of some kind (XRay, OpenTelemetry, Sentry, etc)
   * @param name
   * @param attributes
   * @param kind
   * @param fn
   */
  captureAsyncFunction<R>(
    name: string,
    attributes: Record<string, boolean | number | string | undefined>,
    kind: SpanKind,
    fn: () => Promise<R>
  ): Promise<R>;

  /**
   * Wraps a root function in all the necessary initialization logic relevant to
   * your Telemetry system. In most cases, this probably _should not_ start a
   * new span, since that'll be handled by a separate call to
   * `captureAsyncFunction`
   */
  captureAsyncRootFunction<E, C, R>(
    fn: (e: E, c: C) => Promise<R>
  ): (e: E, c: C) => Promise<R>;
}
