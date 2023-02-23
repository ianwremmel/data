import type {EventBridgeClient} from '@aws-sdk/client-eventbridge';

export interface WithTableName {
  tableName: string;
}

export interface WithEventBridge {
  eventBridge: EventBridgeClient;
}

export interface WithTelemetry {
  /**
   * This is probably just a wrapper around `captureException` from
   * `@code-like-a-carpenter/telemetry`, but by making it an injectable instead
   * of importing it directly, you have the opportunity to use additional code,
   * for example, you might also want to ship the error to Sentry.
   * @param error
   * @param escaped - indicates if the error was not caught and handled
   */
  captureException(error: unknown, escaped?: boolean): void;

  /**
   * Wraps a root function in all the necessary initialization logic relevant to
   * your Telemetry system.
   */
  captureAsyncRootFunction<E, C, R>(
    fn: (e: E, c: C) => Promise<R>
  ): (e: E, c: C) => Promise<R>;
}
